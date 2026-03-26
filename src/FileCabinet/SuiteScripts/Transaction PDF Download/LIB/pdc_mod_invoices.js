/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  PDC — Invoice List (action=getInvoices)
 *  SuiteQL search for invoices with date / customer / subsidiary / status filters.
 * ─────────────────────────────────────────────────────────────────────────────
 */
define(
  ['N/query', 'N/log', './pdc_mod_queryHelper'],
  (query, log, qh) => {

  /**
   * Serve the filtered invoice list as JSON.
   * @param {Object} ctx  { request, response }
   */
  const serve = ({ request, response }) => {
    const p = request.parameters;
    log.debug({ title: 'PDC invoices.serve', details: 'p.status=' + (p.status || '(empty)') + ' | p.customer=' + (p.customer || '') + ' | p.dateFrom=' + (p.dateFrom || '') + ' | p.dateTo=' + (p.dateTo || '') });

    // Base conditions
    const { conditions, params } = qh.buildCommonFilters(p, {
      dateCol:       't.trandate',
      customerCol:   't.entity',
      subsidiaryCol: 't.subsidiary'
    });
    conditions.unshift("t.recordtype = 'invoice'", "t.voided = 'F'");

    // Status filter (comma-separated status codes, e.g. CustInvc:A,CustInvc:B)
    // Client pre-filters codes per type, so we use them directly without prefix checks
    if (p.status) {
      const codes = p.status.split(',').map(s => qh.normalizeStatusCode(decodeURIComponent(s.trim()))).filter(Boolean);
      if (codes.length) {
        conditions.push("t.status IN (" + qh.statusInLiteral(codes) + ")");
      }
    }

    log.debug({ title: 'PDC invoices.serve SQL', details: 'conditions=' + JSON.stringify(conditions) + ' | params=' + JSON.stringify(params) });

    const sql = `
      SELECT
        t.id,
        t.tranid,
        BUILTIN.DF(t.entity)               AS customername,
        TO_CHAR(t.trandate, 'YYYY-MM-DD')  AS trandate,
        TO_CHAR(t.duedate,  'YYYY-MM-DD')  AS duedate,
        t.foreigntotal                      AS amount,
        BUILTIN.DF(t.currency)             AS currency,
        BUILTIN.DF(t.status)               AS statuslabel,
        t.status                            AS statuscode
      FROM transaction t
      WHERE ${conditions.join(' AND ')}
      ORDER BY t.trandate DESC, t.id DESC
    `;

    log.debug({ title: 'PDC invoices.serve finalQuery', details: 'SQL: ' + sql + ' | Params: ' + JSON.stringify(params) });

    let invoices = [];
    try {
      const paged    = query.runSuiteQLPaged({ query: sql, params, pageSize: 1000 });
      invoices = qh.collectPagedResults(paged, (row) => ({
        id:         row.id,
        tranId:     row.tranid || `INV-${row.id}`,
        customer:   row.customername || 'Unknown',
        date:       row.trandate,
        dueDate:    row.duedate || '',
        amount:     row.amount,
        currency:   row.currency,
        status:     row.statuslabel || '',
        statusCode: row.statuscode  || ''
      }));
      log.debug({ title: 'PDC invoices.serve result', details: 'count=' + invoices.length });
    } catch (e) {
      log.error({ title: 'PDC invoices.serve SQL ERROR', details: e.message + '\nSQL: ' + sql + '\nParams: ' + JSON.stringify(params) });
      throw e;
    }

    qh.writeJsonResponse(response, {
      success: true,
      count:   invoices.length,
      invoices
    });
  };

  return { serve };
});
