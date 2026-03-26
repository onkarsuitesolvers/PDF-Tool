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
      subsidiaryCol: null,   // InvoiceGroup has no subsidiary column
      tranIdCol:     'InvoiceGroup.invoicegroupnumber'
    });
    // Status filter (comma-separated codes, e.g. OPEN,PAIDPART,PAIDFULL)
    if (p.status) {
      const allCodes = p.status.split(',').map(s => s.trim()).filter(Boolean);
      const grpCodes = allCodes.filter(c => !c.includes(':'));
      if (grpCodes.length === 1) {
        conditions.push("InvoiceGroup.status = ?");
        params.push(grpCodes[0]);
      } else if (grpCodes.length > 1) {
        conditions.push("InvoiceGroup.status IN (" + grpCodes.map(() => '?').join(',') + ")");
        params.push(...grpCodes);
      } else if (allCodes.length > 0) {
        // Status filters were selected but none apply to invoice groups — return no results
        conditions.push("1=0");
      }
    }

    if (conditions.length === 0) conditions.push('1=1');

    // Positional columns: 0=id, 1=invoicegroupnumber, 2=customername,
    //                      3=trandate, 4=duedate, 5=amountdue, 6=statuscode
    const sql = `
      SELECT
        BUILTIN_RESULT.TYPE_INTEGER(InvoiceGroup.id)                                                       AS id,
        BUILTIN_RESULT.TYPE_STRING(InvoiceGroup.invoicegroupnumber)                                        AS invoicegroupnumber,
        BUILTIN_RESULT.TYPE_STRING(BUILTIN.DF(InvoiceGroup.customer))                                      AS customername,
        BUILTIN_RESULT.TYPE_DATE(InvoiceGroup.trandate)                                                    AS trandate,
        BUILTIN_RESULT.TYPE_DATE(InvoiceGroup.duedate)                                                     AS duedate,
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
        const statusCode = (v[6] || '').toString().toUpperCase();
        const statusLabel = statusCode === 'PAIDFULL' ? 'Paid in Full'
                          : statusCode === 'PAIDPART' ? 'Partially Paid'
                          : statusCode === 'OPEN'     ? 'Open'
                          : statusCode === 'BILLED'   ? 'Billed'
                          : statusCode;

        groups.push({
          id:         v[0],
          tranId:     v[1] || `GRP-${v[0]}`,
          customer:   v[2] || 'Unknown',
          date:       v[3] || '',
          dueDate:    v[4] || '',
          amount:     v[5],
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
