/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  BULK INVOICE PDF DOWNLOADER  —  Print & Download Center
 *  Main Suitelet entry point — routes requests to specialised modules.
 *
 *  ACTIONS
 *  ───────
 *  (none / page)        → Serve the HTML/JS UI page       [pdc_mod_htmlBuilder]
 *  action=getInvoices   → SuiteQL invoice search → JSON    [pdc_mod_invoices]
 *  action=getCreditMemos→ SuiteQL credit memo search→JSON  [pdc_mod_creditMemos]
 *  action=getInvoiceGroups → N/search invoice group search → JSON [pdc_mod_invoiceGroups]
 *  action=getLookups    → Subsidiary + customer + folder lists→JSON [pdc_mod_lookups]
 *  action=getPDF        → Render one transaction PDF        [pdc_mod_pdfRenderer]
 *  action=getFiles      → N/search File Cabinet file search → JSON [pdc_mod_files]
 *  action=getFile       → Stream one File Cabinet file       [pdc_mod_fileDownloader]
 *
 *  MODULE LAYOUT
 *  ─────────────
 *  pdc_SL_main.js              ← this file (router / entry point)
 *  pdc_mod_queryHelper.js      ← shared filter builder & paging utilities
 *  pdc_mod_invoices.js         ← getInvoices action
 *  pdc_mod_creditMemos.js      ← getCreditMemos action
 *  pdc_mod_invoiceGroups.js    ← getInvoiceGroups action
 *  pdc_mod_lookups.js          ← getLookups action + fetchCustomers/fetchSubsidiaries/fetchFolders
 *  pdc_mod_pdfRenderer.js      ← getPDF action (render.transaction / invoicegroup)
 *  pdc_mod_files.js            ← getFiles action (File Cabinet file search, Folder mode)
 *  pdc_mod_fileDownloader.js   ← getFile action (stream one File Cabinet file)
 *  pdc_mod_htmlBuilder.js      ← page action — assembles full HTML from templates
 *  pdc_tpl_styles.js           ← CSS template (design tokens, layout, components)
 *  pdc_tpl_markup.js           ← HTML body template (sidebar, filters, table, modal)
 *  pdc_tpl_clientScript.js     ← Client-side JS template (search, download, etc.)
 *
 *  GOVERNANCE NOTE
 *  ───────────────
 *  Each getPDF request is a separate Suitelet execution — governance resets.
 *  render.transaction costs 10 units. Suitelet budget is 10,000 — plenty.
 *
 *  DEPLOYMENT CHECKLIST
 *  ─────────────────────
 *  1. Upload ALL files to the same File Cabinet folder.
 *  2. Create a Suitelet deployment pointing to THIS script (pdc_SL_main.js).
 *  3. Set Audience → All Roles (or restrict as needed).
 *  4. Optionally enable "Available Without Login" for external access.
 * ─────────────────────────────────────────────────────────────────────────────
 */

define(
  [
    'N/runtime',
    'N/log',
    'N/ui/serverWidget',
    '../LIB/pdc_mod_invoices',
    '../LIB/pdc_mod_creditMemos',
    '../LIB/pdc_mod_invoiceGroups',
    '../LIB/pdc_mod_lookups',
    '../LIB/pdc_mod_pdfRenderer',
    '../LIB/pdc_mod_files',
    '../LIB/pdc_mod_fileDownloader',
    '../LIB/pdc_mod_htmlBuilder'
  ],
  (runtime, log, serverWidget, invoices, creditMemos, invoiceGroups, lookups, pdfRenderer, files, fileDownloader, htmlBuilder) => {

  // ─── ACTION ROUTER ────────────────────────────────────────────────────────────

  /**
   * Map of action parameter values to their handler modules.
   * Each handler receives the full SuiteScript context { request, response }.
   */
  const ACTION_MAP = {
    getInvoices:      invoices.serve,
    getCreditMemos:   creditMemos.serve,
    getInvoiceGroups: invoiceGroups.serve,
    getLookups:       lookups.serve,
    getPDF:           pdfRenderer.serve,
    getFiles:         files.serve,
    getFile:          fileDownloader.serve
  };

  // ─── ENTRY POINT ──────────────────────────────────────────────────────────────

  const onRequest = (ctx) => {
    const action = ctx.request.parameters.action || 'page';

    log.debug({ title: 'PDC onRequest', details: 'action=' + action + ' | status=' + (ctx.request.parameters.status || '(none)') + ' | customer=' + (ctx.request.parameters.customer || '') + ' | subsidiary=' + (ctx.request.parameters.subsidiary || '') });

    try {
      // Dispatch to the appropriate module handler
      const handler = ACTION_MAP[action];
      if (handler) {
        return handler(ctx);
      }

      // Default: serve the HTML UI page
      return servePage(ctx);

    } catch (e) {
      log.error({
        title:   'BulkInvoiceDownload Error',
        details: `[action=${action}] ${e.message}\n${e.stack}`
      });
      ctx.response.setHeader({ name: 'Content-Type', value: 'application/json' });
      ctx.response.write(JSON.stringify({ success: false, error: e.message }));
    }
  };

  // ─── PAGE HANDLER ─────────────────────────────────────────────────────────────

  /**
   * Serve the full HTML page.
   * Lookup data is fetched server-side so the page ships with data ready —
   * avoids a client-side round-trip on initial load.
   */
  const servePage = ({ response }) => {
    const script  = runtime.getCurrentScript();
    const baseUrl = `/app/site/hosting/scriptlet.nl?script=${script.id}&deploy=${script.deploymentId}`;

    // Pre-fetch lookup data server-side
    const subsidiaries = lookups.fetchSubsidiaries();
    const customers    = lookups.fetchCustomers();
    const departments  = lookups.fetchDepartments();
    const folders      = lookups.fetchFolders();

    const form = serverWidget.createForm({ title: 'Print & Download Center', hideNavBar: false });

    const htmlField = form.addField({
      id:    'custpage_html_content',
      type:  serverWidget.FieldType.INLINEHTML,
      label: 'Content'
    });

    htmlField.defaultValue = htmlBuilder.buildHTML(baseUrl, customers, subsidiaries, departments, folders);

    response.writePage(form);
  };

  // ─── EXPORT ───────────────────────────────────────────────────────────────────

  return { onRequest };
});
