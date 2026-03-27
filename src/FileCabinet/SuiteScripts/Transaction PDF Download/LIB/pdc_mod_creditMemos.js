/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  PDC — Credit Memo List (action=getCreditMemos)
 *  SuiteQL search for credit memos with date / customer / subsidiary / status filters.
 * ─────────────────────────────────────────────────────────────────────────────
 */
define(
  ['N/query', 'N/log', './pdc_mod_queryHelper'],
  (query, log, qh) => {

  /**
   * Serve the filtered credit memo list as JSON.
   * @param {Object} ctx  { request, response }
   */
  const serve = ({ request, response }) => {
    const p = request.parameters;
    log.debug({ title: 'PDC creditMemos.serve', details: 'p.status=' + (p.status || '(empty)') + ' | p.customer=' + (p.customer || '') + ' | p.dateFrom=' + (p.dateFrom || '') + ' | p.dateTo=' + (p.dateTo || '') });

    // Base conditions
    const { conditions, params } = qh.buildCommonFilters(p, {
      dateCol:       't.trandate',
      customerCol:   't.entity',
      subsidiaryCol: 't.subsidiary'
    });
    conditions.unshift("t.recordtype = 'creditmemo'", "t.voided = 'F'");

    // Status filter (comma-separated status codes, e.g. CustCred:A,CustCred:B)
    // Client pre-filters codes per type, so we use them directly without prefix checks
    if (p.status) {
      const codes = p.status.split(',').map(s => qh.normalizeStatusCode(decodeURIComponent(s.trim()))).filter(Boolean);
      if (codes.length) {
        conditions.push("t.status IN (" + qh.statusInLiteral(codes) + ")");
      }
    }

    log.debug({ title: 'PDC creditMemos.serve SQL', details: 'conditions=' + JSON.stringify(conditions) + ' | params=' + JSON.stringify(params) });

    const sql = `
      SELECT
        t.id,
        t.tranid,
        BUILTIN.DF(t.entity)               AS customername,
        TO_CHAR(t.trandate, 'YYYY-MM-DD')  AS trandate,
        t.foreigntotal                      AS amount,
        BUILTIN.DF(t.currency)             AS currency,
        BUILTIN.DF(t.status)               AS statuslabel,
        t.status                            AS statuscode,
        t.foreignamountunpaid               AS remaining
      FROM transaction t
      WHERE ${conditions.join(' AND ')}
      ORDER BY t.trandate DESC, t.id DESC
    `;

    log.debug({ title: 'PDC creditMemos.serve finalQuery', details: 'SQL: ' + sql + ' | Params: ' + JSON.stringify(params) });

    const mapRow = (row) => ({
      id:         row.id,
      tranId:     row.tranid || `CM-${row.id}`,
      customer:   row.customername || 'Unknown',
      date:       row.trandate,
      amount:     row.amount,
      remaining:  row.remaining,
      currency:   row.currency,
      status:     row.statuslabel || '',
      statusCode: row.statuscode  || ''
    });

    const reqPageSize = parseInt(p.pageSize, 10) || 0;
    const reqOffset   = parseInt(p.offset, 10)   || 0;

    try {
      if (reqPageSize > 0) {
        const total = qh.runSuiteQLCount(query, sql, params);
        const memos = qh.runSuiteQLPage(query, sql, params, mapRow, reqOffset, reqPageSize);
        const hasMore = (reqOffset + memos.length) < total;
        log.debug({ title: 'PDC creditMemos.serve paged', details: 'offset=' + reqOffset + ' page=' + memos.length + ' total=' + total });
        qh.writeJsonResponse(response, { success: true, count: memos.length, total, hasMore, invoices: memos });
      } else {
        const result = qh.runSuiteQLAll(query, sql, params, mapRow);
        log.debug({ title: 'PDC creditMemos.serve result', details: 'count=' + result.results.length });
        qh.writeJsonResponse(response, { success: true, count: result.results.length, invoices: result.results });
      }
    } catch (e) {
      log.error({ title: 'PDC creditMemos.serve SQL ERROR', details: e.message + '\nSQL: ' + sql + '\nParams: ' + JSON.stringify(params) });
      throw e;
    }
  };

  return { serve };
});
