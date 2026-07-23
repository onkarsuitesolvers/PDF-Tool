/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 *
 * PDC — CSS Styles Template
 * Design tokens and styles for the PDF Download Center UI.
 */
define([], () => {

  /**
   * @returns {string} Complete CSS stylesheet content
   */
  const getStyles = () => `
:root {
  --bg:            #F4F6FB;
  --surface:       #FFFFFF;
  --surface-alt:   #F8FAFD;
  --border:        #E2E7F0;
  --border-strong: #C9D2E3;
  --ink:           #131B33;
  --ink-soft:      #4C5670;
  --ink-faint:     #8892AA;
  --brand:         #3D5AFE;
  --brand-dark:    #2A3FCB;
  --brand-pale:    #EAEDFF;
  --accent:        #F5A524;
  --accent-dark:   #D68A0E;
  --accent-pale:   #FFF3DF;
  --success:       #16A34A;
  --success-pale:  #DCFCE7;
  --danger:        #E11D48;
  --danger-pale:   #FEE2E5;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg);
  color: var(--ink);
  min-height: 100vh;
  overflow-x: hidden;
  font-size: 15px;
}

/* ════════════════════════════════════
   APP SHELL
════════════════════════════════════ */
.app {
  max-width: 1520px;
  margin: 0 auto;
  padding: 24px 28px 40px;
  display: flex; flex-direction: column; gap: 18px;
}

.topbar {
  display: flex; align-items: center; justify-content: space-between;
}
.topbar-left { display: flex; align-items: center; gap: 13px; }
.brand-mark {
  width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
  background: linear-gradient(135deg, var(--brand), var(--brand-dark));
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 14px #3D5AFE38;
}
.topbar-title { font-size: 21px; font-weight: 800; color: var(--ink); letter-spacing: -0.3px; }
.topbar-sub   { font-size: 13.5px; font-weight: 600; color: var(--ink-faint); margin-top: 2px; }

.layout { display: flex; align-items: flex-start; gap: 20px; }

.main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 18px; }

/* ── Shared panel ── */
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: 0 1px 2px rgba(19,27,51,0.04), 0 8px 24px rgba(19,27,51,0.03);
}

/* ════════════════════════════════════
   SIDEBAR — FOLDER TREE
════════════════════════════════════ */
.sidebar { width: 300px; flex-shrink: 0; position: sticky; top: 20px; }
.tree-panel { display: flex; flex-direction: column; overflow: hidden; }

.panel-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 15px 16px 10px;
}
.panel-title { font-size: 15px; font-weight: 800; color: var(--ink); }
.panel-actions { display: flex; align-items: center; gap: 6px; }
.link-btn {
  background: none; border: none; padding: 0; cursor: pointer;
  font-size: 12.5px; font-weight: 700; color: var(--brand);
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
}
.link-btn:hover { text-decoration: underline; }
.dot-sep { color: var(--ink-faint); font-size: 12px; }

.tree-search {
  position: relative; margin: 0 16px 10px;
}
.tree-search-icon {
  position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
  color: var(--ink-faint); pointer-events: none;
}
.tree-search input {
  width: 100%; padding: 7px 10px 7px 30px;
  border: 1.5px solid var(--border); border-radius: 9px;
  font-size: 13.5px; font-weight: 600; color: var(--ink);
  background: var(--surface-alt); outline: none;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  transition: border-color 0.15s;
}
.tree-search input:focus { border-color: var(--brand); background: var(--surface); }

.tree-summary {
  padding: 0 16px 10px; margin-bottom: 4px;
  font-size: 12.5px; font-weight: 700; color: var(--ink-soft);
  border-bottom: 1px solid var(--border);
  padding-bottom: 10px;
}

.tree-scroll {
  max-height: calc(100vh - 270px);
  min-height: 200px;
  overflow-y: auto;
  padding: 6px 8px 16px;
}
.tree-loading, .tree-empty {
  padding: 22px 12px; text-align: center;
  font-size: 13px; font-weight: 600; color: var(--ink-faint);
}

.tree-row {
  display: flex; align-items: center; gap: 5px;
  padding: 6px 8px; border-radius: 8px;
  font-size: 13.5px; font-weight: 600; color: var(--ink);
  user-select: none; cursor: default;
  transition: background 0.12s;
}
.tree-row:hover { background: var(--surface-alt); }
.tree-toggle {
  width: 16px; height: 16px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  color: var(--ink-faint); cursor: pointer; border-radius: 4px;
  transition: transform 0.15s;
}
.tree-toggle:hover { background: var(--border); }
.tree-toggle.tree-expanded { transform: rotate(90deg); }
.tree-toggle-empty { visibility: hidden; cursor: default; }
.tree-toggle-empty:hover { background: none; }
.tree-checkbox {
  width: 14px; height: 14px; flex-shrink: 0;
  accent-color: var(--brand); cursor: pointer;
}
.tree-folder-icon { font-size: 13px; flex-shrink: 0; }
.tree-label {
  flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  cursor: pointer;
}
.tree-row.tree-match .tree-label { color: var(--brand-dark); }

/* ════════════════════════════════════
   FILTERS PANEL
════════════════════════════════════ */
.filters-panel { padding: 16px 20px; }
.filters-row { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
.filters-hint { font-size: 12.5px; font-weight: 600; color: var(--ink-faint); margin-top: 10px; }
.filter-group { display: flex; flex-direction: column; gap: 5px; }
.filter-label {
  font-size: 12.5px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.6px; color: var(--ink-faint);
}
.filter-spacer { flex: 1; }
.filter-input {
  padding: 9px 12px; border: 1.5px solid var(--border);
  border-radius: 10px; font-size: 14.5px; font-weight: 600;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  color: var(--ink); background: var(--surface-alt);
  outline: none; transition: border-color 0.18s, box-shadow 0.18s;
  min-width: 130px; min-height: 38px; box-sizing: border-box;
}
.filter-input:focus { border-color: var(--brand); box-shadow: 0 0 0 3px #3D5AFE14; }

/* ── Buttons ── */
.btn {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 10px 20px; border-radius: 10px;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  font-size: 15px; font-weight: 700;
  cursor: pointer; border: none; transition: all 0.18s;
}
.btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none !important; }
.btn-primary {
  background: linear-gradient(135deg, var(--brand), var(--brand-dark));
  color: #fff; box-shadow: 0 4px 14px #3D5AFE30;
}
.btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px #3D5AFE40; }
.btn-amber {
  background: linear-gradient(135deg, var(--accent), #F7BB55);
  color: #3A2A00; box-shadow: 0 4px 14px #F5A52435;
}
.btn-amber:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px #F5A52448; }
.btn-outline {
  background: transparent; border: 1.5px solid var(--border);
  color: var(--ink-soft);
}
.btn-outline:hover { border-color: var(--brand); color: var(--brand-dark); }
.btn-ghost { background: transparent; color: var(--ink-faint); }
.btn-ghost:hover { color: var(--ink-soft); }
.btn-success {
  background: linear-gradient(135deg, var(--success), #22B355);
  color: #fff; box-shadow: 0 4px 14px #16A34A28;
}
.btn-success:hover:not(:disabled) { transform: translateY(-1px); }
.btn-sm { padding: 7px 14px; font-size: 14px; font-weight: 700; border-radius: 8px; }

/* ── Stats row ── */
.stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.stat-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 16px; padding: 16px 18px;
  display: flex; align-items: center; gap: 13px;
  box-shadow: 0 1px 2px rgba(19,27,51,0.04);
  transition: transform 0.18s, box-shadow 0.18s;
}
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(19,27,51,0.07); }
.stat-icon {
  width: 40px; height: 40px; border-radius: 11px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.si-brand { background: var(--brand-pale); }
.si-green { background: var(--success-pale); }
.si-rose  { background: var(--danger-pale); }
.si-amber { background: var(--accent-pale); }
.stat-val { font-size: 24px; font-weight: 800; color: var(--ink); line-height: 1; }
.stat-lbl {
  font-size: 12.5px; color: var(--ink-faint); margin-top: 3px;
  text-transform: uppercase; letter-spacing: 0.6px; font-weight: 700;
}

/* ── Table ── */
.table-container { overflow: hidden; display: none; }
.table-container.show { display: block; }
.table-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 15px 20px 13px; border-bottom: 1px solid var(--border);
  background: var(--surface-alt);
}
.table-title { font-size: 17px; font-weight: 800; color: var(--ink); }
.table-meta { font-size: 13.5px; font-weight: 600; color: var(--ink-faint); margin-top: 2px; }
.table-actions { display: flex; gap: 8px; align-items: center; }

.table-scroll { max-height: 520px; overflow-y: auto; overflow-x: auto; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; min-width: 960px; }
thead tr { background: var(--surface-alt); border-bottom: 1px solid var(--border); }
th {
  padding: 11px 14px 10px; text-align: left;
  font-size: 12.5px; font-weight: 700; letter-spacing: 0.6px;
  text-transform: uppercase; color: var(--ink-faint);
  position: sticky; top: 0; background: var(--surface-alt);
  border-bottom: 1px solid var(--border);
}
th:first-child { padding-left: 20px; }
th:last-child  { padding-right: 20px; text-align: left; }
tbody tr { border-bottom: 1px solid var(--border); transition: background 0.12s; }
tbody tr:last-child { border-bottom: none; }
tbody tr:hover { background: var(--surface-alt); }
tbody tr.row-active { background: var(--brand-pale); }
tbody tr.row-ok     { background: var(--success-pale); }
tbody tr.row-err    { background: var(--danger-pale); }
td { padding: 12px 14px; font-size: 14.5px; font-weight: 600; color: var(--ink); vertical-align: middle; text-align: left; }
td:first-child { padding-left: 20px; }
td:last-child  { padding-right: 20px; text-align: left; }
td:nth-child(4) { word-break: break-word; overflow-wrap: break-word; }
td:nth-child(5) { word-break: break-word; overflow-wrap: break-word; }
td:nth-child(6) { white-space: nowrap; }

/* ── Pagination controls ── */
.pagination-controls {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 20px; border-top: 1px solid var(--border);
  background: var(--surface-alt);
  gap: 12px; flex-wrap: wrap;
}
.pg-rows-wrap { display: flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 600; color: var(--ink-soft); }
.pg-rows-select {
  padding: 4px 8px; border-radius: 8px; border: 1px solid var(--border);
  background: var(--surface); color: var(--ink); font-size: 13.5px; font-weight: 600;
  cursor: pointer; outline: none;
}
.pg-rows-select:focus { border-color: var(--brand); box-shadow: 0 0 0 2px #3D5AFE20; }
.pg-rows-input {
  width: 56px; padding: 4px 8px; border-radius: 8px; border: 1px solid var(--border);
  background: var(--surface); color: var(--ink); font-size: 13.5px; font-weight: 600;
  text-align: center; outline: none;
}
.pg-rows-input:focus { border-color: var(--brand); box-shadow: 0 0 0 2px #3D5AFE20; }
.pg-info { font-size: 13.5px; font-weight: 600; color: var(--ink-faint); white-space: nowrap; }
.pg-nav { display: flex; align-items: center; gap: 4px; }
.pg-btn {
  min-width: 32px; height: 32px; padding: 0 8px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 8px; border: 1px solid var(--border);
  background: var(--surface); color: var(--ink-soft);
  font-size: 13.5px; font-weight: 700; cursor: pointer;
  transition: all 0.15s;
}
.pg-btn:hover:not(:disabled):not(.pg-active) { background: var(--surface-alt); border-color: var(--brand); color: var(--brand-dark); }
.pg-btn:disabled { opacity: 0.4; cursor: default; }
.pg-active { background: var(--brand); color: #fff; border-color: var(--brand); font-weight: 700; }
.pg-ellipsis {
  min-width: 32px; height: 32px;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 13px; color: var(--ink-faint);
}

.cb-wrap { display: flex; align-items: center; }
input[type="checkbox"] { width: 15px; height: 15px; accent-color: var(--brand); cursor: pointer; }
.type-label {
  display: inline-block; padding: 2px 8px; border-radius: 6px;
  font-size: 12.5px; font-weight: 700; letter-spacing: 0.3px;
  background: var(--brand-pale); color: var(--brand-dark);
  white-space: nowrap;
}
.tran-id { font-weight: 700; color: var(--brand-dark); font-size: 14.5px; }

/* Row download status */
.dl-status { display: flex; align-items: center; gap: 6px; justify-content: flex-start; font-size: 13.5px; font-weight: 700; }
.status-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.dot-pending { background: var(--ink-faint); }
.dot-ok      { background: var(--success); }
.dot-err     { background: var(--danger); }
.dot-active  { background: var(--brand); animation: pulseDot 1s ease infinite; }
@keyframes pulseDot { 0%,100%{ opacity:1; } 50%{ opacity:0.3; } }

/* ── Empty state ── */
.empty-state { display: none; text-align: center; padding: 60px 30px; }
.empty-state.show { display: block; }
.empty-icon { font-size: 46px; margin-bottom: 12px; }
.empty-text { font-size: 17px; color: var(--ink-soft); font-weight: 800; }
.empty-sub  { font-size: 14px; font-weight: 600; color: var(--ink-faint); margin-top: 6px; }

/* ── Per-row action buttons ── */
.row-actions { display: flex; align-items: center; gap: 5px; justify-content: flex-start; }
.icon-btn {
  width: 30px; height: 30px; border-radius: 8px;
  border: 1.5px solid var(--border); background: transparent;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  color: var(--ink-faint); transition: all 0.15s; flex-shrink: 0;
}
.icon-btn:hover         { background: var(--surface-alt); border-color: var(--brand); color: var(--brand-dark); }
.icon-btn.dl:hover      { background: var(--brand-pale); border-color: var(--brand); color: var(--brand-dark); }
.icon-btn.preview:hover { background: var(--accent-pale); border-color: var(--accent); color: var(--accent-dark); }

/* ════════════════════════════════════
   MULTISELECT DROPDOWN (File Type)
════════════════════════════════════ */
.ms-wrap { position: relative; min-width: 220px; }
.ms-trigger {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  min-height: 38px; padding: 4px 32px 4px 10px;
  border: 1.5px solid var(--border); border-radius: 10px;
  background: var(--surface-alt); cursor: pointer;
  transition: border-color 0.18s, box-shadow 0.18s;
  position: relative;
}
.ms-trigger:focus-within,
.ms-wrap.open .ms-trigger { border-color: var(--brand); box-shadow: 0 0 0 3px #3D5AFE14; }
.ms-trigger .ms-arrow {
  position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
  pointer-events: none; color: var(--ink-faint); transition: transform 0.18s;
}
.ms-wrap.open .ms-trigger .ms-arrow { transform: translateY(-50%) rotate(180deg); }
.ms-placeholder {
  font-size: 14px; font-weight: 600; color: var(--ink-faint);
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; user-select: none;
  white-space: nowrap;
}
.ms-pill {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 7px 2px 8px; border-radius: 6px;
  background: var(--brand-pale); border: 1px solid #C9D2FF;
  font-size: 13px; font-weight: 700; color: var(--brand-dark);
  white-space: nowrap; max-width: 130px;
}
.ms-pill span { overflow: hidden; text-overflow: ellipsis; max-width: 110px; }
.ms-pill-remove { cursor: pointer; color: var(--brand-dark); opacity: 0.6; display: flex; align-items: center; flex-shrink: 0; transition: opacity 0.15s; }
.ms-pill-remove:hover { opacity: 1; }
.ms-pill-more {
  font-size: 11px; color: var(--ink-faint); white-space: nowrap;
  padding: 2px 6px; background: var(--surface-alt); border-radius: 6px; border: 1px solid var(--border);
}
.ms-dropdown {
  position: absolute; top: calc(100% + 5px); left: 0; right: 0;
  background: var(--surface); border: 1.5px solid var(--border);
  border-radius: 12px; box-shadow: 0 8px 32px rgba(19,27,51,0.14);
  z-index: 300; overflow: hidden;
  display: none !important; visibility: hidden;
  text-align: left; direction: ltr;
}
.ms-wrap.open .ms-dropdown { display: block !important; visibility: visible; }
.ms-search-wrap { padding: 8px 10px; border-bottom: 1px solid var(--border); background: var(--surface-alt); }
.ms-search {
  width: 100%; padding: 7px 10px 7px 30px;
  border: 1.5px solid var(--border); border-radius: 8px;
  font-size: 14px; font-weight: 600; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  color: var(--ink); background: var(--surface);
  outline: none; transition: border-color 0.18s;
}
.ms-search:focus { border-color: var(--brand); }
.ms-search-icon { position: absolute; left: 19px; top: 50%; transform: translateY(-50%); color: var(--ink-faint); pointer-events: none; }
.ms-search-box { position: relative; }
.ms-list { max-height: 200px; overflow-y: auto; padding: 4px 0; }
.ms-option {
  display: flex; align-items: center; justify-content: flex-start; gap: 10px;
  padding: 8px 12px; cursor: pointer;
  font-size: 14.5px; font-weight: 600; color: var(--ink);
  transition: background 0.12s; user-select: none;
  direction: ltr; text-align: left;
}
.ms-option:hover { background: var(--brand-pale); }
.ms-option.selected { background: var(--surface-alt); }
.ms-option input[type="checkbox"] { width: 14px; height: 14px; flex-shrink: 0; accent-color: var(--brand); cursor: pointer; }
.ms-option-label { flex: 1; word-break: break-word; text-align: left; }
.ms-option-sub { font-size: 12.5px; font-weight: 600; color: var(--ink-faint); flex-shrink: 0; }
.ms-footer { padding: 7px 12px; border-top: 1px solid var(--border); background: var(--surface-alt); display: flex; justify-content: space-between; align-items: center; }
.ms-footer-count { font-size: 13.5px; font-weight: 600; color: var(--ink-faint); }
.ms-footer-clear { font-size: 12.5px; color: var(--danger); cursor: pointer; font-weight: 600; opacity: 0.8; transition: opacity 0.15s; }
.ms-footer-clear:hover { opacity: 1; }
.ms-empty { padding: 14px 12px; font-size: 14px; font-weight: 600; color: var(--ink-faint); font-style: italic; text-align: center; }
.ms-loading { padding: 14px 12px; font-size: 14px; font-weight: 600; color: var(--ink-faint); text-align: center; display: flex; align-items: center; justify-content: center; gap: 8px; }

/* ════════════════════════════════════
   DOWNLOAD MODAL
════════════════════════════════════ */
.modal-overlay {
  position: fixed; inset: 0; z-index: 500;
  background: rgba(19,27,51,0.55); backdrop-filter: blur(6px);
  display: none; align-items: center; justify-content: center;
  padding: 24px;
}
.modal-overlay.show { display: flex; }

.modal-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 22px; overflow: hidden;
  box-shadow: 0 24px 80px rgba(19,27,51,0.28), 0 4px 20px rgba(19,27,51,0.12);
  width: 100%; max-width: 660px;
  max-height: 90vh; overflow-y: auto;
  animation: modalIn 0.3s cubic-bezier(0.4,0,0.2,1);
}
@keyframes modalIn {
  from { opacity: 0; transform: translateY(20px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.modal-header {
  padding: 24px 28px 18px;
  border-bottom: 1px solid var(--border);
  display: flex; align-items: flex-start; justify-content: space-between;
  background: var(--surface-alt);
  position: sticky; top: 0; z-index: 10;
}
.mh-left { display: flex; align-items: flex-start; gap: 14px; }
.mh-icon {
  width: 42px; height: 42px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.mhi-amber { background: var(--accent-pale); }
.mhi-brand { background: var(--brand-pale); }
.mhi-green { background: var(--success-pale); }
.modal-title { font-size: 21px; font-weight: 800; color: var(--ink); letter-spacing: -0.3px; }
.modal-title em { color: var(--brand); font-style: normal; }
.modal-sub { font-size: 13.5px; font-weight: 600; color: var(--ink-faint); margin-top: 4px; }
.close-modal {
  width: 28px; height: 28px; border-radius: 8px;
  border: 1.5px solid var(--border); background: transparent;
  cursor: pointer; color: var(--ink-faint); font-size: 15px;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s;
}
.close-modal:hover { background: var(--surface-alt); color: var(--ink); }

/* ── Step track ── */
.step-track { display: flex; align-items: center; padding: 13px 28px; background: var(--surface-alt); border-bottom: 1px solid var(--border); }
.step-node { display: flex; align-items: center; gap: 8px; flex: 1; }
.step-node:last-child { flex: none; }
.step-circ {
  width: 26px; height: 26px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; flex-shrink: 0;
  border: 2px solid var(--border);
  background: var(--surface); color: var(--ink-faint); transition: all 0.3s;
}
.step-circ.done { background: var(--success); border-color: var(--success); color: #fff; }
.step-circ.curr { background: var(--brand); border-color: var(--brand); color: #fff; box-shadow: 0 0 0 4px #3D5AFE1E; }
.step-name { font-size: 12.5px; font-weight: 700; color: var(--ink-faint); white-space: nowrap; }
.step-name.done { color: var(--success); }
.step-name.curr { color: var(--brand-dark); }
.step-conn { flex: 1; height: 2px; background: var(--border); margin: 0 6px; position: relative; }
.step-conn.done::after { content:''; position:absolute; inset:0; background: var(--success); }

/* ── Modal body & footer ── */
.modal-body   { padding: 22px 28px; display: flex; flex-direction: column; gap: 20px; }
.modal-footer {
  padding: 15px 28px 22px; border-top: 1px solid var(--border);
  display: flex; align-items: center; gap: 10px;
  background: var(--surface-alt);
  position: sticky; bottom: 0; z-index: 10;
}

.sec-label { font-size: 11.5px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: var(--ink-faint); margin-bottom: 9px; }

.summary-chips { display: flex; gap: 8px; flex-wrap: wrap; }
.s-chip {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 6px 12px; border-radius: 9px; border: 1.5px solid var(--border);
  font-size: 13.5px; font-weight: 700; color: var(--ink-soft); background: var(--surface-alt);
}
.s-chip.hi { border-color: var(--brand); color: var(--brand-dark); background: var(--brand-pale); }

/* ── Folder picker ── */
.folder-picker { background: var(--surface-alt); border: 2px dashed var(--border); border-radius: 14px; padding: 18px; cursor: pointer; transition: all 0.18s; }
.folder-picker:hover { border-color: var(--brand); background: var(--brand-pale); }
.folder-picker.selected { border-style: solid; border-color: var(--brand); background: var(--brand-pale); }
.fp-top { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.fp-icon { width: 42px; height: 42px; border-radius: 11px; background: var(--accent-pale); display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 19px; }
.fp-title { font-size: 14.5px; font-weight: 700; color: var(--ink); }
.fp-hint  { font-size: 13px; font-weight: 600; color: var(--ink-faint); margin-top: 2px; }
.fp-browse {
  margin-left: auto; padding: 8px 16px; border-radius: 9px;
  background: var(--surface); border: 1.5px solid var(--border);
  font-size: 13.5px; font-weight: 700; cursor: pointer;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; color: var(--ink-soft);
  transition: all 0.18s; display: flex; align-items: center; gap: 7px; flex-shrink: 0;
}
.fp-browse:hover { border-color: var(--brand); color: var(--brand-dark); background: var(--brand-pale); }
.fp-browse.chosen { background: var(--brand); color: #fff; border-color: var(--brand); }
.path-row {
  display: flex; align-items: center; gap: 9px;
  background: var(--surface); border: 1.5px solid var(--border);
  border-radius: 9px; padding: 9px 13px; font-size: 13.5px; font-weight: 600;
}
.path-text { flex: 1; color: var(--ink-faint); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.path-text.chosen { color: var(--brand-dark); font-weight: 500; }
.path-change { font-size: 12.5px; font-weight: 700; color: var(--brand); cursor: pointer; flex-shrink: 0; }
.quick-folders { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
.qf {
  display: flex; align-items: center; gap: 7px;
  padding: 6px 11px; border-radius: 9px;
  border: 1.5px solid var(--border); background: var(--surface);
  font-size: 13px; font-weight: 700; color: var(--ink-soft);
  cursor: pointer; transition: all 0.15s;
}
.qf:hover  { border-color: var(--brand); color: var(--brand-dark); background: var(--brand-pale); }
.qf.active { border-color: var(--brand); color: var(--brand-dark); background: var(--brand-pale); }
.folder-note { display: flex; align-items: center; gap: 6px; margin-top: 8px; font-size: 12.5px; font-weight: 600; color: var(--accent-dark); line-height: 1.4; }

/* ── Settings grid ── */
.settings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field-g label { display: block; font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; color: var(--ink-faint); margin-bottom: 6px; }
.field-input {
  width: 100%; padding: 9px 12px; border: 1.5px solid var(--border);
  border-radius: 9px; font-size: 13.5px; font-weight: 600;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  color: var(--ink); background: var(--surface-alt);
  outline: none; transition: border-color 0.18s, box-shadow 0.18s;
}
.field-input:focus { border-color: var(--brand); box-shadow: 0 0 0 3px #3D5AFE12; }

.slider-wrap { display: flex; align-items: center; gap: 9px; }
.slider-wrap input[type="range"] { flex: 1; accent-color: var(--brand); height: 4px; }

.options-card { background: var(--surface-alt); border: 1px solid var(--border); border-radius: 12px; padding: 4px 14px; }
.toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--border); }
.toggle-row:last-child { border-bottom: none; }
.tl-label { font-size: 14px; font-weight: 700; }
.tl-sub   { font-size: 12px; font-weight: 600; color: var(--ink-faint); }
.opt-checkbox { width: 15px; height: 15px; accent-color: var(--brand); cursor: pointer; }
.toggle-sw {
  width: 34px; height: 19px; border-radius: 10px;
  background: var(--border); cursor: pointer;
  position: relative; transition: background 0.2s; border: none; flex-shrink: 0;
}
.toggle-sw::after {
  content: ''; position: absolute; top: 3px; left: 3px;
  width: 13px; height: 13px; border-radius: 50%;
  background: #fff; transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.25);
}
.toggle-sw.on { background: var(--brand); }
.toggle-sw.on::after { transform: translateX(15px); }

/* ── Download step 2 ── */
.dl-hero {
  background: linear-gradient(135deg, var(--ink) 0%, #232C4D 100%);
  border-radius: 16px; padding: 20px 22px; position: relative; overflow: hidden;
}
.dl-hero::before {
  content: ''; position: absolute; right: -30px; top: -30px;
  width: 160px; height: 160px; border-radius: 50%;
  background: #3D5AFE10; border: 36px solid #3D5AFE08;
}
.dl-hero-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; position: relative; z-index: 1; }
.dl-hero-title { font-size: 18px; font-weight: 800; color: #fff; }
.dl-hero-sub { font-size: 13px; font-weight: 600; color: #9AA5D6; margin-top: 3px; }
.dl-status-pill {
  display: flex; align-items: center; gap: 6px;
  padding: 4px 11px; border-radius: 20px;
  background: #3D5AFE30; border: 1px solid #6B84FF44;
  font-size: 12px; font-weight: 700; color: #A9B7FF;
}
.pulse { width: 6px; height: 6px; border-radius: 50%; background: #6B84FF; animation: pulseDot 1.4s ease infinite; }
.ring-wrap { display: flex; align-items: center; gap: 20px; position: relative; z-index: 1; }
.ring-cont { position: relative; width: 76px; height: 76px; flex-shrink: 0; }
.ring-cont svg { transform: rotate(-90deg); }
.r-bg   { fill: none; stroke: #3D5AFE30; stroke-width: 6; }
.r-fill {
  fill: none; stroke: #6B84FF; stroke-width: 6; stroke-linecap: round;
  stroke-dasharray: 207; stroke-dashoffset: 207;
  transition: stroke-dashoffset 0.5s cubic-bezier(0.4,0,0.2,1);
}
.ring-txt { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 800; color: #fff; }
.dl-mini-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; flex: 1; }
.dm-val { font-size: 19px; font-weight: 800; color: #fff; }
.dm-lbl { font-size: 11px; font-weight: 600; color: #9AA5D6; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.6px; }
.overall-bar-wrap { margin-top: 12px; position: relative; z-index: 1; }
.ob-top { display: flex; justify-content: space-between; font-size: 12px; font-weight: 600; margin-bottom: 5px; color: #9AA5D6; }
.ob-track { height: 6px; background: #3D5AFE30; border-radius: 3px; overflow: hidden; }
.ob-fill {
  height: 100%; width: 0%;
  background: linear-gradient(90deg, #6B84FF, var(--accent));
  border-radius: 3px; transition: width 0.4s ease;
  position: relative; overflow: hidden;
}
.ob-fill::after {
  content: ''; position: absolute; top: 0; left: -100%; right: 0; bottom: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.3), transparent);
  animation: shimmer 1.5s infinite;
}
@keyframes shimmer { to { left: 200%; } }

.dest-banner {
  display: flex; align-items: center; gap: 10px;
  background: var(--brand-pale); border: 1.5px solid var(--border);
  border-radius: 12px; padding: 11px 14px; font-size: 13.5px; font-weight: 600;
}
.dest-icon { font-size: 18px; flex-shrink: 0; }
.dest-lbl  { font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: var(--ink-faint); }
.dest-path { font-size: 13.5px; color: var(--brand-dark); font-weight: 600; margin-top: 1px; word-break: break-all; }
.dest-change { margin-left: auto; font-size: 12.5px; font-weight: 700; color: var(--brand); cursor: pointer; flex-shrink: 0; }
.dest-change:hover { text-decoration: underline; }

.dl-controls { display: flex; align-items: center; gap: 8px; }
.ctrl-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 14px; border-radius: 9px; font-size: 13.5px; font-weight: 700;
  border: 1.5px solid var(--border); background: var(--surface); cursor: pointer;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; color: var(--ink-soft); transition: all 0.15s;
}
.ctrl-btn:hover { border-color: var(--brand); color: var(--brand-dark); }
.ctrl-pause { background: var(--accent-pale); border-color: #F0C97D; color: var(--accent-dark); }
.ctrl-stop { background: var(--danger-pale); border-color: #F3AEBB; color: var(--danger); }
.speed-info { margin-left: auto; font-size: 13px; font-weight: 700; color: var(--ink-faint); display: flex; align-items: center; gap: 5px; }
.speed-val { color: var(--brand-dark); }

/* ── Complete step ── */
.done-icon-wrap {
  width: 70px; height: 70px; border-radius: 50%;
  background: var(--success-pale); border: 3px solid var(--success);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 16px; font-size: 27px;
  box-shadow: 0 0 0 8px #16A34A10;
  animation: popIn 0.5s cubic-bezier(0.4,0,0.2,1);
}
@keyframes popIn { from { transform: scale(0.4); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.done-title { font-size: 24px; font-weight: 800; color: var(--ink); text-align: center; letter-spacing: -0.3px; }
.done-title em { color: var(--success); font-style: normal; }
.done-sub { font-size: 14px; font-weight: 600; color: var(--ink-faint); text-align: center; margin-top: 4px; margin-bottom: 22px; }
.done-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 18px; }
.done-stat-card { background: var(--surface-alt); border: 1.5px solid var(--border); border-radius: 13px; padding: 15px 12px; text-align: center; }
.dsv { font-size: 21px; font-weight: 800; color: var(--ink); }
.dsl { font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.6px; color: var(--ink-faint); margin-top: 3px; font-weight: 700; }
.done-path-card {
  background: var(--brand-pale); border: 1.5px solid var(--brand);
  border-radius: 13px; padding: 13px 16px;
  display: flex; align-items: center; gap: 12px; margin-bottom: 18px;
}
.dpc-lbl { font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.7px; color: var(--brand-dark); }
.dpc-path { font-size: 14px; font-weight: 600; color: var(--ink); margin-top: 2px; word-break: break-all; }
.done-actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }

/* Scrollbar */
::-webkit-scrollbar { width: 10px; }
::-webkit-scrollbar-track { background: var(--bg); border-radius: 5px; }
::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 5px; }
::-webkit-scrollbar-thumb:hover { background: var(--ink-faint); }

/* ════════════════════════════════════
   TOAST NOTIFICATIONS
════════════════════════════════════ */
.toast-container { position: fixed; top: 20px; right: 20px; z-index: 700; display: flex; flex-direction: column; gap: 10px; pointer-events: none; }
.toast {
  pointer-events: auto;
  background: var(--surface); border-radius: 14px; border-left: 4px solid var(--brand);
  padding: 14px 16px; min-width: 340px; max-width: 440px;
  box-shadow: 0 8px 32px rgba(19,27,51,0.16), 0 2px 8px rgba(19,27,51,0.08);
  display: flex; align-items: flex-start; gap: 10px;
  animation: toastIn 0.4s cubic-bezier(0.4,0,0.2,1) forwards;
  font-size: 14px; font-weight: 600; line-height: 1.45; color: var(--ink);
}
.toast-warning { border-left-color: var(--accent); }
.toast-warning .toast-icon { color: var(--accent-dark); }
.toast-error   { border-left-color: var(--danger); }
.toast-error   .toast-icon { color: var(--danger); }
.toast-success { border-left-color: var(--success); }
.toast-success .toast-icon { color: var(--success); }
.toast-info    { border-left-color: var(--brand); }
.toast-info    .toast-icon { color: var(--brand); }

.toast-icon { width: 20px; height: 20px; flex-shrink: 0; margin-top: 1px; }
.toast-msg  { flex: 1; word-break: break-word; overflow-wrap: break-word; }
.toast-close { background: none; border: none; cursor: pointer; color: var(--ink-faint); font-size: 18px; padding: 0 0 0 8px; line-height: 1; flex-shrink: 0; transition: color 0.15s; }
.toast-close:hover { color: var(--ink); }

.toast-out { animation: toastOut 0.35s cubic-bezier(0.4,0,0.2,1) forwards; }
@keyframes toastIn { from { opacity: 0; transform: translateX(40px) scale(0.96); } to { opacity: 1; transform: translateX(0) scale(1); } }
@keyframes toastOut { from { opacity: 1; transform: translateX(0) scale(1); } to { opacity: 0; transform: translateX(40px) scale(0.96); } }

@keyframes spin { to { transform: rotate(360deg); } }

/* ════════════════════════════════════
   RESPONSIVE
════════════════════════════════════ */
@media (max-width: 980px) {
  .layout { flex-direction: column; }
  .sidebar { width: 100%; position: static; }
  .tree-scroll { max-height: 340px; }
}
`;

  return { getStyles };
});
