/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  PDC — Credit Memo List (action=getCreditMemos)
 *  SuiteQL search for credit memos with date / customer / subsidiary / status filters.
 *  Uses ROWNUM-based server-side pagination — returns all results in one response.
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
      subsidiaryCol: null   // subsidiary is on transactionline, not transaction
    });
    conditions.unshift("t.recordtype = 'creditmemo'", "t.voided = 'F'");

    // Subsidiary filter via transactionline (not exposed on transaction in SuiteQL)
    const subIds = qh.parseIdList(p.subsidiary);
    if (subIds.length === 1) {
      conditions.push(`EXISTS (SELECT 1 FROM transactionline tl WHERE tl.transaction = t.id AND tl.subsidiary = ${subIds[0]})`);
    } else if (subIds.length > 1) {
      conditions.push(`EXISTS (SELECT 1 FROM transactionline tl WHERE tl.transaction = t.id AND tl.subsidiary IN (${subIds.join(',')}))`);
    }

    // Department filter via transactionline (same pattern as subsidiary)
    const deptIds = qh.parseIdList(p.department);
    if (deptIds.length === 1) {
      conditions.push(`EXISTS (SELECT 1 FROM transactionline tl2 WHERE tl2.transaction = t.id AND tl2.department = ${deptIds[0]})`);
    } else if (deptIds.length > 1) {
      conditions.push(`EXISTS (SELECT 1 FROM transactionline tl2 WHERE tl2.transaction = t.id AND tl2.department IN (${deptIds.join(',')}))`);
    }

    // Status filter
    if (p.status) {
      const codes = p.status.split(',').map(s => qh.toSuiteQLStatus(qh.normalizeStatusCode(decodeURIComponent(s.trim())))).filter(Boolean);
      if (codes.length) {
        conditions.push("t.status IN (" + qh.statusInLiteral(codes) + ")");
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

    log.debug({ title: 'PDC creditMemos.serve finalQuery', details: 'SQL: ' + sql });

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

    const reqRowBegin = parseInt(p.rowBegin, 10) || 0;
    const reqRowEnd   = parseInt(p.rowEnd, 10)   || 0;

    try {
      if (reqRowBegin > 0 && reqRowEnd > 0) {
        const memos = qh.runSuiteQLPage(query, sql, params, mapRow, reqRowBegin, reqRowEnd);
        const result = { success: true, count: memos.length, invoices: memos };
        if (reqRowBegin === 1) {
          result.totalCount = qh.runSuiteQLCount(query, sql, params);
        }
        log.debug({ title: 'PDC creditMemos.serve paged', details: 'rows ' + reqRowBegin + '-' + reqRowEnd + ' returned ' + memos.length + (result.totalCount != null ? ' total=' + result.totalCount : '') });
        qh.writeJsonResponse(response, result);
      } else {
        const memos = qh.runSuiteQLPaginated(query, sql, params, mapRow);
        log.debug({ title: 'PDC creditMemos.serve result', details: 'count=' + memos.length });
        qh.writeJsonResponse(response, { success: true, count: memos.length, invoices: memos });
      }
    } catch (e) {
      log.error({ title: 'PDC creditMemos.serve SQL ERROR', details: e.message + '\nSQL: ' + sql + '\nParams: ' + JSON.stringify(params) });
      qh.writeJsonResponse(response, { success: false, error: e.message || 'Credit Memo query failed' });
    }
  };

  return { serve };
});
