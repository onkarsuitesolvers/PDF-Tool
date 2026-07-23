/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  PDC — Lookups (action=getLookups + inline page data)
 *  Fetches File Cabinet folder data for the client-side folder tree.
 *  Used both by the getLookups API action and by servePage (server-side embed).
 * ─────────────────────────────────────────────────────────────────────────────
 */
define(
  ['N/search', 'N/log', './pdc_mod_queryHelper'],
  (search, log, qh) => {

  /**
   * Fetch all File Cabinet folders as a flat list with parent pointers.
   * The client rebuilds the hierarchy into a tree (rather than the server
   * flattening it into breadcrumb strings) so the UI can render an
   * expandable/collapsible folder tree with multi-select.
   * Uses N/search (folder record type) rather than SuiteQL since folder
   * hierarchy is not reliably exposed as a SuiteQL table.
   * @returns {{ id: number, name: string, parentId: number|null }[]}
   */
  const fetchFolders = () => {
    const folders = [];
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
          folders.push({
            id:       parseInt(result.id, 10),
            name:     result.getValue('name') || ('Folder ' + result.id),
            parentId: result.getValue('parent') ? parseInt(result.getValue('parent'), 10) : null
          });
        });
      });
    } catch (e) {
      log.error({ title: 'lookups:folders', details: e.message });
      return [];
    }

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
