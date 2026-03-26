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
    if (ids.length === 1) {
      conditions.push(`${column} = ?`);
      params.push(ids[0]);
    } else if (ids.length > 1) {
      conditions.push(`${column} IN (${ids.map(() => '?').join(',')})`);
      params.push(...ids);
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

    // Date range
    if (p.dateFrom) {
      conditions.push(`${dateCol} >= TO_DATE(?, 'YYYY-MM-DD')`);
      params.push(p.dateFrom);
    }
    if (p.dateTo) {
      conditions.push(`${dateCol} <= TO_DATE(?, 'YYYY-MM-DD')`);
      params.push(p.dateTo);
    }

    // Tran ID filter (exact or LIKE match)
    if (p.tranId && p.tranId.trim()) {
      conditions.push(`${tranIdCol} LIKE ?`);
      params.push('%' + p.tranId.trim() + '%');
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
   * Normalize a status code by re-inserting the colon that NetSuite strips
   * from URL parameters.  e.g. 'CustInvcA' → 'CustInvc:A', 'CustCredB' → 'CustCred:B'.
   * Codes that already contain the colon pass through unchanged.
   */
  const normalizeStatusCode = (code) =>
    code.replace(/^(CustInvc|CustCred)([A-Z])$/, '$1:$2');

  return {
    parseIdList,
    pushIdFilter,
    buildCommonFilters,
    collectPagedResults,
    writeJsonResponse,
    normalizeStatusCode
  };
});
