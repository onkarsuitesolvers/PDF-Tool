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
  ['N/search', 'N/log', 'N/cache', './pdc_mod_queryHelper'],
  (search, log, cache, qh) => {

  // Folder structure rarely changes, but every page load/click was re-running
  // a full-account folder search from scratch (each Suitelet request is a
  // fresh execution, so nothing persists in memory between them). Cache the
  // result so the search runs once per TTL window instead of on every hit.
  const CACHE_KEY = 'folders';
  const CACHE_TTL = 3600; // seconds

  const folderCache = cache.getCache({ name: 'pdc_folder_lookup', scope: cache.Scope.PROTECTED });

  /**
   * Run the actual folder search. Used as the cache loader.
   * @returns {{ id: number, name: string, parentId: number|null }[]}
   */
  const searchFolders = () => {
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
    }

    return folders;
  };

  /**
   * Fetch all File Cabinet folders as a flat list with parent pointers.
   * The client rebuilds the hierarchy into a tree (rather than the server
   * flattening it into breadcrumb strings) so the UI can render an
   * expandable/collapsible folder tree with multi-select.
   * Uses N/search (folder record type) rather than SuiteQL since folder
   * hierarchy is not reliably exposed as a SuiteQL table.
   * Served from N/cache after the first run within the TTL window.
   * @returns {{ id: number, name: string, parentId: number|null }[]}
   */
  const fetchFolders = () => {
    try {
      return folderCache.get({
        key:    CACHE_KEY,
        loader: searchFolders,
        ttl:    CACHE_TTL
      }) || [];
    } catch (e) {
      // N/cache rejects any value over 512 KB. Large accounts can outgrow
      // that cap, so fall back to an uncached (but working) search instead
      // of failing the whole page.
      log.error({ title: 'lookups:fetchFolders', details: 'Cache write failed, serving uncached: ' + e.message });
      return searchFolders();
    }
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
