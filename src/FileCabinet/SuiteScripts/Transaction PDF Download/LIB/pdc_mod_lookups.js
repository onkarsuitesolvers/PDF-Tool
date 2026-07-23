/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  PDC — Lookups (action=getLookups + inline page data)
 *  Fetches File Cabinet folder dropdown data.
 *  Used both by the getLookups API action and by servePage (server-side embed).
 * ─────────────────────────────────────────────────────────────────────────────
 */
define(
  ['N/search', 'N/log', './pdc_mod_queryHelper'],
  (search, log, qh) => {

  /**
   * Fetch all File Cabinet folders, sorted by full path.
   * Uses N/search (folder record type) rather than SuiteQL since folder
   * hierarchy is not reliably exposed as a SuiteQL table.
   * Label is built as the full breadcrumb path, e.g. "Documents / Invoices".
   * @returns {{ id: number, label: string }[]}
   */
  const fetchFolders = () => {
    const raw = {}; // id -> { name, parentId }
    try {
      const folderSearch = search.create({
        type: 'folder',
        columns: [
          search.createColumn({ name: 'name' }),
          search.createColumn({ name: 'parent' })
        ]
      });

      const pagedData = folderSearch.runPaged({ pageSize: 1000 });
      pagedData.pageRanges.forEach((range) => {
        const page = pagedData.fetch({ index: range.index });
        page.data.forEach((result) => {
          raw[result.id] = {
            name:     result.getValue('name') || ('Folder ' + result.id),
            parentId: result.getValue('parent') || null
          };
        });
      });
    } catch (e) {
      log.error({ title: 'lookups:folders', details: e.message });
      return [];
    }

    const buildPath = (id) => {
      const segments = [];
      let curId = id;
      let guard = 0;
      while (curId && raw[curId] && guard < 25) {
        segments.unshift(raw[curId].name);
        curId = raw[curId].parentId;
        guard++;
      }
      return segments.join(' / ');
    };

    const folders = Object.keys(raw).map((id) => ({
      id:    parseInt(id, 10),
      label: buildPath(id)
    }));

    folders.sort((a, b) => a.label.localeCompare(b.label));
    return folders;
  };

  /**
   * Serve the lookup data as a JSON API response (action=getLookups).
   * @param {Object} ctx  { response }
   */
  const serve = ({ response }) => {
    const folders = fetchFolders();
    qh.writeJsonResponse(response, { success: true, folders });
  };

  return {
    fetchFolders,
    serve
  };
});
