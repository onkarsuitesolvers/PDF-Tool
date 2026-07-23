/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  PDC — Shared Query & Response Helper
 *  Small utilities shared by the folder/file search and lookups modules.
 * ─────────────────────────────────────────────────────────────────────────────
 */
define([], () => {

  /**
   * Parse a comma-separated parameter into an array of positive integers.
   * @param {string} raw  e.g. "42, 99, 7"
   * @returns {number[]}
   */
  const parseIdList = (raw) => {
    if (!raw) return [];
    return raw.split(',').map(x => parseInt(x.trim(), 10)).filter(Boolean);
  };

  /**
   * Write a JSON success / list response.
   */
  const writeJsonResponse = (response, payload) => {
    response.setHeader({ name: 'Content-Type', value: 'application/json' });
    response.write(JSON.stringify(payload));
  };

  return {
    parseIdList,
    writeJsonResponse
  };
});
