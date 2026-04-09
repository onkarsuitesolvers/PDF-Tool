/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  PDC — Invoice Group List (action=getInvoiceGroups)
 *  Uses N/search (saved-search API) against the invoicegroup record type.
 *  This enables subsidiary filtering which is not available via SuiteQL.
 *  Pagination is handled via search.runPaged() with a 1000-row page size.
 * ─────────────────────────────────────────────────────────────────────────────
 */
define(
  ['N/search', 'N/log', 'N/runtime', './pdc_mod_queryHelper'],
  (search, log, runtime, qh) => {

  const GOV_THRESHOLD = 500;

  /**
   * Convert ISO date (YYYY-MM-DD) to NetSuite search date (M/D/YYYY).
   */
  const toSearchDate = (iso) => {
    const [y, m, d] = iso.split('-');
    return parseInt(m, 10) + '/' + parseInt(d, 10) + '/' + y;
  };

  /**
   * Convert NetSuite date (M/D/YYYY) back to ISO (YYYY-MM-DD).
   */
  const toIsoDate = (nsDate) => {
    if (!nsDate) return '';
    const parts = nsDate.split('/');
    if (parts.length === 3) {
      return parts[2] + '-' + parts[0].padStart(2, '0') + '-' + parts[1].padStart(2, '0');
    }
    return nsDate;
  };

  /**
   * Build N/search filter array from request parameters.
   */
  const buildFilters = (p) => {
    const filters = [];

    // Date range
    if (p.dateFrom && p.dateTo) {
      filters.push(['trandate', 'within', toSearchDate(p.dateFrom), toSearchDate(p.dateTo)]);
    } else if (p.dateFrom) {
      filters.push(['trandate', 'onorafter', toSearchDate(p.dateFrom)]);
    } else if (p.dateTo) {
      filters.push(['trandate', 'onorbefore', toSearchDate(p.dateTo)]);
    }

    // Customer
    const custIds = qh.parseIdList(p.customer);
    if (custIds.length) {
      if (filters.length) filters.push('AND');
      filters.push(['customer', 'anyof'].concat(custIds.map(String)));
    }

    // Subsidiary
    const subIds = qh.parseIdList(p.subsidiary);
    if (subIds.length) {
      if (filters.length) filters.push('AND');
      filters.push(['subsidiary', 'anyof'].concat(subIds.map(String)));
    }

    // Status – default to all known statuses so undefined groups are excluded
    const ALL_STATUSES = ['OPEN', 'PAIDPART', 'PAIDFULL', 'BILLED'];
    const codes = p.status
      ? p.status.split(',').map(s => decodeURIComponent(s.trim())).filter(Boolean)
      : ALL_STATUSES;
    if (codes.length) {
      if (filters.length) filters.push('AND');
      filters.push(['invoicegroupstatus', 'anyof'].concat(codes));
    }

    // Department
    const deptIds = qh.parseIdList(p.department);
    if (deptIds.length) {
      if (filters.length) filters.push('AND');
      filters.push(['department', 'anyof'].concat(deptIds.map(String)));
    }

    // Invoice Group Number (contains for partial match, like current LIKE behavior)
    if (p.tranId && p.tranId.trim()) {
      if (filters.length) filters.push('AND');
      filters.push(['invoicegroupnumber', 'contains', p.tranId.trim()]);
    }

    // PO# (otherrefnum)
    if (p.poNum && p.poNum.trim()) {
      if (filters.length) filters.push('AND');
      filters.push(['otherrefnum', 'contains', p.poNum.trim()]);
    }

    // Work Authorization Number (custbody_nsts_ci_po_no)
    if (p.workAuth && p.workAuth.trim()) {
      if (filters.length) filters.push('AND');
      filters.push(['custbody_nsts_ci_po_no', 'contains', p.workAuth.trim()]);
    }

    // CSV tranIds — exact match on invoicegroupnumber
    if (p.tranIds && p.tranIds.trim()) {
      const ids = p.tranIds.split(',').map(s => s.trim()).filter(Boolean);
      if (ids.length) {
        if (filters.length) filters.push('AND');
        filters.push(['invoicegroupnumber', 'anyof'].concat(ids));
      }
    }

    return filters;
  };

  /**
   * Map a search.Result to the standard response object.
   */
  const mapResult = (result) => {
    const statusCode = (result.getValue('invoicegroupstatus') || '').toString().toUpperCase();
    const statusLabel = statusCode === 'PAIDFULL'  ? 'Paid in Full'
                      : statusCode === 'PAIDPART'  ? 'Partially Paid'
                      : statusCode === 'OPEN'      ? 'Open'
                      : statusCode === 'BILLED'    ? 'Billed'
                      : statusCode;

    return {
      id:         result.id,
      tranId:     result.getValue('invoicegroupnumber') || ('GRP-' + result.id),
      customer:   result.getText('customer') || 'Unknown',
      date:       toIsoDate(result.getValue('trandate') || ''),
      dueDate:    toIsoDate(result.getValue('duedate') || ''),
      amount:     parseFloat(result.getValue('fxamount')) || 0,
      currency:   result.getText('currency') || '',
      status:     statusLabel,
      statusCode: statusCode
    };
  };

  /**
   * Serve the filtered invoice group list as JSON.
   * @param {Object} ctx  { request, response }
   */
  const serve = ({ request, response }) => {
    const p = request.parameters;
    log.debug({ title: 'PDC invoiceGroups.serve', details: 'p.status=' + (p.status || '(empty)') + ' | p.customer=' + (p.customer || '') + ' | p.subsidiary=' + (p.subsidiary || '') + ' | p.dateFrom=' + (p.dateFrom || '') + ' | p.dateTo=' + (p.dateTo || '') });

    const filters = buildFilters(p);

    const invoiceGroupSearch = search.create({
      type: 'invoicegroup',
      filters: filters,
      columns: [
        search.createColumn({ name: 'invoicegroupnumber' }),
        search.createColumn({ name: 'customer' }),
        search.createColumn({ name: 'trandate', sort: search.Sort.DESC }),
        search.createColumn({ name: 'duedate' }),
        search.createColumn({ name: 'fxamount' }),
        search.createColumn({ name: 'invoicegroupstatus' }),
        search.createColumn({ name: 'currency' })
      ]
    });

    const reqRowBegin = parseInt(p.rowBegin, 10) || 0;
    const reqRowEnd   = parseInt(p.rowEnd, 10)   || 0;

    try {
      const PAGE_SIZE = 1000;
      const pagedData = invoiceGroupSearch.runPaged({ pageSize: PAGE_SIZE });
      const totalCount = pagedData.count;

      log.debug({ title: 'PDC invoiceGroups.serve', details: 'totalCount=' + totalCount + ' | reqRowBegin=' + reqRowBegin + ' | reqRowEnd=' + reqRowEnd });

      const groups = [];

      if (reqRowBegin > 0 && reqRowEnd > 0) {
        // Paged mode: fetch only the pages overlapping [rowBegin, rowEnd]
        const startPage = Math.floor((reqRowBegin - 1) / PAGE_SIZE);
        const endPage   = Math.floor((reqRowEnd - 1) / PAGE_SIZE);

        for (let pi = startPage; pi <= endPage && pi < pagedData.pageRanges.length; pi++) {
          const page = pagedData.fetch({ index: pi });
          page.data.forEach((result, idx) => {
            const globalIdx = pi * PAGE_SIZE + idx + 1; // 1-based
            if (globalIdx >= reqRowBegin && globalIdx <= reqRowEnd) {
              var mapped = mapResult(result);
              if (mapped.statusCode) groups.push(mapped);
            }
          });
        }

        const result = { success: true, count: groups.length, invoices: groups };
        if (reqRowBegin === 1) {
          result.totalCount = totalCount;
        }
        log.debug({ title: 'PDC invoiceGroups.serve paged', details: 'rows ' + reqRowBegin + '-' + reqRowEnd + ' returned ' + groups.length + ' total=' + totalCount });
        qh.writeJsonResponse(response, result);
      } else {
        // Full mode: fetch all pages with governance guard
        pagedData.pageRanges.forEach((range) => {
          const remaining = runtime.getCurrentScript().getRemainingUsage();
          if (remaining < GOV_THRESHOLD) {
            log.audit({ title: 'PDC invoiceGroups.serve', details: 'Stopping — governance remaining: ' + remaining + ', rows so far: ' + groups.length });
            return;
          }
          const page = pagedData.fetch({ index: range.index });
          page.data.forEach((result) => {
            var mapped = mapResult(result);
            if (mapped.statusCode) groups.push(mapped);
          });
        });

        log.debug({ title: 'PDC invoiceGroups.serve result', details: 'count=' + groups.length });
        qh.writeJsonResponse(response, { success: true, count: groups.length, invoices: groups });
      }
    } catch (e) {
      log.error({ title: 'PDC invoiceGroups.serve SEARCH ERROR', details: e.message + '\nFilters: ' + JSON.stringify(filters) });
      qh.writeJsonResponse(response, { success: false, error: e.message || 'Invoice Group search failed' });
    }
  };

  return { serve };
});
