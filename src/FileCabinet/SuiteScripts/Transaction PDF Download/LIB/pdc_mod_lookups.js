/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  PDC — Lookups (action=getLookups + inline page data)
 *  Fetches subsidiary and customer dropdown data.
 *  Used both by the getLookups API action and by servePage (server-side embed).
 * ─────────────────────────────────────────────────────────────────────────────
 */
define(
  ['N/query', 'N/log', './pdc_mod_queryHelper'],
  (query, log, qh) => {

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
   * Serve the lookup data as a JSON API response (action=getLookups).
   * @param {Object} ctx  { response }
   */
  const serve = ({ response }) => {
    const subsidiaries = fetchSubsidiaries();
    const customers    = fetchCustomers();
    const departments  = fetchDepartments();
    qh.writeJsonResponse(response, { success: true, subsidiaries, customers, departments });
  };

  return {
    fetchSubsidiaries,
    fetchCustomers,
    fetchDepartments,
    serve
  };
});
