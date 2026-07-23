/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  PDC — File Cabinet File List (action=getFiles)
 *  Uses N/search (saved-search API) against the file record type to list
 *  File Cabinet files filtered by folder, file type and date-created range.
 *  Pagination is handled via search.runPaged() with a 1000-row page size.
 * ─────────────────────────────────────────────────────────────────────────────
 */
define(
  ['N/search', 'N/log', 'N/runtime', './pdc_mod_queryHelper'],
  (search, log, runtime, qh) => {

  const GOV_THRESHOLD = 500;
  const PAGE_SIZE      = 1000;

  /**
   * Convert ISO date (YYYY-MM-DD) to NetSuite search date (M/D/YYYY).
   */
  const toSearchDate = (iso) => {
    const [y, m, d] = iso.split('-');
    return parseInt(m, 10) + '/' + parseInt(d, 10) + '/' + y;
  };

  /**
   * Build N/search filter array from request parameters.
   */
  const buildFilters = (p) => {
    const filters = [];

    // Folder — required in practice (client enforces at least one selection)
    const folderIds = qh.parseIdList(p.folder);
    if (folderIds.length) {
      if (filters.length) filters.push('AND');
      filters.push(['folder', 'anyof'].concat(folderIds.map(String)));
    }

    // File type(s) — internal id strings from N/file's Type enum, e.g. 'PDF'
    if (p.fileType && p.fileType.trim()) {
      const types = p.fileType.split(',').map(s => s.trim()).filter(Boolean);
      if (types.length) {
        if (filters.length) filters.push('AND');
        filters.push(['filetype', 'anyof'].concat(types));
      }
    }

    // Date created range
    if (p.createdFrom && p.createdTo) {
      if (filters.length) filters.push('AND');
      filters.push(['created', 'within', toSearchDate(p.createdFrom), toSearchDate(p.createdTo)]);
    } else if (p.createdFrom) {
      if (filters.length) filters.push('AND');
      filters.push(['created', 'onorafter', toSearchDate(p.createdFrom)]);
    } else if (p.createdTo) {
      if (filters.length) filters.push('AND');
      filters.push(['created', 'onorbefore', toSearchDate(p.createdTo)]);
    }

    return filters;
  };

  /**
   * Map a search.Result to the standard response object.
   * NOTE: 'documentsize' is returned by NetSuite in KB.
   */
  const mapResult = (result) => ({
    id:       result.id,
    name:     result.getValue('name') || ('file_' + result.id),
    folder:   result.getText('folder') || '',
    fileType: result.getText('filetype') || result.getValue('filetype') || '',
    size:     parseFloat(result.getValue('documentsize')) || 0,
    created:  formatCreated(result.getValue('created'))
  });

  /**
   * NetSuite search date/time values come back as strings like
   * '1/5/2026 3:45 pm' — normalize to YYYY-MM-DD for the client.
   */
  const formatCreated = (val) => {
    if (!val) return '';
    const datePart = String(val).split(' ')[0];
    const parts = datePart.split('/');
    if (parts.length !== 3) return datePart;
    return parts[2] + '-' + parts[0].padStart(2, '0') + '-' + parts[1].padStart(2, '0');
  };

  /**
   * Serve the filtered file list as JSON.
   * @param {Object} ctx  { request, response }
   */
  const serve = ({ request, response }) => {
    const p = request.parameters;
    log.debug({ title: 'PDC files.serve', details: 'folder=' + (p.folder || '') + ' | fileType=' + (p.fileType || '') + ' | createdFrom=' + (p.createdFrom || '') + ' | createdTo=' + (p.createdTo || '') });

    const folderIds = qh.parseIdList(p.folder);
    if (folderIds.length === 0) {
      qh.writeJsonResponse(response, { success: true, count: 0, files: [] });
      return;
    }

    const filters = buildFilters(p);
    log.debug({ title: 'PDC files.serve filters', details: JSON.stringify(filters) });

    const fileSearch = search.create({
      type: 'file',
      filters: filters,
      columns: [
        search.createColumn({ name: 'name', sort: search.Sort.ASC }),
        search.createColumn({ name: 'folder' }),
        search.createColumn({ name: 'filetype' }),
        search.createColumn({ name: 'documentsize' }),
        search.createColumn({ name: 'created' })
      ]
    });

    const reqRowBegin = parseInt(p.rowBegin, 10) || 0;
    const reqRowEnd   = parseInt(p.rowEnd, 10)   || 0;

    try {
      const pagedData  = fileSearch.runPaged({ pageSize: PAGE_SIZE });
      const totalCount = pagedData.count;

      log.debug({ title: 'PDC files.serve', details: 'totalCount=' + totalCount + ' | reqRowBegin=' + reqRowBegin + ' | reqRowEnd=' + reqRowEnd });

      const files = [];

      if (reqRowBegin > 0 && reqRowEnd > 0) {
        const startPage = Math.floor((reqRowBegin - 1) / PAGE_SIZE);
        const endPage   = Math.floor((reqRowEnd - 1) / PAGE_SIZE);

        for (let pi = startPage; pi <= endPage && pi < pagedData.pageRanges.length; pi++) {
          const page = pagedData.fetch({ index: pi });
          page.data.forEach((result, idx) => {
            const globalIdx = pi * PAGE_SIZE + idx + 1;
            if (globalIdx >= reqRowBegin && globalIdx <= reqRowEnd) {
              files.push(mapResult(result));
            }
          });
        }

        const result = { success: true, count: files.length, files: files };
        if (reqRowBegin === 1) result.totalCount = totalCount;
        log.debug({ title: 'PDC files.serve paged', details: 'rows ' + reqRowBegin + '-' + reqRowEnd + ' returned ' + files.length + ' total=' + totalCount });
        qh.writeJsonResponse(response, result);
      } else {
        pagedData.pageRanges.forEach((range) => {
          const remaining = runtime.getCurrentScript().getRemainingUsage();
          if (remaining < GOV_THRESHOLD) {
            log.audit({ title: 'PDC files.serve', details: 'Stopping — governance remaining: ' + remaining + ', rows so far: ' + files.length });
            return;
          }
          const page = pagedData.fetch({ index: range.index });
          page.data.forEach((result) => files.push(mapResult(result)));
        });

        log.debug({ title: 'PDC files.serve result', details: 'count=' + files.length });
        qh.writeJsonResponse(response, { success: true, count: files.length, files: files });
      }
    } catch (e) {
      log.error({ title: 'PDC files.serve SEARCH ERROR', details: e.message + '\nFilters: ' + JSON.stringify(filters) });
      qh.writeJsonResponse(response, { success: false, error: e.message || 'File search failed' });
    }
  };

  return { serve };
});
