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
   * Fetch active customers sorted by label (companyname or entityid).
   * @returns {{ id: number, label: string }[]}
   */
  const fetchCustomers = () => {
    const customers = [];
    try {
      const sql = `
        SELECT id,
               CASE WHEN companyname IS NOT NULL AND companyname != ''
                    THEN companyname ELSE entityid END AS label
        FROM customer
        WHERE isinactive = 'F'
        ORDER BY label
      `;
      query.runSuiteQLPaged({ query: sql, params: [], pageSize: 2000 })
        .iterator().each((page) => {
          page.value.data.asMappedResults().forEach((row) => {
            customers.push({ id: row.id, label: row.label || `Customer ${row.id}` });
          });
          return true;
        });
    } catch (e) {
      log.error({ title: 'lookups:customers', details: e.message });
    }
    return customers;
  };

  /**
   * Serve the lookup data as a JSON API response (action=getLookups).
   * @param {Object} ctx  { response }
   */
  const serve = ({ response }) => {
    const subsidiaries = fetchSubsidiaries();
    const customers    = fetchCustomers();
    qh.writeJsonResponse(response, { success: true, subsidiaries, customers });
  };

  return {
    fetchSubsidiaries,
    fetchCustomers,
    serve
  };
});
