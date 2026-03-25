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
  ['N/query', './pdc_mod_queryHelper'],
  (query, qh) => {

  /**
   * Serve the filtered invoice list as JSON.
   * @param {Object} ctx  { request, response }
   */
  const serve = ({ request, response }) => {
    const p = request.parameters;

    // Base conditions
    const { conditions, params } = qh.buildCommonFilters(p, {
      dateCol:       't.trandate',
      customerCol:   't.entity',
      subsidiaryCol: 't.subsidiary'
    });
    conditions.unshift("t.recordtype = 'invoice'", "t.voided = 'F'");

    // Status filter (comma-separated full status codes, e.g. CustInvc:A,CustInvc:B)
    if (p.status) {
      const allCodes = p.status.split(',').map(s => s.trim()).filter(Boolean);
      const invCodes = allCodes.filter(c => c.startsWith('CustInvc:'));
      if (invCodes.length === 1) {
        conditions.push("t.status = ?");
        params.push(invCodes[0]);
      } else if (invCodes.length > 1) {
        conditions.push("t.status IN (" + invCodes.map(() => '?').join(',') + ")");
        params.push(...invCodes);
      }
    }

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

    const paged    = query.runSuiteQLPaged({ query: sql, params, pageSize: 1000 });
    const invoices = qh.collectPagedResults(paged, (row) => ({
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

    qh.writeJsonResponse(response, {
      success: true,
      count:   invoices.length,
      invoices
    });
  };

  return { serve };
});
