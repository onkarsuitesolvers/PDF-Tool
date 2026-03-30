/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  PDC — Invoice Group List (action=getInvoiceGroups)
 *  Uses N/search (saved search) so that subsidiary filtering is available.
 *  SuiteQL's InvoiceGroup entity does not expose subsidiary.
 * ─────────────────────────────────────────────────────────────────────────────
 */
define(
  ['N/search', 'N/log', 'N/runtime', './pdc_mod_queryHelper'],
  (search, log, runtime, qh) => {

  const GOV_THRESHOLD = 500;

  /**
   * Map a search result row to the standard response object.
   */
  const mapResult = (result) => {
    const statusCode = (result.getValue('invoicegroupstatus') || '').toString().toUpperCase();
    const statusLabel = statusCode === 'PAIDFULL' ? 'Paid in Full'
                      : statusCode === 'PAIDPART' ? 'Partially Paid'
                      : statusCode === 'OPEN'     ? 'Open'
                      : statusCode === 'BILLED'   ? 'Billed'
                      : statusCode;
    return {
      id:         result.getValue('internalid'),
      tranId:     result.getValue('invoicegroupnumber') || `GRP-${result.getValue('internalid')}`,
      customer:   result.getText('customer') || 'Unknown',
      date:       result.getValue('trandate') || '',
      dueDate:    result.getValue('duedate') || '',
      amount:     result.getValue('fxamountdue'),
      currency:   '',
      status:     statusLabel,
      statusCode: statusCode
    };
  };

  /**
   * Build N/search filters from request parameters.
   */
  const buildFilters = (p) => {
    const filters = [];

    if (p.dateFrom) {
      filters.push(search.createFilter({ name: 'trandate', operator: search.Operator.ONORAFTER, values: p.dateFrom }));
    }
    if (p.dateTo) {
      filters.push(search.createFilter({ name: 'trandate', operator: search.Operator.ONORBEFORE, values: p.dateTo }));
    }

    const custIds = qh.parseIdList(p.customer);
    if (custIds.length) {
      filters.push(search.createFilter({ name: 'customer', operator: search.Operator.ANYOF, values: custIds }));
    }

    const subIds = qh.parseIdList(p.subsidiary);
    if (subIds.length) {
      filters.push(search.createFilter({ name: 'subsidiary', operator: search.Operator.ANYOF, values: subIds }));
    }

    if (p.tranId && p.tranId.trim()) {
      filters.push(search.createFilter({ name: 'invoicegroupnumber', operator: search.Operator.CONTAINS, values: p.tranId.trim() }));
    }

    if (p.status) {
      const codes = p.status.split(',').map(s => decodeURIComponent(s.trim())).filter(Boolean);
      if (codes.length) {
        filters.push(search.createFilter({ name: 'status', operator: search.Operator.ANYOF, values: codes }));
      }
    }

    return filters;
  };

  /**
   * Serve the filtered invoice group list as JSON.
   * @param {Object} ctx  { request, response }
   */
  const serve = ({ request, response }) => {
    const p = request.parameters;
    log.debug({ title: 'PDC invoiceGroups.serve', details: 'p.status=' + (p.status || '(empty)') + ' | p.customer=' + (p.customer || '') + ' | p.subsidiary=' + (p.subsidiary || '') + ' | p.dateFrom=' + (p.dateFrom || '') + ' | p.dateTo=' + (p.dateTo || '') });

    const filters = buildFilters(p);
    const columns = [
      search.createColumn({ name: 'internalid' }),
      search.createColumn({ name: 'invoicegroupnumber' }),
      search.createColumn({ name: 'customer' }),
      search.createColumn({ name: 'trandate', sort: search.Sort.DESC }),
      search.createColumn({ name: 'duedate' }),
      search.createColumn({ name: 'fxamountdue' }),
      search.createColumn({ name: 'invoicegroupstatus' })
    ];

    const reqRowBegin = parseInt(p.rowBegin, 10) || 0;
    const reqRowEnd   = parseInt(p.rowEnd, 10)   || 0;

    try {
      const srch = search.create({ type: 'invoicegroup', filters: filters, columns: columns });
      const pagedData = srch.runPaged({ pageSize: 1000 });
      const totalCount = pagedData.count;

      if (reqRowBegin > 0 && reqRowEnd > 0) {
        // Paged mode: return only the requested row range
        const groups = [];
        let currentRow = 0;

        for (let pi = 0; pi < pagedData.pageRanges.length; pi++) {
          if (runtime.getCurrentScript().getRemainingUsage() < GOV_THRESHOLD) break;

          const page = pagedData.fetch({ index: pi });
          page.data.forEach((result) => {
            currentRow++;
            if (currentRow >= reqRowBegin && currentRow <= reqRowEnd) {
              groups.push(mapResult(result));
            }
          });

          if (currentRow >= reqRowEnd) break;
        }

        const result = { success: true, count: groups.length, invoices: groups };
        if (reqRowBegin === 1) {
          result.totalCount = totalCount;
        }
        log.debug({ title: 'PDC invoiceGroups.serve paged', details: 'rows ' + reqRowBegin + '-' + reqRowEnd + ' returned ' + groups.length + ' total=' + totalCount });
        qh.writeJsonResponse(response, result);
      } else {
        // Full mode: return all results
        const groups = [];

        for (let pi = 0; pi < pagedData.pageRanges.length; pi++) {
          if (runtime.getCurrentScript().getRemainingUsage() < GOV_THRESHOLD) {
            log.audit({ title: 'PDC invoiceGroups.serve', details: 'Stopping — governance remaining: ' + runtime.getCurrentScript().getRemainingUsage() + ', rows so far: ' + groups.length });
            break;
          }

          const page = pagedData.fetch({ index: pi });
          page.data.forEach((result) => {
            groups.push(mapResult(result));
          });
        }

        log.debug({ title: 'PDC invoiceGroups.serve result', details: 'count=' + groups.length });
        qh.writeJsonResponse(response, { success: true, count: groups.length, invoices: groups });
      }
    } catch (e) {
      log.error({ title: 'PDC invoiceGroups.serve ERROR', details: e.message });
      qh.writeJsonResponse(response, { success: false, error: e.message || 'Invoice Group query failed' });
    }
  };

  return { serve };
});
