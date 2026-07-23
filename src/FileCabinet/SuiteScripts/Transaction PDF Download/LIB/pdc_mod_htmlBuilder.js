/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  PDC — HTML Page Builder (orchestrator)
 *  Assembles the full HTML page from sub-templates:
 *    - pdc_tpl_styles        → CSS design tokens & styles
 *    - pdc_tpl_markup        → Sidebar, filters, table, modal HTML
 *    - pdc_tpl_clientScript  → Browser-side JS (search, download, modal)
 * ─────────────────────────────────────────────────────────────────────────────
 */
define(
  [
    './pdc_tpl_styles',
    './pdc_tpl_markup',
    './pdc_tpl_clientScript'
  ],
  (styles, markup, clientScript) => {

  /**
   * Build the complete HTML page string for the Print & Download Center.
   *
   * @param {string} baseUrl           Suitelet base URL (for client-side fetch calls)
   * @param {string} folderDataFieldId ID of the hidden form field holding the
   *                                   folder lookup JSON (kept off this string
   *                                   so this field's own value stays small —
   *                                   see pdc_SL_main.js FOLDER_DATA_FIELD_ID)
   * @returns {string}  Full HTML document
   */
  const buildHTML = (baseUrl, folderDataFieldId) => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Print &amp; Download Center — NetSuite</title>

<style>
${styles.getStyles()}
</style>
</head>

${markup.getMarkup()}

<script>
${clientScript.getScript(baseUrl, folderDataFieldId)}
</script>

</body>
</html>`;
  };

  return { buildHTML };
});
