/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  PDC — Lookups (action=getLookups + inline page data)
 *  Fetches subsidiary, customer, department and folder dropdown data.
 *  Used both by the getLookups API action and by servePage (server-side embed).
 * ─────────────────────────────────────────────────────────────────────────────
 */
define(
  ['N/query', 'N/search', 'N/log', './pdc_mod_queryHelper'],
  (query, search, log, qh) => {

  /**
   * Fetch active subsidiaries sorted by name.
   * @returns {{ id: number, label: string }[]}
   */
  const fetchSubsidiaries = () => {
    const subsidiaries = [];
    try {
      const sql = `
        SELECT id, name
        FROM subsidiary
        WHERE isinactive = 'F'
        ORDER BY name
      `;
      query.runSuiteQLPaged({ query: sql, params: [], pageSize: 1000 })
        .iterator().each((page) => {
          page.value.data.asMappedResults().forEach((row) => {
            subsidiaries.push({ id: row.id, label: row.name });
          });
          return true;
        });
    } catch (e) {
      log.error({ title: 'lookups:subsidiaries', details: e.message });
    }
    return subsidiaries;
  };

  /**
   * Fetch active customers sorted by companyname (falling back to entityid).
   * Label format: "CompanyName (EntityID)".
   * @returns {{ id: number, label: string }[]}
   */
  const fetchCustomers = () => {
    const customers = [];
    try {
      const sql = `
        SELECT id, entityid, companyname
        FROM customer
        WHERE isinactive = 'F'
        ORDER BY CASE WHEN companyname IS NOT NULL AND companyname != ''
                      THEN companyname ELSE entityid END
      `;
      query.runSuiteQLPaged({ query: sql, params: [], pageSize: 2000 })
        .iterator().each((page) => {
          page.value.data.asMappedResults().forEach((row) => {
            const name = row.companyname ? String(row.companyname).trim() : '';
            const eid  = row.entityid ? String(row.entityid).trim() : '';
            const label = name
              ? (eid ? name + ' (' + eid + ')' : name)
              : (eid || 'Customer ' + row.id);
            customers.push({ id: row.id, label: label });
          });
          return true;
        });
    } catch (e) {
      log.error({ title: 'lookups:customers', details: e.message });
    }
    return customers;
  };

  /**
   * Fetch active departments sorted by name.
   * @returns {{ id: number, label: string }[]}
   */
  const fetchDepartments = () => {
    const departments = [];
    try {
      const sql = `
        SELECT id, name
        FROM department
        WHERE isinactive = 'F'
        ORDER BY name
      `;
      query.runSuiteQLPaged({ query: sql, params: [], pageSize: 1000 })
        .iterator().each((page) => {
          page.value.data.asMappedResults().forEach((row) => {
            departments.push({ id: row.id, label: row.name });
          });
          return true;
        });
    } catch (e) {
      log.error({ title: 'lookups:departments', details: e.message });
    }
    return departments;
  };

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
    const subsidiaries = fetchSubsidiaries();
    const customers    = fetchCustomers();
    const departments  = fetchDepartments();
    const folders      = fetchFolders();
    qh.writeJsonResponse(response, { success: true, subsidiaries, customers, departments, folders });
  };

  return {
    fetchSubsidiaries,
    fetchCustomers,
    fetchDepartments,
    fetchFolders,
    serve
  };
});
