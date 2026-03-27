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

    const mapRow = (row) => ({
      id:         row.id,
      tranId:     row.tranid || `INV-${row.id}`,
      customer:   row.customername || 'Unknown',
      date:       row.trandate,
      dueDate:    row.duedate || '',
      amount:     row.amount,
      currency:   row.currency,
      status:     row.statuslabel || '',
      statusCode: row.statuscode  || ''
    });

    const reqPageSize = parseInt(p.pageSize, 10) || 0;
    const reqOffset   = parseInt(p.offset, 10)   || 0;

    try {
      if (reqPageSize > 0) {
        // Paged mode: return one page; only compute total on first page (offset 0)
        const invoices = qh.runSuiteQLPage(query, sql, params, mapRow, reqOffset, reqPageSize);
        let total;
        if (reqOffset === 0) {
          total = qh.runSuiteQLCount(query, sql, params);
        }
        const hasMore = invoices.length >= reqPageSize;
        log.debug({ title: 'PDC invoices.serve paged', details: 'offset=' + reqOffset + ' page=' + invoices.length + (total != null ? ' total=' + total : '') });
        const result = { success: true, count: invoices.length, hasMore, invoices };
        if (total != null) result.total = total;
        qh.writeJsonResponse(response, result);
      } else {
        // Full mode: return all results
        const result = qh.runSuiteQLAll(query, sql, params, mapRow);
        log.debug({ title: 'PDC invoices.serve result', details: 'count=' + result.results.length });
        qh.writeJsonResponse(response, { success: true, count: result.results.length, invoices: result.results });
      }
    } catch (e) {
      log.error({ title: 'PDC invoices.serve SQL ERROR', details: e.message + '\nSQL: ' + sql + '\nParams: ' + JSON.stringify(params) });
      throw e;
    }
  };

  return { serve };
});
