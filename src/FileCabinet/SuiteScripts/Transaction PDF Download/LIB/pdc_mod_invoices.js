/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  PDC — Invoice List (action=getInvoices)
 *  SuiteQL search for invoices with date / customer / subsidiary / status filters.
 *  Uses ROWNUM-based server-side pagination — returns all results in one response.
 * ─────────────────────────────────────────────────────────────────────────────
 */
define(
  ['N/query', 'N/log', 'N/runtime', './pdc_mod_queryHelper'],
  (query, log, runtime, qh) => {

  /**
   * Serve the filtered invoice list as JSON.
   * @param {Object} ctx  { request, response }
   */
  const serve = ({ request, response }) => {
    const p = request.parameters;
    const user = runtime.getCurrentUser();
    log.debug({ title: 'PDC invoices.serve context', details: 'userId=' + user.id + ' | role=' + user.role + ' | roleCenter=' + user.roleCenter + ' | subsidiary=' + user.subsidiary });
    log.debug({ title: 'PDC invoices.serve', details: 'p.status=' + (p.status || '(empty)') + ' | p.customer=' + (p.customer || '') + ' | p.dateFrom=' + (p.dateFrom || '') + ' | p.dateTo=' + (p.dateTo || '') });

    // Base conditions
    const { conditions, params } = qh.buildCommonFilters(p, {
      dateCol:       't.trandate',
      customerCol:   't.entity',
      subsidiaryCol: null   // subsidiary is on transactionline, not transaction
    });
    conditions.unshift("t.recordtype = 'invoice'", "t.voided = 'F'");

    // Subsidiary filter via transactionline (not exposed on transaction in SuiteQL)
    const subIds = qh.parseIdList(p.subsidiary);
    if (subIds.length === 1) {
      conditions.push(`EXISTS (SELECT 1 FROM transactionline tl WHERE tl.transaction = t.id AND tl.subsidiary = ${subIds[0]})`);
    } else if (subIds.length > 1) {
      conditions.push(`EXISTS (SELECT 1 FROM transactionline tl WHERE tl.transaction = t.id AND tl.subsidiary IN (${subIds.join(',')}))`);
    }

    // Status filter
    if (p.status) {
      log.debug({ title: 'PDC invoices.serve raw status', details: 'raw p.status="' + p.status + '" | typeof=' + typeof p.status });
      const codes = p.status.split(',').map(s => qh.normalizeStatusCode(decodeURIComponent(s.trim()))).filter(Boolean);
      log.debug({ title: 'PDC invoices.serve processed status', details: 'codes=' + JSON.stringify(codes) });
      if (codes.length) {
        conditions.push("t.status IN (" + qh.statusInLiteral(codes) + ")");
      }
    }

    log.debug({ title: 'PDC invoices.serve allConditions', details: conditions.join(' AND ') });

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

    log.debug({ title: 'PDC invoices.serve finalQuery', details: 'SQL: ' + sql });

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

    const reqRowBegin = parseInt(p.rowBegin, 10) || 0;
    const reqRowEnd   = parseInt(p.rowEnd, 10)   || 0;

    try {
      if (reqRowBegin > 0 && reqRowEnd > 0) {
        // Paged mode: return one ROWNUM page; total count on first page only
        const invoices = qh.runSuiteQLPage(query, sql, params, mapRow, reqRowBegin, reqRowEnd);
        const result = { success: true, count: invoices.length, invoices };
        if (reqRowBegin === 1) {
          result.totalCount = qh.runSuiteQLCount(query, sql, params);
        }
        log.debug({ title: 'PDC invoices.serve paged', details: 'rows ' + reqRowBegin + '-' + reqRowEnd + ' returned ' + invoices.length + (result.totalCount != null ? ' total=' + result.totalCount : '') });
        // Diagnostic: if status filter returned 0 results, run base SQL without wrappers
        if (invoices.length === 0 && p.status) {
          try {
            const diagRows = query.runSuiteQL({ query: sql }).asMappedResults();
            log.debug({ title: 'PDC DIAG base SQL direct', details: 'rows=' + diagRows.length + (diagRows.length > 0 ? ' sample=' + JSON.stringify(diagRows[0]) : '') });
          } catch (de) {
            log.debug({ title: 'PDC DIAG error', details: de.message });
          }
        }
        qh.writeJsonResponse(response, result);
      } else {
        // Full mode: return all results using server-side ROWNUM loop
        const invoices = qh.runSuiteQLPaginated(query, sql, params, mapRow);
        log.debug({ title: 'PDC invoices.serve result', details: 'count=' + invoices.length });
        qh.writeJsonResponse(response, { success: true, count: invoices.length, invoices });
      }
    } catch (e) {
      log.error({ title: 'PDC invoices.serve SQL ERROR', details: e.message + '\nSQL: ' + sql + '\nParams: ' + JSON.stringify(params) });
      qh.writeJsonResponse(response, { success: false, error: e.message || 'Invoice query failed' });
    }
  };

  return { serve };
});
