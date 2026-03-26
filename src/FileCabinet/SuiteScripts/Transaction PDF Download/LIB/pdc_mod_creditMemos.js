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
  ['N/query', './pdc_mod_queryHelper'],
  (query, qh) => {

  /**
   * Serve the filtered credit memo list as JSON.
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
    conditions.unshift("t.recordtype = 'creditmemo'", "t.voided = 'F'");

    // Status filter (comma-separated status codes, e.g. CustCred:A,CustCred:B)
    // Client pre-filters codes per type, so we use them directly without prefix checks
    if (p.status) {
      const codes = p.status.split(',').map(s => decodeURIComponent(s.trim())).filter(Boolean);
      if (codes.length === 1) {
        conditions.push("t.status = ?");
        params.push(codes[0]);
      } else if (codes.length > 1) {
        conditions.push("t.status IN (" + codes.map(() => '?').join(',') + ")");
        params.push(...codes);
      }
    }

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

    const paged = query.runSuiteQLPaged({ query: sql, params, pageSize: 1000 });
    const memos = qh.collectPagedResults(paged, (row) => ({
      id:         row.id,
      tranId:     row.tranid || `CM-${row.id}`,
      customer:   row.customername || 'Unknown',
      date:       row.trandate,
      amount:     row.amount,
      remaining:  row.remaining,
      currency:   row.currency,
      status:     row.statuslabel || '',
      statusCode: row.statuscode  || ''
    }));

    qh.writeJsonResponse(response, {
      success:  true,
      count:    memos.length,
      invoices: memos          // kept as "invoices" for client-side compatibility
    });
  };

  return { serve };
});
