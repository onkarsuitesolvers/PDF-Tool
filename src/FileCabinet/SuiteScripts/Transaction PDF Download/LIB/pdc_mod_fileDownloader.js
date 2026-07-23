/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  PDC — File Cabinet File Downloader (action=getFile)
 *  Streams a single File Cabinet file back as its original binary content,
 *  used by Folder-mode downloads (as opposed to action=getPDF which renders
 *  transaction PDFs).
 * ─────────────────────────────────────────────────────────────────────────────
 */
define(
  ['N/file', 'N/log'],
  (file, log) => {

  // Maps N/file Type enum values to MIME types for the Content-Type header.
  const MIME_MAP = {
    PDF:        'application/pdf',
    WORD:       'application/msword',
    EXCEL:      'application/vnd.ms-excel',
    POWERPOINT: 'application/vnd.ms-powerpoint',
    CSV:        'text/csv',
    PLAINTEXT:  'text/plain',
    HTMLDOC:    'text/html',
    XMLDOC:     'application/xml',
    JSON:       'application/json',
    JPGIMAGE:   'image/jpeg',
    PJPGIMAGE:  'image/jpeg',
    PNGIMAGE:   'image/png',
    GIFIMAGE:   'image/gif',
    BMPIMAGE:   'image/bmp',
    TIFFIMAGE:  'image/tiff',
    ZIP:        'application/zip',
    GZIP:       'application/gzip',
    TAR:        'application/x-tar'
  };

  /**
   * Serve a single File Cabinet file for download.
   * @param {Object} ctx  { request, response }
   */
  const serve = ({ request, response }) => {
    const id = parseInt(request.parameters.id, 10);
    const fileObj = file.load({ id });

    const mime     = MIME_MAP[fileObj.fileType] || 'application/octet-stream';
    const safeName = (fileObj.name || ('file_' + id)).replace(/["\r\n]/g, '_');

    log.debug({ title: 'PDC fileDownloader.serve', details: `id=${id}, name=${safeName}, fileType=${fileObj.fileType}` });

    response.setHeader({ name: 'Content-Type', value: mime });
    response.setHeader({ name: 'Content-Disposition', value: `attachment; filename="${safeName}"` });
    response.setHeader({ name: 'Access-Control-Allow-Origin', value: '*' });
    response.writeFile({ file: fileObj, isInline: false });
  };

  return { serve };
});
