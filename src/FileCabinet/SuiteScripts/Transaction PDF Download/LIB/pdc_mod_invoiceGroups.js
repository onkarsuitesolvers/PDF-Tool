/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  PDC — Invoice Group List (action=getInvoiceGroups)
 *  SuiteQL search using the InvoiceGroup entity with BUILTIN_RESULT typed columns.
 *  Note: InvoiceGroup does NOT expose subsidiary for filtering.
 * ─────────────────────────────────────────────────────────────────────────────
 */
define(
  ['N/query', './pdc_mod_queryHelper'],
  (query, qh) => {

  /**
   * Serve the filtered invoice group list as JSON.
   * @param {Object} ctx  { request, response }
   */
  const serve = ({ request, response }) => {
    const p = request.parameters;

    // Build filters — no subsidiary support for InvoiceGroup
    const { conditions, params } = qh.buildCommonFilters(p, {
      dateCol:       'InvoiceGroup.trandate',
      customerCol:   'InvoiceGroup.customer',
      subsidiaryCol: null   // InvoiceGroup has no subsidiary column
    });
    if (conditions.length === 0) conditions.push('1=1');

    // Positional columns: 0=id, 1=invoicegroupnumber, 2=customername,
    //                      3=trandate, 4=amountdue, 5=statuscode
    const sql = `
      SELECT
        BUILTIN_RESULT.TYPE_INTEGER(InvoiceGroup.id)                                                       AS id,
        BUILTIN_RESULT.TYPE_STRING(InvoiceGroup.invoicegroupnumber)                                        AS invoicegroupnumber,
        BUILTIN_RESULT.TYPE_STRING(BUILTIN.DF(InvoiceGroup.customer))                                      AS customername,
        BUILTIN_RESULT.TYPE_DATE(InvoiceGroup.trandate)                                                    AS trandate,
        BUILTIN_RESULT.TYPE_CURRENCY(InvoiceGroup.amountdue, BUILTIN.CURRENCY(InvoiceGroup.amountdue))     AS amountdue,
        BUILTIN_RESULT.TYPE_STRING(InvoiceGroup.status)                                                    AS statuscode
      FROM InvoiceGroup
      WHERE ${conditions.join(' AND ')}
      ORDER BY InvoiceGroup.trandate DESC, InvoiceGroup.id DESC
    `;

    const groups = [];

    // InvoiceGroup uses positional (non-mapped) results
    const paged = query.runSuiteQLPaged({ query: sql, params, pageSize: 50 });
    paged.iterator().each((page) => {
      page.value.data.iterator().each((row) => {
        const v          = row.value.values;   // positional array
        const statusCode = (v[5] || '').toString().toUpperCase();
        const statusLabel = statusCode === 'BILLED' ? 'Billed'
                          : statusCode === 'OPEN'   ? 'Open'
                          : statusCode;

        groups.push({
          id:         v[0],
          tranId:     v[1] || `GRP-${v[0]}`,
          customer:   v[2] || 'Unknown',
          date:       v[3] || '',
          amount:     v[4],
          currency:   '',
          status:     statusLabel,
          statusCode: statusCode
        });
        return true;
      });
      return true;
    });

    qh.writeJsonResponse(response, {
      success:  true,
      count:    groups.length,
      invoices: groups          // kept as "invoices" for client-side compatibility
    });
  };

  return { serve };
});
