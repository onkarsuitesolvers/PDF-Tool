/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  PDC — Shared Query Filter Builder
 *  Centralises the date / customer / subsidiary filter logic used by
 *  serveInvoiceList, serveCreditMemoList, and serveInvoiceGroupList.
 * ─────────────────────────────────────────────────────────────────────────────
 */
define(['N/log', 'N/runtime'], (log, runtime) => {

  const MAX_RESULTS   = 4000;   // hard cap — prevents governance exhaustion
  const DEFAULT_PAGE  = 1000;   // rows per runSuiteQL call (max 5000)
  const GOV_THRESHOLD = 500;    // stop pagination when remaining units drop below this

  /**
   * Parse a comma-separated parameter into an array of positive integers.
   * @param {string} raw  e.g. "42, 99, 7"
   * @returns {number[]}
   */
  const parseIdList = (raw) => {
    if (!raw) return [];
    return raw.split(',').map(x => parseInt(x.trim(), 10)).filter(Boolean);
  };

  /**
   * Append an IN / = condition for a numeric list.
   * @param {string[]} conditions  — mutated in place
   * @param {Array}    params      — mutated in place
   * @param {string}   column      — e.g. 't.entity'
   * @param {number[]} ids
   */
  const pushIdFilter = (conditions, params, column, ids) => {
    // Inline numeric IDs as literals — already validated as integers by parseIdList
    if (ids.length === 1) {
      conditions.push(`${column} = ${ids[0]}`);
    } else if (ids.length > 1) {
      conditions.push(`${column} IN (${ids.join(',')})`);
    }
  };

  /**
   * Build common date / customer / subsidiary filter conditions.
   *
   * @param {Object}  p                request.parameters
   * @param {Object}  opts
   * @param {string}  opts.dateCol     Column for trandate   (default 't.trandate')
   * @param {string}  opts.customerCol Column for entity/cust (default 't.entity')
   * @param {string}  opts.subsidiaryCol Column for subsidiary (default 't.subsidiary', pass null to skip)
   * @param {string}  opts.tranIdCol   Column for tranid (default 't.tranid')
   * @returns {{ conditions: string[], params: any[] }}
   */
  const buildCommonFilters = (p, opts = {}) => {
    const dateCol       = opts.dateCol       || 't.trandate';
    const customerCol   = opts.customerCol   || 't.entity';
    const subsidiaryCol = opts.subsidiaryCol !== undefined ? opts.subsidiaryCol : 't.subsidiary';
    const tranIdCol     = opts.tranIdCol     || 't.tranid';

    const conditions = [];
    const params     = [];

    // Date range — inlined as literals because SuiteQL bind params
    // with TO_DATE can return 0 rows even when the same literal query succeeds
    if (p.dateFrom) {
      const df = validateDateLiteral(p.dateFrom);
      conditions.push(`${dateCol} >= TO_DATE('${df}', 'YYYY-MM-DD')`);
    }
    if (p.dateTo) {
      const dt = validateDateLiteral(p.dateTo);
      conditions.push(`${dateCol} <= TO_DATE('${dt}', 'YYYY-MM-DD')`);
    }

    // Tran ID filter (exact or LIKE match) — inlined as literal
    if (p.tranId && p.tranId.trim()) {
      const tid = p.tranId.trim().replace(/'/g, "''");
      conditions.push(`${tranIdCol} LIKE '%${tid}%'`);
    }

    // Customer
    const custIds = parseIdList(p.customer);
    if (custIds.length) pushIdFilter(conditions, params, customerCol, custIds);

    // Subsidiary (optional — InvoiceGroup doesn't support it)
    if (subsidiaryCol) {
      const subIds = parseIdList(p.subsidiary);
      if (subIds.length) pushIdFilter(conditions, params, subsidiaryCol, subIds);
    }

    log.debug({ title: 'PDC queryHelper.buildCommonFilters', details: 'dateFrom=' + (p.dateFrom || '') + ' dateTo=' + (p.dateTo || '') + ' customer=' + (p.customer || '') + ' subsidiary=' + (p.subsidiary || '') + ' tranId=' + (p.tranId || '') + ' | built ' + conditions.length + ' conditions' });

    return { conditions, params };
  };

  /**
   * Iterate all pages of a SuiteQL paged result set and collect mapped rows.
   *
   * @param {Object} pagedResult  from query.runSuiteQLPaged()
   * @param {Function} mapFn      (row: Object) => mapped object
   * @returns {Object[]}
   */
  const collectPagedResults = (pagedResult, mapFn) => {
    const results = [];
    pagedResult.iterator().each((page) => {
      page.value.data.asMappedResults().forEach((row) => {
        results.push(mapFn(row));
      });
      return true;
    });
    return results;
  };

  /**
   * Run a SuiteQL query using runSuiteQL with manual OFFSET/FETCH pagination
   * to work around runSuiteQLPaged returning 0 rows.
   *
   * Fetches up to PAGE_SIZE rows at a time using SQL-level pagination,
   * repeating until a page returns fewer rows than requested.
   *
   * @param {Object}   queryModule  The N/query module reference
   * @param {string}   sql          Base SQL (WITHOUT OFFSET/FETCH — they are appended)
   * @param {any[]}    params       Bind parameters
   * @param {Function} mapFn        (row: Object) => mapped object  (receives asMappedResults rows)
   * @param {number}   [pageSize=5000]  Rows per page (max 5000 for runSuiteQL)
   * @returns {Object[]}
   */
  const runSuiteQLAll = (queryModule, sql, params, mapFn, pageSize) => {
    const PAGE = pageSize || DEFAULT_PAGE;
    const results = [];
    let offset = 0;
    let truncated = false;

    while (true) {
      const remaining = runtime.getCurrentScript().getRemainingUsage();
      if (remaining < GOV_THRESHOLD) {
        log.audit({ title: 'PDC runSuiteQLAll', details: 'Stopping — governance remaining: ' + remaining + ', rows so far: ' + results.length });
        truncated = true;
        break;
      }

      const pagedSql = sql + ` OFFSET ${offset} ROWS FETCH NEXT ${PAGE} ROWS ONLY`;
      const resultSet = queryModule.runSuiteQL({ query: pagedSql, params: params });
      const rows = resultSet.asMappedResults();

      rows.forEach((row) => results.push(mapFn(row)));

      if (rows.length < PAGE) break;
      offset += PAGE;

      if (results.length >= MAX_RESULTS) {
        log.audit({ title: 'PDC runSuiteQLAll', details: 'Max results cap reached: ' + results.length });
        truncated = true;
        break;
      }
    }

    return { results, truncated };
  };

  /**
   * Run a SuiteQL query with manual OFFSET/FETCH pagination, using
   * positional (non-mapped) row iteration for queries that need raw values.
   *
   * @param {Object}   queryModule  The N/query module reference
   * @param {string}   sql          Base SQL (WITHOUT OFFSET/FETCH)
   * @param {any[]}    params       Bind parameters
   * @param {Function} rowFn        (row) => void — receives each row from iterator
   * @param {number}   [pageSize=5000]
   */
  const runSuiteQLAllRaw = (queryModule, sql, params, rowFn, pageSize) => {
    const PAGE = pageSize || DEFAULT_PAGE;
    let offset = 0;
    let totalCount = 0;
    let truncated = false;

    while (true) {
      const remaining = runtime.getCurrentScript().getRemainingUsage();
      if (remaining < GOV_THRESHOLD) {
        log.audit({ title: 'PDC runSuiteQLAllRaw', details: 'Stopping — governance remaining: ' + remaining + ', rows so far: ' + totalCount });
        truncated = true;
        break;
      }

      const pagedSql = sql + ` OFFSET ${offset} ROWS FETCH NEXT ${PAGE} ROWS ONLY`;
      const resultSet = queryModule.runSuiteQL({ query: pagedSql, params: params });

      let count = 0;
      resultSet.iterator().each((row) => {
        rowFn(row);
        count++;
        return true;
      });

      totalCount += count;
      if (count < PAGE) break;
      offset += PAGE;

      if (totalCount >= MAX_RESULTS) {
        log.audit({ title: 'PDC runSuiteQLAllRaw', details: 'Max results cap reached: ' + totalCount });
        truncated = true;
        break;
      }
    }

    return { truncated };
  };

  /**
   * Write a JSON success / list response.
   */
  const writeJsonResponse = (response, payload) => {
    response.setHeader({ name: 'Content-Type', value: 'application/json' });
    response.write(JSON.stringify(payload));
  };

  /**
   * Validate and return a date string in YYYY-MM-DD format.
   * Throws if the value contains unexpected characters (prevents SQL injection).
   * @param {string} val  e.g. '2025-12-26'
   * @returns {string}
   */
  const validateDateLiteral = (val) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) throw new Error('Invalid date format: ' + val);
    return val;
  };

  /**
   * Normalize a status code by re-inserting the colon that NetSuite strips
   * from URL parameters.  e.g. 'CustInvcA' → 'CustInvc:A', 'CustCredB' → 'CustCred:B'.
   * Codes that already contain the colon pass through unchanged.
   */
  const normalizeStatusCode = (code) =>
    code.replace(/^(CustInvc|CustCred)([A-Z])$/, '$1:$2');

  /**
   * Build a safe SQL IN-list literal for status codes.
   *
   * SuiteQL's transaction.status field does not work correctly with
   * parameterised bind values (? placeholders) — queries return 0 rows even
   * though the same SQL with literal strings succeeds.  This helper inlines
   * the codes as quoted literals after strict validation so the values are
   * safe to embed directly in SQL.
   *
   * @param {string[]} codes  Status codes, e.g. ['CustInvc:A','CustInvc:B']
   * @returns {string}  e.g. "'CustInvc:A','CustInvc:B'"
   * @throws {Error} if any code contains characters outside [A-Za-z0-9:_]
   */
  const statusInLiteral = (codes) => {
    const safe = /^[A-Za-z0-9:_]+$/;
    codes.forEach(c => {
      if (!safe.test(c)) throw new Error('Invalid status code: ' + c);
    });
    return codes.map(c => "'" + c + "'").join(',');
  };

  return {
    parseIdList,
    pushIdFilter,
    buildCommonFilters,
    collectPagedResults,
    runSuiteQLAll,
    runSuiteQLAllRaw,
    writeJsonResponse,
    normalizeStatusCode,
    statusInLiteral
  };
});
