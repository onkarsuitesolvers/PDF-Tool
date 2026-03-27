/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  PDC — Invoice Group List (action=getInvoiceGroups)
 *  SuiteQL search using the InvoiceGroup entity with BUILTIN_RESULT typed columns.
 *  Uses ROWNUM-based server-side pagination — returns all results in one response.
 *  Note: InvoiceGroup does NOT expose subsidiary for filtering.
 * ─────────────────────────────────────────────────────────────────────────────
 */
define(
  ['N/query', 'N/log', './pdc_mod_queryHelper'],
  (query, log, qh) => {

  /**
   * Serve the filtered invoice group list as JSON.
   * @param {Object} ctx  { request, response }
   */
  const serve = ({ request, response }) => {
    const p = request.parameters;
    log.debug({ title: 'PDC invoiceGroups.serve', details: 'p.status=' + (p.status || '(empty)') + ' | p.customer=' + (p.customer || '') + ' | p.dateFrom=' + (p.dateFrom || '') + ' | p.dateTo=' + (p.dateTo || '') });

    // Build filters — no subsidiary support for InvoiceGroup
    const { conditions, params } = qh.buildCommonFilters(p, {
      dateCol:       'InvoiceGroup.trandate',
      customerCol:   'InvoiceGroup.customer',
      subsidiaryCol: null,
      tranIdCol:     'InvoiceGroup.invoicegroupnumber'
    });

    // Status filter
    if (p.status) {
      const codes = p.status.split(',').map(s => decodeURIComponent(s.trim())).filter(Boolean);
      if (codes.length) {
        conditions.push("InvoiceGroup.status IN (" + qh.statusInLiteral(codes) + ")");
      }
    }

    if (conditions.length === 0) conditions.push('1=1');

    const sql = `
      SELECT
        InvoiceGroup.id                                    AS id,
        InvoiceGroup.invoicegroupnumber                    AS invoicegroupnumber,
        BUILTIN.DF(InvoiceGroup.customer)                  AS customername,
        TO_CHAR(InvoiceGroup.trandate, 'YYYY-MM-DD')      AS trandate,
        TO_CHAR(InvoiceGroup.duedate,  'YYYY-MM-DD')      AS duedate,
        InvoiceGroup.amountdue                             AS amountdue,
        InvoiceGroup.status                                AS statuscode
      FROM InvoiceGroup
      WHERE ${conditions.join(' AND ')}
      ORDER BY InvoiceGroup.trandate DESC, InvoiceGroup.id DESC
    `;

    log.debug({ title: 'PDC invoiceGroups.serve finalQuery', details: 'SQL: ' + sql });

    const mapRow = (row) => {
      const statusCode = (row.statuscode || '').toString().toUpperCase();
      const statusLabel = statusCode === 'PAIDFULL' ? 'Paid in Full'
                        : statusCode === 'PAIDPART' ? 'Partially Paid'
                        : statusCode === 'OPEN'     ? 'Open'
                        : statusCode === 'BILLED'   ? 'Billed'
                        : statusCode;
      return {
        id:         row.id,
        tranId:     row.invoicegroupnumber || `GRP-${row.id}`,
        customer:   row.customername || 'Unknown',
        date:       row.trandate || '',
        dueDate:    row.duedate || '',
        amount:     row.amountdue,
        currency:   '',
        status:     statusLabel,
        statusCode: statusCode
      };
    };

    const reqRowBegin = parseInt(p.rowBegin, 10) || 0;
    const reqRowEnd   = parseInt(p.rowEnd, 10)   || 0;

    try {
      if (reqRowBegin > 0 && reqRowEnd > 0) {
        const groups = qh.runSuiteQLPage(query, sql, params, mapRow, reqRowBegin, reqRowEnd);
        const result = { success: true, count: groups.length, invoices: groups };
        if (reqRowBegin === 1) {
          result.totalCount = qh.runSuiteQLCount(query, sql, params);
        }
        log.debug({ title: 'PDC invoiceGroups.serve paged', details: 'rows ' + reqRowBegin + '-' + reqRowEnd + ' returned ' + groups.length + (result.totalCount != null ? ' total=' + result.totalCount : '') });
        qh.writeJsonResponse(response, result);
      } else {
        const groups = qh.runSuiteQLPaginated(query, sql, params, mapRow);
        log.debug({ title: 'PDC invoiceGroups.serve result', details: 'count=' + groups.length });
        qh.writeJsonResponse(response, { success: true, count: groups.length, invoices: groups });
      }
    } catch (e) {
      log.error({ title: 'PDC invoiceGroups.serve SQL ERROR', details: e.message + '\nSQL: ' + sql + '\nParams: ' + JSON.stringify(params) });
      qh.writeJsonResponse(response, { success: false, error: e.message || 'Invoice Group query failed' });
    }
  };

  return { serve };
});
