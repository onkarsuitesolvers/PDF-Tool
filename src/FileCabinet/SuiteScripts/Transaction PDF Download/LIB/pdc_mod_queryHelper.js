/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  PDC — Shared Query & Pagination Helper
 *
 *  Centralises filter building and ROWNUM-based pagination used by
 *  serveInvoiceList, serveCreditMemoList, and serveInvoiceGroupList.
 *
 *  Pagination strategy (based on Tim Dietrich's SuiteQL Query Tool):
 *    SELECT * FROM (
 *      SELECT ROWNUM AS ROWNUMBER, * FROM ( <your query> )
 *    ) WHERE ( ROWNUMBER BETWEEN :begin AND :end )
 *
 *  This approach is reliable, governance-efficient, and avoids the
 *  infinite-loop pitfalls of OFFSET/FETCH + hasMore heuristics.
 * ─────────────────────────────────────────────────────────────────────────────
 */
define(['N/log', 'N/runtime'], (log, runtime) => {

  const ROWNUM_PAGE   = 5000;   // rows per ROWNUM page (matches SuiteQL Query Tool)
  const GOV_THRESHOLD = 500;    // stop when remaining governance units drop below this

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
   * @param {string}  opts.subsidiaryCol Column for subsidiary (default null; transaction table does not expose subsidiary in SuiteQL)
   * @param {string}  opts.tranIdCol   Column for tranid (default 't.tranid')
   * @returns {{ conditions: string[], params: any[] }}
   */
  const buildCommonFilters = (p, opts = {}) => {
    const dateCol       = opts.dateCol       || 't.trandate';
    const customerCol   = opts.customerCol   || 't.entity';
    const subsidiaryCol = opts.subsidiaryCol !== undefined ? opts.subsidiaryCol : null;
    const tranIdCol     = opts.tranIdCol     || 't.tranid';

    const conditions = [];
    const params     = [];

    if (p.dateFrom) {
      const df = validateDateLiteral(p.dateFrom);
      conditions.push(`${dateCol} >= TO_DATE('${df}', 'YYYY-MM-DD')`);
    }
    if (p.dateTo) {
      const dt = validateDateLiteral(p.dateTo);
      conditions.push(`${dateCol} <= TO_DATE('${dt}', 'YYYY-MM-DD')`);
    }

    if (p.tranId && p.tranId.trim()) {
      const tid = p.tranId.trim().replace(/'/g, "''");
      conditions.push(`${tranIdCol} LIKE '%${tid}%'`);
    }

    const custIds = parseIdList(p.customer);
    if (custIds.length) pushIdFilter(conditions, params, customerCol, custIds);

    if (subsidiaryCol) {
      const subIds = parseIdList(p.subsidiary);
      if (subIds.length) pushIdFilter(conditions, params, subsidiaryCol, subIds);
    }

    log.debug({ title: 'PDC queryHelper.buildCommonFilters', details: 'dateFrom=' + (p.dateFrom || '') + ' dateTo=' + (p.dateTo || '') + ' customer=' + (p.customer || '') + ' subsidiary=' + (p.subsidiary || '') + ' tranId=' + (p.tranId || '') + ' | built ' + conditions.length + ' conditions' });

    return { conditions, params };
  };

  /**
   * Run a SuiteQL query and collect ALL mapped results using ROWNUM pagination.
   *
   * Based on Tim Dietrich's SuiteQL Query Tool pattern:
   *   SELECT * FROM ( SELECT ROWNUM AS ROWNUMBER, * FROM (sql) )
   *   WHERE ( ROWNUMBER BETWEEN rowBegin AND rowEnd )
   *
   * Loops server-side until all rows are fetched.  Terminates when a page
   * returns fewer rows than the page size — simple and foolproof.
   *
   * @param {Object}   queryModule  The N/query module reference
   * @param {string}   sql          Complete SQL (with ORDER BY, no OFFSET/FETCH)
   * @param {any[]}    params       Bind parameters
   * @param {Function} mapFn        (row: Object) => mapped object  (receives asMappedResults row)
   * @returns {Object[]}  All mapped records
   */
  const runSuiteQLPaginated = (queryModule, sql, params, mapFn) => {
    const records = [];
    let rowBegin = 1;
    let moreRecords = true;

    do {
      const remaining = runtime.getCurrentScript().getRemainingUsage();
      if (remaining < GOV_THRESHOLD) {
        log.audit({ title: 'PDC runSuiteQLPaginated', details: 'Stopping — governance remaining: ' + remaining + ', rows so far: ' + records.length });
        break;
      }

      const rowEnd = rowBegin + ROWNUM_PAGE - 1;
      const paginatedSQL = 'SELECT * FROM ( SELECT ROWNUM AS ROWNUMBER, * FROM (' + sql + ') ) WHERE ( ROWNUMBER BETWEEN ' + rowBegin + ' AND ' + rowEnd + ')';

      const queryResults = queryModule.runSuiteQL({ query: paginatedSQL, params: params }).asMappedResults();
      queryResults.forEach(row => records.push(mapFn(row)));

      log.debug({ title: 'PDC runSuiteQLPaginated', details: 'rows ' + rowBegin + '-' + rowEnd + ' returned ' + queryResults.length + ', total so far: ' + records.length });

      if (queryResults.length < ROWNUM_PAGE) { moreRecords = false; }
      rowBegin += ROWNUM_PAGE;
    } while (moreRecords);

    return records;
  };

  /**
   * Run a single page of a SuiteQL query using ROWNUM pagination.
   *
   * Called by the server modules when the client sends rowBegin/rowEnd
   * so results can be streamed page by page with live progress.
   *
   * @param {Object}   queryModule  The N/query module reference
   * @param {string}   sql          Complete SQL (with ORDER BY)
   * @param {any[]}    params       Bind parameters
   * @param {Function} mapFn        (row: Object) => mapped object
   * @param {number}   rowBegin     1-based start row
   * @param {number}   rowEnd       1-based end row
   * @returns {Object[]}  Mapped records for this page
   */
  const runSuiteQLPage = (queryModule, sql, params, mapFn, rowBegin, rowEnd) => {
    const paginatedSQL = 'SELECT * FROM ( SELECT ROWNUM AS ROWNUMBER, * FROM (' + sql + ') ) WHERE ( ROWNUMBER BETWEEN ' + rowBegin + ' AND ' + rowEnd + ')';
    const queryResults = queryModule.runSuiteQL({ query: paginatedSQL, params: params }).asMappedResults();
    log.debug({ title: 'PDC runSuiteQLPage', details: 'rows ' + rowBegin + '-' + rowEnd + ' returned ' + queryResults.length });
    return queryResults.map(mapFn);
  };

  /**
   * Count total rows for a query using ROWNUM wrapper.
   *
   * @param {Object}   queryModule  The N/query module reference
   * @param {string}   sql          Base SQL
   * @param {any[]}    params       Bind parameters
   * @returns {number}
   */
  const runSuiteQLCount = (queryModule, sql, params) => {
    const countSQL = 'SELECT COUNT(*) AS cnt FROM (' + sql + ')';
    const rows = queryModule.runSuiteQL({ query: countSQL, params: params }).asMappedResults();
    return rows.length > 0 ? parseInt(rows[0].cnt, 10) : 0;
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
   * @param {string} val  e.g. '2025-12-26'
   * @returns {string}
   */
  const validateDateLiteral = (val) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) throw new Error('Invalid date format: ' + val);
    return val;
  };

  /**
   * Normalize a status code by re-inserting the colon that NetSuite strips
   * from URL parameters.  e.g. 'CustInvcA' → 'CustInvc:A'.
   */
  const normalizeStatusCode = (code) =>
    code.replace(/^(CustInvc|CustCred)([A-Z])$/, '$1:$2');

  /**
   * Build a safe SQL IN-list literal for status codes.
   *
   * @param {string[]} codes  Status codes, e.g. ['CustInvc:A','CustInvc:B']
   * @returns {string}  e.g. "'CustInvc:A','CustInvc:B'"
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
    runSuiteQLPaginated,
    runSuiteQLPage,
    runSuiteQLCount,
    writeJsonResponse,
    normalizeStatusCode,
    statusInLiteral
  };
});
