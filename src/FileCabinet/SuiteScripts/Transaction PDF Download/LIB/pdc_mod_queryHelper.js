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
define(['N/log'], (log) => {

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
    writeJsonResponse,
    normalizeStatusCode,
    statusInLiteral
  };
});
