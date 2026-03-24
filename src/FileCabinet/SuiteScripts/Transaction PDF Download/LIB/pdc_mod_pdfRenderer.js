/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  PDC — PDF Renderer (action=getPDF)
 *  Renders a single transaction or invoice-group as a PDF binary stream.
 *
 *  GOVERNANCE: render.transaction costs 10 units.
 *  Each getPDF request is a separate Suitelet execution — budget resets.
 * ─────────────────────────────────────────────────────────────────────────────
 */
define(
  ['N/render', 'N/record'],
  (render, record) => {

  /**
   * Serve a single PDF for a transaction or invoice group.
   * @param {Object} ctx  { request, response }
   */
  const serve = ({ request, response }) => {
    const id     = parseInt(request.parameters.id, 10);
    const tranId = (request.parameters.tranid || `invoice_${id}`).replace(/[^a-zA-Z0-9_\-]/g, '_');
    const type   = request.parameters.type || '';

    let pdfFile;

    if (type === 'invoicegroups') {
      // Invoice Groups are not standard transactions — render.transaction()
      // does not support them. Use the Advanced PDF/HTML template (ID 462)
      // with a TemplateRenderer.
      const groupRecord = record.load({ type: 'invoicegroup', id: id });
      const renderer    = render.create();
      renderer.setTemplateById(462);
      renderer.addRecord({ templateName: 'record', record: groupRecord });
      pdfFile = renderer.renderAsPdf();
    } else {
      pdfFile = render.transaction({
        entityId:  id,
        printMode: render.PrintMode.PDF
      });
    }

    response.setHeader({ name: 'Content-Type',              value: 'application/pdf' });
    response.setHeader({ name: 'Content-Disposition',       value: `inline; filename="${tranId}.pdf"` });
    response.setHeader({ name: 'Access-Control-Allow-Origin', value: '*' });
    response.writeFile({ file: pdfFile, isInline: true });
  };

  return { serve };
});
