/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 *
 * PDC — Client-Side JavaScript Template
 * All browser-side logic: search, multiselect, modal, download orchestrator,
 * File System Access API, concurrency limiter, row renderers, etc.
 *
 * Server-injected values: baseUrl, customers, subsidiaries
 */
define([], () => {

  /**
   * @param {string} baseUrl       Suitelet base URL
   * @param {Object[]} customers   Lookup data for customer multiselect
   * @param {Object[]} subsidiaries Lookup data for subsidiary multiselect
   * @returns {string} Complete <script> block content
   */
  const getScript = (baseUrl, customers, subsidiaries, departments) => `
/* ── Server-side lookup data (embedded at render time) ── */
const __LOOKUPS__ = {
  customers:    ${JSON.stringify(customers)},
  subsidiaries: ${JSON.stringify(subsidiaries)},
  departments:  ${JSON.stringify(departments)}
};

'use strict';

/* ─────────────────────────────────────────
   TOAST NOTIFICATIONS
───────────────────────────────────────── */
const TOAST_ICONS = {
  warning: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2L1 18h18L10 2z" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M10 8v4M10 14v1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  error:   '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8.5" stroke="currentColor" stroke-width="1.5"/><path d="M7 7l6 6M13 7l-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  success: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8.5" stroke="currentColor" stroke-width="1.5"/><path d="M6.5 10.5l2.5 2.5 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  info:    '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8.5" stroke="currentColor" stroke-width="1.5"/><path d="M10 9v5M10 6.5v1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
};

function showAlert(message, type) {
  if (type === undefined) type = 'warning';
  return new Promise(function (resolve) {
    var overlay = document.createElement('div');
    overlay.className = 'alert-overlay';
    var dialog = document.createElement('div');
    dialog.className = 'alert-dialog alert-' + type;
    dialog.innerHTML =
      '<span class="alert-icon">' + (TOAST_ICONS[type] || TOAST_ICONS.info) + '</span>' +
      '<span class="alert-msg">' + message + '</span>' +
      '<button class="alert-ok-btn">OK</button>';
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    dialog.querySelector('.alert-ok-btn').addEventListener('click', function () {
      overlay.remove();
      resolve();
    });
  });
}

function showToast(message, type, duration) {
  if (type === undefined) type = 'info';
  if (duration === undefined) duration = 5000;
  var container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  var toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.innerHTML =
    '<span class="toast-icon">' + (TOAST_ICONS[type] || TOAST_ICONS.info) + '</span>' +
    '<span class="toast-msg">' + message + '</span>' +
    '<button class="toast-close" aria-label="Close">&times;</button>';
  container.appendChild(toast);
  var dismiss = function () {
    if (toast.classList.contains('toast-out')) return;
    toast.classList.add('toast-out');
    toast.addEventListener('animationend', function () { toast.remove(); });
  };
  toast.querySelector('.toast-close').addEventListener('click', dismiss);
  if (duration > 0) setTimeout(dismiss, duration);
  return toast;
}

/* ─────────────────────────────────────────
   CONSTANTS & STATE
───────────────────────────────────────── */
const BASE_URL = '${baseUrl}';

let invoices      = [];   // all loaded invoices
let dirHandle     = null; // FileSystemDirectoryHandle (Chrome/Edge)
let fsSAPIEnabled = false;
let cancelled     = false;
let abortCtrl     = null;   // AbortController for in-flight fetches
let paused        = false;
let downloading   = false;
let dlStartTime   = 0;
let successCount  = 0;
let failedCount   = 0;
let failedItems   = [];
const rowStatus   = {};
let currentPage   = 'invoices'; // 'invoices' | 'creditmemos' | 'invoicegroups'
let csvTranIds    = null;       // Array of tranid strings when CSV search is active

/* ── Pagination state ── */
let currentTablePage = 1;
let rowsPerPage      = 50;
let allSelected      = false;
const selectedIds    = new Set();

/* ─────────────────────────────────────────
   PAGE CONFIG  — drives all dynamic UI
───────────────────────────────────────── */
const PAGE_CONFIG = {
  invoices: {
    title:       '<em>Transactions</em>',
    sub:         'Search, preview and download Transactions PDFs by customer or date range',
    searchLabel: 'Search Transactions',
    emptyIcon:   '🔎',
    emptyText:   'No Transactions found',
    emptySub:    'Try adjusting your filters',
    tableMeta:   'transactions',
    typeLabel:   'Invoice',
    statusOptions: [
      { id: 'CustInvc:A', label: 'Invoice: Open' },
      { id: 'CustInvc:B', label: 'Invoice: Paid in Full' }
    ],
    theadHTML: \`<tr>
      <th><input type="checkbox" id="cb-all" onchange="onSelectAll(this)"/></th>
      <th>Type</th><th></th><th>Tran ID</th><th>Customer</th><th>Date</th><th>Due Date</th>
      <th>Amount</th><th>Status</th><th>DL Status</th>
    </tr>\`,
    rowRendererKey: 'renderInvoiceRow',
    action: 'getInvoices',
    prefix: 'INV'
  },
  creditmemos: {
    title:       '<em>Transactions</em>',
    sub:         'Search, preview and download transaction PDFs by customer or date range',
    searchLabel: 'Search Transactions',
    emptyIcon:   '🔎',
    emptyText:   'No Transactions found',
    emptySub:    'Try adjusting your filters',
    tableMeta:   'transactions',
    typeLabel:   'Credit Memo',
    statusOptions: [
      { id: 'CustCred:A', label: 'Credit Memo: Open' },
      { id: 'CustCred:B', label: 'Credit Memo: Fully Applied' }
    ],
    theadHTML: \`<tr>
      <th><input type="checkbox" id="cb-all" onchange="onSelectAll(this)"/></th>
      <th>Type</th><th></th><th>CM Number</th><th>Customer</th><th>Date</th><th>CM Amount</th>
      <th>Remaining</th><th>Status</th><th>DL Status</th>
    </tr>\`,
    rowRendererKey: 'renderCreditMemoRow',
    action: 'getCreditMemos',
    prefix: 'CM'
  },
  invoicegroups: {
    title:       '<em>Transactions</em>',
    sub:         'Search, preview and download transaction PDFs by customer or date range',
    searchLabel: 'Search Transactions',
    emptyIcon:   '🔎',
    emptyText:   'No Transactions found',
    emptySub:    'Try adjusting your filters',
    tableMeta:   'transactions',
    typeLabel:   'Invoice Group',
    statusOptions: [
      { id: 'OPEN',     label: 'Invoice Group: Open' },
      { id: 'PAIDPART', label: 'Invoice Group: Partially Paid' },
      { id: 'PAIDFULL', label: 'Invoice Group: Paid in Full' }
    ],
    hideFilters: [],
    theadHTML: \`<tr>
      <th><input type="checkbox" id="cb-all" onchange="onSelectAll(this)"/></th>
      <th>Type</th><th></th><th>Group ID</th><th>Customer</th><th>Date</th><th>Due Date</th>
      <th>Amount Due</th><th>Status</th><th>DL Status</th>
    </tr>\`,
    rowRendererKey: 'renderInvoiceGroupRow',
    action: 'getInvoiceGroups',
    prefix: 'GRP'
  }
};

/* ─────────────────────────────────────────
   SWITCH PAGE
───────────────────────────────────────── */
function switchPage(pageId) {
  if (pageId === currentPage) return;
  currentPage = pageId;
  const cfg = PAGE_CONFIG[pageId];

  // Search button label
  document.getElementById('btn-search-label').textContent = cfg.searchLabel;

  const hideFilters = cfg.hideFilters || [];

  // Show/hide status, subsidiary, and department filter groups
  document.getElementById('fg-status').style.display     = hideFilters.includes('status')     ? 'none' : '';
  document.getElementById('fg-subsidiary').style.display = hideFilters.includes('subsidiary') ? 'none' : '';
  document.getElementById('fg-department').style.display = hideFilters.includes('department') ? 'none' : '';

  // Table headers
  document.getElementById('inv-thead').innerHTML = cfg.theadHTML;

  // Empty state
  document.getElementById('empty-icon').textContent = cfg.emptyIcon;
  document.getElementById('empty-text').textContent = cfg.emptyText;
  document.getElementById('empty-sub').textContent  = cfg.emptySub;

  // Reset results
  invoices = [];
  document.getElementById('inv-tbody').innerHTML   = '';
  document.getElementById('table-meta').textContent = '0 transactions';
  document.getElementById('table-container').classList.remove('show');
  document.getElementById('empty-state').classList.remove('show');
  document.getElementById('btn-dl-selected').disabled = true;
  setStats(0, 0, 0);
}

/* ─────────────────────────────────────────
   TRANSACTION TYPE SELECTION CHANGE
───────────────────────────────────────── */
function onTranTypeSelectionChange() {
  const sel = msGetValues('trantype');
  // Use first selected type's page layout, or default to invoices when none selected
  const pageId = sel.length > 0 ? sel[0] : 'invoices';
  switchPage(pageId);

  // When multiple types selected, show subsidiary/department unless ALL selected types hide it
  const types = sel.length > 0 ? sel : Object.keys(PAGE_CONFIG);
  const allHideSub  = types.every(t => (PAGE_CONFIG[t].hideFilters || []).includes('subsidiary'));
  const allHideDept = types.every(t => (PAGE_CONFIG[t].hideFilters || []).includes('department'));
  document.getElementById('fg-subsidiary').style.display = allHideSub  ? 'none' : '';
  document.getElementById('fg-department').style.display = allHideDept ? 'none' : '';

  updateStatusOptions();
}

function updateStatusOptions() {
  const selTypes = msGetValues('trantype');
  const types = selTypes.length > 0 ? selTypes : Object.keys(PAGE_CONFIG);
  let allOptions = [];
  types.forEach(t => {
    const cfg = PAGE_CONFIG[t];
    if (cfg && cfg.statusOptions) allOptions = allOptions.concat(cfg.statusOptions);
  });
  // Preserve selected statuses that are still valid in the new option set
  const validIds = new Set(allOptions.map(o => String(o.id)));
  const toRemove = [...MS_STATE['status'].selected].filter(id => !validIds.has(id));
  toRemove.forEach(id => MS_STATE['status'].selected.delete(id));
  msSetOptions('status', allOptions);
  msUpdateTrigger('status');
}

/* ─────────────────────────────────────────
   UNIFIED SEARCH DISPATCHER
   ROWNUM pagination on server, client fetches
   page-by-page with live progress & exact counts.
───────────────────────────────────────── */
const SEARCH_PAGE_SIZE = 5000;   // rows per page — matches server ROWNUM_PAGE

/* ── Search progress overlay helpers ── */
function showSearchProgress() {
  hideSearchProgress();
  var overlay = document.createElement('div');
  overlay.id = 'search-progress-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;z-index:99999;';
  var box = document.createElement('div');
  box.style.cssText = 'background:#fff;border-radius:12px;padding:2rem 2.5rem;box-shadow:0 8px 32px rgba(0,0,0,0.18);text-align:center;min-width:380px;';
  var spinner = document.createElement('div');
  spinner.style.cssText = 'width:48px;height:48px;border:4px solid #e0e0e0;border-top:4px solid #4d5f79;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 1rem auto;';
  box.appendChild(spinner);
  var title = document.createElement('div');
  title.id = 'search-progress-title';
  title.style.cssText = 'font-size:1.1rem;font-weight:600;color:#4d5f79;margin-bottom:0.75rem;';
  title.textContent = 'Extracting search results...';
  box.appendChild(title);
  // Progress bar
  var barOuter = document.createElement('div');
  barOuter.style.cssText = 'width:100%;height:8px;background:#e0e0e0;border-radius:4px;overflow:hidden;margin-bottom:0.5rem;';
  var barInner = document.createElement('div');
  barInner.id = 'search-progress-bar';
  barInner.style.cssText = 'width:0%;height:100%;background:linear-gradient(90deg,#4d5f79,#6b8cae);border-radius:4px;transition:width 0.3s ease;';
  barOuter.appendChild(barInner);
  box.appendChild(barOuter);
  // Status text
  var status = document.createElement('div');
  status.id = 'search-progress-status';
  status.style.cssText = 'font-size:0.85rem;color:#666;';
  status.textContent = 'Starting search...';
  box.appendChild(status);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

function updateSearchProgress(fetched, total, typeLabel) {
  var bar = document.getElementById('search-progress-bar');
  var status = document.getElementById('search-progress-status');
  var title = document.getElementById('search-progress-title');
  var pct = total > 0 ? Math.round((fetched / total) * 100) : 0;
  if (bar) bar.style.width = pct + '%';
  if (status) status.textContent = 'Extracted ' + fetched + ' of ' + total + ' records' + (typeLabel ? ' (' + typeLabel + ')' : '');
  if (title) title.textContent = 'Extracting search results... ' + pct + '%';
}

function hideSearchProgress() {
  var el = document.getElementById('search-progress-overlay');
  if (el) el.remove();
}

async function doSearch() {
  var cfg = PAGE_CONFIG[currentPage];
  var btn = document.getElementById('btn-search');
  btn.disabled = true;
  var origLabel = cfg.searchLabel;
  document.getElementById('btn-search-label').textContent = 'Searching...';

  var truncWarn = document.getElementById('truncation-warning');
  if (truncWarn) truncWarn.remove();

  var selTypes = msGetValues('trantype');
  var typesToSearch = selTypes.length > 0 ? selTypes : Object.keys(PAGE_CONFIG);

  var allSelectedStatuses = msGetValues('status');
  console.log('[PDC doSearch] statuses=' + JSON.stringify(allSelectedStatuses) + ' types=' + JSON.stringify(typesToSearch));

  showSearchProgress();

  try {
    function getStatusForType(typeKey) {
      if (allSelectedStatuses.length === 0) return '';
      var typeStatusIds = (PAGE_CONFIG[typeKey].statusOptions || []).map(function(o) { return String(o.id); });
      var relevant = allSelectedStatuses.filter(function(s) { return typeStatusIds.includes(s); });
      if (relevant.length === 0) return null;
      return relevant.join(',');
    }

    var allInvoices = [];
    var grandTotal = 0;
    var grandFetched = 0;

    for (var ti = 0; ti < typesToSearch.length; ti++) {
      var typeKey = typesToSearch[ti];
      var typeCfg = PAGE_CONFIG[typeKey];
      if (!typeCfg) continue;

      var statusForType = getStatusForType(typeKey);
      if (statusForType === null && !(csvTranIds && csvTranIds.length > 0)) continue;

      var typeLabel = typeCfg.typeLabel || typeKey;

      var baseParams = { action: typeCfg.action };

      if (csvTranIds && csvTranIds.length > 0) {
        // CSV mode: only search by tranid list, ignore other filters
        baseParams.tranIds = csvTranIds.join(',');
      } else {
        // Normal filter mode
        baseParams.dateFrom   = toISODate(document.getElementById('f-dateFrom').value);
        baseParams.dateTo     = toISODate(document.getElementById('f-dateTo').value);
        baseParams.customer   = msGetValues('customer').join(',');
        baseParams.department = msGetValues('department').join(',');
        baseParams.subsidiary = msGetValues('subsidiary').join(',');
        baseParams.status     = statusForType;
        baseParams.tranId     = (document.getElementById('f-tranId').value || '').trim();
        baseParams.poNum      = (document.getElementById('f-poNum').value || '').trim();
        baseParams.workAuth   = (document.getElementById('f-workAuth').value || '').trim();
      }

      // Page-by-page fetch using ROWNUM (rowBegin/rowEnd)
      var rowBegin = 1;
      var typeTotal = 0;
      var moreRecords = true;

      while (moreRecords) {
        var rowEnd = rowBegin + SEARCH_PAGE_SIZE - 1;
        var params = new URLSearchParams(Object.assign({}, baseParams, {
          rowBegin: rowBegin,
          rowEnd:   rowEnd
        }));

        console.log('[PDC doSearch] type=' + typeKey + ' rows ' + rowBegin + '-' + rowEnd);
        var resp = await fetch(BASE_URL + '&' + params.toString());
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        var data = await resp.json();
        if (!data.success) throw new Error(data.error || 'Unknown error');

        // First page returns totalCount
        if (rowBegin === 1 && data.totalCount != null) {
          typeTotal = data.totalCount;
          grandTotal += typeTotal;
        }

        var items = (data.invoices || []).map(function(inv) {
          return Object.assign({}, inv, { _typeLabel: typeLabel, _typeKey: typeKey });
        });
        allInvoices = allInvoices.concat(items);
        grandFetched += items.length;

        console.log('[PDC doSearch] type=' + typeKey + ' page returned ' + items.length + ' fetched=' + grandFetched + '/' + grandTotal);
        updateSearchProgress(grandFetched, grandTotal, typeLabel);

        // ROWNUM termination: if page returned fewer than page size, no more rows
        if (items.length < SEARCH_PAGE_SIZE) {
          moreRecords = false;
        } else {
          rowBegin += SEARCH_PAGE_SIZE;
        }
      }
    }

    // Update overlay to rendering phase
    var title = document.getElementById('search-progress-title');
    if (title) title.textContent = 'Please wait, rendering ' + allInvoices.length + ' records to screen...';
    var bar = document.getElementById('search-progress-bar');
    if (bar) bar.style.width = '100%';
    var status = document.getElementById('search-progress-status');
    if (status) status.textContent = 'Extracted ' + allInvoices.length + ' records — rendering table...';

    // Yield to browser so the rendering message is visible before the heavy renderTable call
    await new Promise(function (resolve) { requestAnimationFrame(function () { setTimeout(resolve, 50); }); });

    // Clear CSV mode after search completes
    var wasCsv = !!csvTranIds;
    csvTranIds = null;

    invoices = allInvoices;
    renderTable(invoices);
    setStats(invoices.length, 0, 0);

    if (wasCsv) {
      showToast('CSV search complete — found ' + allInvoices.length + ' transaction(s)', 'success');
    }

    if (invoices.length === 0) {
      document.getElementById('table-container').classList.remove('show');
      document.getElementById('empty-state').classList.add('show');
    } else {
      document.getElementById('empty-state').classList.remove('show');
      document.getElementById('table-container').classList.add('show');
    }
  } catch (e) {
    console.error('[PDC doSearch] Error:', e);
    var tbody = document.getElementById('inv-tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#c00;padding:1rem;">Search failed: ' + (e.message || 'Unknown error') + '</td></tr>';
    document.getElementById('table-container').classList.add('show');
    document.getElementById('empty-state').classList.remove('show');
  } finally {
    hideSearchProgress();
    btn.disabled = false;
    document.getElementById('btn-search-label').textContent = origLabel;
  }
}

/* ─────────────────────────────────────────
   CSV UPLOAD SEARCH
───────────────────────────────────────── */
async function doCSVSearch() {
  var fileInput = document.getElementById('f-csvFile');
  if (!fileInput.files || !fileInput.files[0]) {
    showToast('Please select a CSV file first', 'warning');
    return;
  }
  try {
    var text = await fileInput.files[0].text();
    var lines = text.split(/\\r?\\n/).filter(function(l) { return l.trim(); });
    var ids = [];
    var seen = {};
    lines.forEach(function(l) {
      var val = l.split(',')[0].trim();
      if (val && !seen[val]) { seen[val] = true; ids.push(val); }
    });
    if (ids.length === 0) {
      showToast('No transaction IDs found in the CSV file', 'warning');
      return;
    }
    document.getElementById('csv-info').textContent = ids.length + ' IDs loaded';
    document.getElementById('csv-info').style.display = '';

    // Batch into chunks of 100 to stay within URL length limits
    var CSV_CHUNK = 100;
    if (ids.length <= CSV_CHUNK) {
      csvTranIds = ids;
      await doSearch();
    } else {
      showSearchProgress();
      var allResults = [];
      for (var ci = 0; ci < ids.length; ci += CSV_CHUNK) {
        var chunk = ids.slice(ci, ci + CSV_CHUNK);
        csvTranIds = chunk;
        updateSearchProgress(ci, ids.length, 'CSV batch');

        // Temporarily hijack doSearch to collect results
        var prevInvoices = invoices;
        await doSearch();
        allResults = allResults.concat(invoices);
      }
      csvTranIds = null;
      invoices = allResults;
      renderTable(invoices);
      setStats(invoices.length, 0, 0);
      if (invoices.length === 0) {
        document.getElementById('table-container').classList.remove('show');
        document.getElementById('empty-state').classList.add('show');
      } else {
        document.getElementById('empty-state').classList.remove('show');
        document.getElementById('table-container').classList.add('show');
      }
      hideSearchProgress();
      showToast('CSV search complete — found ' + allResults.length + ' transaction(s) from ' + ids.length + ' IDs', 'success');
    }
  } catch (e) {
    showToast('Error reading CSV file: ' + e.message, 'error');
  }
}

/* ─────────────────────────────────────────
   MULTISELECT WIDGET
───────────────────────────────────────── */
const MS_STATE = {
  trantype:   { options: [], selected: new Set(), open: false },
  customer:   { options: [], selected: new Set(), open: false },
  department: { options: [], selected: new Set(), open: false },
  subsidiary: { options: [], selected: new Set(), open: false },
  status:     { options: [], selected: new Set(), open: false }
};

function msToggle(key) {
  const state = MS_STATE[key];
  const wrap  = document.getElementById(\`ms-\${key}-wrap\`);
  if (state.open) {
    msClose(key);
  } else {
    // Close all others first
    Object.keys(MS_STATE).forEach(k => { if (k !== key) msClose(k); });
    state.open = true;
    wrap.classList.add('open');
    const dd = document.getElementById(\`ms-\${key}-dropdown\`);
    dd.style.display = 'block';
    dd.style.visibility = 'visible';
    document.getElementById(\`ms-\${key}-search\`).focus();
  }
}

function msClose(key) {
  MS_STATE[key].open = false;
  const wrap = document.getElementById(\`ms-\${key}-wrap\`);
  wrap.classList.remove('open');
  const dd = document.getElementById(\`ms-\${key}-dropdown\`);
  dd.style.display = 'none';
  dd.style.visibility = 'hidden';
  document.getElementById(\`ms-\${key}-search\`).value = '';
  msFilter(key); // reset filter
}

// Close on outside click
document.addEventListener('click', (e) => {
  Object.keys(MS_STATE).forEach(key => {
    const wrap = document.getElementById(\`ms-\${key}-wrap\`);
    if (wrap && !wrap.contains(e.target)) msClose(key);
  });
});

function msSetOptions(key, options) {
  MS_STATE[key].options = options;
  msRenderList(key, options);
}

function msFilter(key) {
  const q = document.getElementById(\`ms-\${key}-search\`).value.toLowerCase();
  const filtered = MS_STATE[key].options.filter(o =>
    o.label.toLowerCase().includes(q) || String(o.id).includes(q)
  );
  msRenderList(key, filtered);
}

function msRenderList(key, options) {
  const list    = document.getElementById(\`ms-\${key}-list\`);
  const selected = MS_STATE[key].selected;

  if (options.length === 0) {
    list.innerHTML = \`<div class="ms-empty">No results found</div>\`;
    return;
  }

  list.innerHTML = options.map(o => {
    const isSel = selected.has(String(o.id));
    return \`<div class="ms-option\${isSel ? ' selected' : ''}" onclick="msToggleOption('\${key}','\${o.id}',this)">
      <input type="checkbox" \${isSel ? 'checked' : ''} onclick="event.stopPropagation();msToggleOption('\${key}','\${o.id}',this.closest('.ms-option'))"/>
      <span class="ms-option-label">\${escHtml(o.label)}</span>
      \${(key === 'trantype' || key === 'status') ? '' : \`<span class="ms-option-sub">#\${o.id}</span>\`}
    </div>\`;
  }).join('');
}

function msToggleOption(key, id, el) {
  const state = MS_STATE[key];
  const sid   = String(id);
  if (state.selected.has(sid)) {
    state.selected.delete(sid);
    el.classList.remove('selected');
    el.querySelector('input').checked = false;
  } else {
    state.selected.add(sid);
    el.classList.add('selected');
    el.querySelector('input').checked = true;
  }
  msUpdateTrigger(key);
  if (key === 'trantype') onTranTypeSelectionChange();
}

function msClear(key) {
  MS_STATE[key].selected.clear();
  msRenderList(key, MS_STATE[key].options);
  msUpdateTrigger(key);
  if (key === 'trantype') onTranTypeSelectionChange();
}

function msUpdateTrigger(key) {
  const state     = MS_STATE[key];
  const trigger   = document.getElementById(\`ms-\${key}-trigger\`);
  const countEl   = document.getElementById(\`ms-\${key}-count\`);
  const n         = state.selected.size;

  countEl.textContent = n === 0 ? '0 selected' : \`\${n} selected\`;

  // Rebuild pills (keep arrow in place by removing only pills/placeholder)
  const arrow = trigger.querySelector('.ms-arrow');
  trigger.innerHTML = '';
  trigger.appendChild(arrow);

  if (n === 0) {
    const ph = document.createElement('span');
    ph.className = 'ms-placeholder';
    ph.id = \`ms-\${key}-placeholder\`;
    ph.textContent = key === 'customer' ? 'All Customers' : key === 'trantype' ? 'All Transaction Types' : key === 'status' ? 'All Statuses' : 'All Subsidiaries';
    trigger.insertBefore(ph, arrow);
    return;
  }

  const SHOW_MAX = 2;
  const ids      = [...state.selected];
  const shown    = ids.slice(0, SHOW_MAX);
  const extra    = ids.length - SHOW_MAX;

  shown.forEach(sid => {
    const opt   = state.options.find(o => String(o.id) === sid);
    const lbl   = opt ? opt.label : sid;
    const pill  = document.createElement('span');
    pill.className = 'ms-pill';
    pill.innerHTML = \`<span>\${escHtml(lbl)}</span><span class="ms-pill-remove" onclick="event.stopPropagation();msRemovePill('\${key}','\${sid}')">
      <svg width="10" height="10" fill="none" viewBox="0 0 10 10"><path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
    </span>\`;
    trigger.insertBefore(pill, arrow);
  });
  if (extra > 0) {
    const more = document.createElement('span');
    more.className = 'ms-pill-more';
    more.textContent = \`+\${extra} more\`;
    trigger.insertBefore(more, arrow);
  }
}

function msRemovePill(key, sid) {
  MS_STATE[key].selected.delete(sid);
  msRenderList(key, MS_STATE[key].options);
  msUpdateTrigger(key);
  if (key === 'trantype') onTranTypeSelectionChange();
}

function msGetValues(key) {
  return [...MS_STATE[key].selected];
}


/* ─────────────────────────────────────────
   INIT
───────────────────────────────────────── */
(function init() {
  fsSAPIEnabled = ('showDirectoryPicker' in window);

  // Default date range: last 90 days
  const today = new Date();
  const ago90 = new Date(today); ago90.setDate(ago90.getDate() - 90);
  document.getElementById('f-dateTo').value   = fmtDate(today);
  document.getElementById('f-dateFrom').value = fmtDate(ago90);

  // Populate transaction type multiselect
  msSetOptions('trantype', [
    { id: 'invoices',      label: 'Invoices' },
    { id: 'creditmemos',   label: 'Credit Memos' },
    { id: 'invoicegroups', label: 'Invoice Groups' }
  ]);

  // Populate multiselect dropdowns from server-embedded data
  msSetOptions('customer',   __LOOKUPS__.customers    || []);
  msSetOptions('department', __LOOKUPS__.departments  || []);
  msSetOptions('subsidiary', __LOOKUPS__.subsidiaries || []);

  // Populate status multiselect with all status options by default
  updateStatusOptions();

  // Auto-search on first page load
  doSearch();
})();

function fmtDate(d) {
  var mm = String(d.getMonth() + 1).padStart(2, '0');
  var dd = String(d.getDate()).padStart(2, '0');
  var yyyy = d.getFullYear();
  return mm + '/' + dd + '/' + yyyy;
}

function fmtDisplayDate(isoStr) {
  if (!isoStr || isoStr === '—') return '—';
  var parts = isoStr.split('-');
  if (parts.length !== 3) return isoStr;
  return parts[1] + '/' + parts[2] + '/' + parts[0];
}

function toISODate(mmddyyyy) {
  if (!mmddyyyy) return '';
  var parts = mmddyyyy.split('/');
  if (parts.length !== 3) return mmddyyyy;
  return parts[2] + '-' + parts[0] + '-' + parts[1];
}

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
function ts() { return new Date().toTimeString().slice(0, 8); }

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}


function setStats(total, success, failed) {
  document.getElementById('s-total').textContent   = total;
  document.getElementById('s-success').textContent = success;
  document.getElementById('s-failed').textContent  = failed;
  document.getElementById('s-pending').textContent = Math.max(0, total - success - failed);
}

function setProgress(done, total, label) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const circ = 207; // 2 * PI * 33
  document.getElementById('ring-fill').style.strokeDashoffset = circ - (circ * pct / 100);
  document.getElementById('ring-pct').textContent  = pct + '%';
  document.getElementById('ob-fill').style.width   = pct + '%';
  document.getElementById('ob-pct').textContent    = pct + '%';
  document.getElementById('ob-label').textContent  = cancelled ? 'Cancelled' : (done === total ? 'Complete!' : label || 'Downloading…');
  document.getElementById('dm-files').textContent  = done + ' / ' + total;

  const elapsed = (Date.now() - dlStartTime) / 1000;
  if (elapsed > 1 && done > 0) {
    const remaining = Math.max(0, Math.round((total - done) * elapsed / done));
    document.getElementById('dm-eta').textContent = remaining > 0 ? '~' + remaining + 's' : 'Done';
  }
}

function buildFilename(inv) {
  const pat    = document.getElementById('f-filename').value;
  const prefix = (document.getElementById('f-prefix').value || '').replace(/[^a-zA-Z0-9_\\-]/g, '_');
  const tid    = (inv.tranId   || 'doc').replace(/[^a-zA-Z0-9_\\-]/g, '_');
  const cust   = (inv.customer || 'unknown').replace(/[^a-zA-Z0-9_\\-]/g, '_').slice(0, 30);
  const dt     = (inv.date     || '').replace(/-/g, '');
  let name;
  if (pat === 'tranid_date') name = \`\${tid}_\${dt}.pdf\`;
  else if (pat === 'id_tranid') name = \`\${inv.id}_\${tid}.pdf\`;
  else if (pat === 'cust_tranid') name = \`\${cust}_\${tid}.pdf\`;
  else name = \`\${tid}.pdf\`;
  return prefix ? \`\${prefix}\${name}\` : name;
}

function updatePreview() {
  const pat = document.getElementById('f-filename').value;
  const prefix = (document.getElementById('f-prefix').value || '').replace(/[^a-zA-Z0-9_\\-]/g, '_');
  const samples = {
    'tranid':      'INV-10482.pdf',
    'tranid_date': 'INV-10482_20260301.pdf',
    'id_tranid':   '12345_INV-10482.pdf',
    'cust_tranid': 'Acme-Corp_INV-10482.pdf'
  };
  const base = samples[pat] || 'INV-10482.pdf';
  document.getElementById('filename-preview').innerHTML =
    \`<span>Preview:</span> \${prefix ? prefix + base : base}\`;
}

/* ─────────────────────────────────────────
   ROW STATUS
───────────────────────────────────────── */
function setRowStatus(id, status, errMsg) {
  rowStatus[id] = status;
  const dot = document.getElementById('row-dot-' + id);
  const lbl = document.getElementById('row-lbl-' + id);
  const row = document.getElementById('row-' + id);
  if (!dot) return;
  dot.className = 'status-dot dot-' + status;
  if (lbl) {
    lbl.textContent = status === 'ok'     ? '✓ Saved'
                    : status === 'err'    ? '✗ ' + (errMsg || 'Failed')
                    : status === 'active' ? 'Downloading…'
                    : 'Pending';
    lbl.title = (status === 'err' && errMsg) ? errMsg : '';
  }
  if (row) {
    row.className = status === 'ok'     ? 'row-ok'
                  : status === 'err'    ? 'row-err'
                  : status === 'active' ? 'row-active'
                  : '';
  }
}

/* ─────────────────────────────────────────
   SINGLE-ROW ACTIONS  (Preview / Download)
───────────────────────────────────────── */
async function previewPDF(id, tranId) {
  const inv = invoices.find(i => String(i.id) === String(id));
  if (!inv) return;
  try {
    const buffer = await downloadOnePDF(inv);
    const blob   = new Blob([buffer], { type: 'application/pdf' });
    window.open(URL.createObjectURL(blob), '_blank');
  } catch (e) {
    showToast('Preview failed: ' + e.message, 'error');
  }
}

async function downloadSingle(id, tranId) {
  const inv = invoices.find(i => String(i.id) === String(id));
  if (!inv) { console.error('[PDC] downloadSingle: inv not found for id=' + id); return; }
  setRowStatus(id, 'active');
  try {
    const buffer   = await downloadOnePDF(inv);
    const filename = buildFilename(inv);

    if (dirHandle && dirHandle.getFileHandle) {
      await writePDFToFolder(dirHandle, filename, buffer);
    } else {
      const blob = new Blob([buffer], { type: 'application/pdf' });
      const a    = document.createElement('a');
      a.href     = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    }

    setRowStatus(id, 'ok');
  } catch (e) {
    console.error('[PDC] downloadSingle failed for id=' + id, e);
    setRowStatus(id, 'err', e.message);
  }
}

/* ─────────────────────────────────────────
   RENDER TABLE  (dispatches to row renderer)
───────────────────────────────────────── */
function renderTable(list) {
  const cfg   = PAGE_CONFIG[currentPage];
  const thead = document.getElementById('inv-thead');

  // Detect if results contain multiple types
  const typeKeys = new Set(list.map(item => item._typeKey).filter(Boolean));
  const isMultiType = typeKeys.size > 1;

  // Use a unified header when mixing transaction types
  if (isMultiType) {
    thead.innerHTML = \`<tr>
      <th><input type="checkbox" id="cb-all" onchange="onSelectAll(this)"/></th>
      <th>Type</th><th></th><th>Tran ID</th><th>Customer</th><th>Date</th><th>Due Date</th>
      <th>Amount</th><th>Status</th><th>DL Status</th>
    </tr>\`;
  }

  // Re-attach cb-all after thead was rewritten by switchPage
  const cbAll = document.getElementById('cb-all');
  if (cbAll) cbAll.onchange = function() { onSelectAll(this); };

  // Init rowStatus for ALL items
  list.forEach((item) => { rowStatus[item.id] = 'pending'; });

  // Reset pagination and selection
  currentTablePage = 1;
  allSelected = false;
  selectedIds.clear();

  document.getElementById('table-meta').textContent = list.length + ' transactions';
  renderTablePage();
}

/* ── Render only the current page slice ── */
function renderTablePage() {
  const cfg   = PAGE_CONFIG[currentPage];
  const tbody = document.getElementById('inv-tbody');
  tbody.innerHTML = '';

  const total = invoices.length;
  const isAllMode = rowsPerPage === 0; // 0 = show all
  const perPage = isAllMode ? total : rowsPerPage;
  const totalPages = isAllMode ? 1 : Math.max(1, Math.ceil(total / perPage));

  if (currentTablePage > totalPages) currentTablePage = totalPages;

  const startIdx = (currentTablePage - 1) * perPage;
  const endIdx   = Math.min(startIdx + perPage, total);
  const pageSlice = invoices.slice(startIdx, endIdx);

  // Resolve renderer by string key
  const renderers = {
    renderInvoiceRow,
    renderCreditMemoRow,
    renderInvoiceGroupRow
  };
  const defaultRenderer = renderers[cfg.rowRendererKey];

  pageSlice.forEach((item) => {
    const itemCfg = item._typeKey ? PAGE_CONFIG[item._typeKey] : null;
    const rowRenderer = (itemCfg ? renderers[itemCfg.rowRendererKey] : null) || defaultRenderer;
    const tr = rowRenderer(item);
    tbody.appendChild(tr);
  });

  // Restore checkbox state for visible rows
  document.querySelectorAll('.row-cb').forEach(cb => {
    const id = cb.dataset.id;
    cb.checked = allSelected || selectedIds.has(id);
  });

  // Sync header checkbox
  const cbAll = document.getElementById('cb-all');
  if (cbAll) {
    const visibleCbs = document.querySelectorAll('.row-cb');
    cbAll.checked = visibleCbs.length > 0 && [...visibleCbs].every(c => c.checked);
  }

  // Update download button state
  onRowCheck();

  // Render pagination controls
  renderPaginationControls(total, totalPages, startIdx, endIdx);
}

/* ── Pagination controls renderer ── */
function renderPaginationControls(total, totalPages, startIdx, endIdx) {
  const container = document.getElementById('pagination-controls');
  if (!container) return;

  if (total <= 0) { container.style.display = 'none'; return; }
  container.style.display = 'flex';

  // Rows per page options
  const options = [25, 50, 100, 250, 500];
  const optionsHtml = options.map(n =>
    \`<option value="\${n}" \${rowsPerPage === n ? 'selected' : ''}>\${n}</option>\`
  ).join('') + \`<option value="0" \${rowsPerPage === 0 ? 'selected' : ''}>All</option>\`;

  // Page buttons
  let pagesHtml = '';
  if (totalPages > 1) {
    pagesHtml += \`<button class="pg-btn" \${currentTablePage <= 1 ? 'disabled' : ''} onclick="goToTablePage(1)" title="First page">&laquo;</button>\`;
    pagesHtml += \`<button class="pg-btn" \${currentTablePage <= 1 ? 'disabled' : ''} onclick="goToTablePage(\${currentTablePage - 1})" title="Previous page">&lsaquo;</button>\`;

    const pages = getVisiblePages(currentTablePage, totalPages);
    pages.forEach(p => {
      if (p === '...') {
        pagesHtml += \`<span class="pg-ellipsis">…</span>\`;
      } else {
        pagesHtml += \`<button class="pg-btn \${p === currentTablePage ? 'pg-active' : ''}" onclick="goToTablePage(\${p})">\${p}</button>\`;
      }
    });

    pagesHtml += \`<button class="pg-btn" \${currentTablePage >= totalPages ? 'disabled' : ''} onclick="goToTablePage(\${currentTablePage + 1})" title="Next page">&rsaquo;</button>\`;
    pagesHtml += \`<button class="pg-btn" \${currentTablePage >= totalPages ? 'disabled' : ''} onclick="goToTablePage(\${totalPages})" title="Last page">&raquo;</button>\`;
  }

  container.innerHTML = \`
    <div class="pg-rows-wrap">
      Rows per page:
      <select class="pg-rows-select" onchange="changeRowsPerPage(this.value)">\${optionsHtml}</select>
      <input class="pg-rows-input" type="number" min="1" placeholder="#" title="Type a custom number of rows"
        onkeydown="if(event.key==='Enter'){applyCustomRows(this.value);}" />
    </div>
    <div class="pg-info">Showing \${total === 0 ? 0 : startIdx + 1}–\${endIdx} of \${total}</div>
    <div class="pg-nav">\${pagesHtml}</div>
  \`;
}

/* ── Compute which page numbers to show ── */
function getVisiblePages(current, total) {
  if (total <= 7) return Array.from({length: total}, (_, i) => i + 1);
  const pages = [];
  pages.push(1);
  if (current > 3) pages.push('...');
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i);
  }
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}

function goToTablePage(page) {
  const total = invoices.length;
  const perPage = rowsPerPage === 0 ? total : rowsPerPage;
  const totalPages = rowsPerPage === 0 ? 1 : Math.max(1, Math.ceil(total / perPage));
  if (page < 1 || page > totalPages) return;
  currentTablePage = page;
  renderTablePage();
  // Scroll table to top
  const scroll = document.querySelector('.table-scroll');
  if (scroll) scroll.scrollTop = 0;
}

function changeRowsPerPage(val) {
  const n = parseInt(val, 10);
  rowsPerPage = isNaN(n) ? 50 : n;
  currentTablePage = 1;
  renderTablePage();
}

function applyCustomRows(val) {
  const n = parseInt(val, 10);
  if (!n || n < 1) return;
  rowsPerPage = n;
  currentTablePage = 1;
  // Update dropdown to deselect preset if custom value doesn't match
  const sel = document.querySelector('.pg-rows-select');
  if (sel) {
    const match = [...sel.options].find(o => parseInt(o.value, 10) === n);
    sel.value = match ? match.value : '';
  }
  renderTablePage();
}

/* ── Invoice row ── */
function renderInvoiceRow(inv) {
  const amt      = formatAmt(inv.amount, inv.currency);
  const tr       = document.createElement('tr');
  tr.id = 'row-' + inv.id;
  tr.innerHTML = \`
    <td class="cb-wrap"><input type="checkbox" class="row-cb" data-id="\${inv.id}" onchange="onRowCheck()"/></td>
    <td><span class="type-label">\${escHtml(inv._typeLabel || 'Invoice')}</span></td>
    <td></td>
    <td><span class="tran-id">\${escHtml(inv.tranId)}</span></td>
    <td>\${escHtml(inv.customer)}</td>
    <td>\${escHtml(fmtDisplayDate(inv.date) || '—')}</td>
    <td>\${escHtml(fmtDisplayDate(inv.dueDate) || '—')}</td>
    <td><span class="amount">\${amt}</span></td>
    <td><span class="badge-status \${invStatusClass(inv.statusCode)}">\${escHtml(inv.status || '—')}</span></td>
    <td>
      <div class="row-actions">
        <button type="button" class="icon-btn preview" title="Preview" onclick="previewPDF(\${inv.id},'\${inv.tranId}')">
          <svg width="12" height="12" fill="none" viewBox="0 0 12 12"><ellipse cx="6" cy="6" rx="5" ry="3.5" stroke="currentColor" stroke-width="1.3"/><circle cx="6" cy="6" r="1.5" fill="currentColor"/></svg>
        </button>
        <button type="button" class="icon-btn dl" title="Download PDF" onclick="downloadSingle(\${inv.id},'\${inv.tranId}')">
          <svg width="12" height="12" fill="none" viewBox="0 0 12 12"><path d="M6 1v7M3.5 5.5L6 8l2.5-2.5M1 10h10" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div class="dl-status" style="min-width:72px">
          <span class="status-dot dot-pending" id="row-dot-\${inv.id}"></span>
          <span id="row-lbl-\${inv.id}" style="color:var(--text-muted);font-size:11.5px">Pending</span>
        </div>
      </div>
    </td>
  \`;
  return tr;
}

/* ── Credit Memo row ── */
function renderCreditMemoRow(inv) {
  const amt      = formatAmt(inv.amount, inv.currency);
  const rem      = formatAmt(inv.remaining, inv.currency);
  const tr       = document.createElement('tr');
  tr.id = 'row-' + inv.id;
  tr.innerHTML = \`
    <td class="cb-wrap"><input type="checkbox" class="row-cb" data-id="\${inv.id}" onchange="onRowCheck()"/></td>
    <td><span class="type-label">\${escHtml(inv._typeLabel || 'Credit Memo')}</span></td>
    <td></td>
    <td><span class="tran-id" style="color:var(--rose)">\${escHtml(inv.tranId)}</span></td>
    <td>\${escHtml(inv.customer)}</td>
    <td>\${escHtml(fmtDisplayDate(inv.date) || '—')}</td>
    <td>\${escHtml(fmtDisplayDate(inv.dueDate) || '—')}</td>
    <td><span class="amount credit">\${amt}</span></td>
    <td><span class="badge-status \${cmStatusClass(inv.statusCode)}">\${escHtml(inv.status || '—')}</span></td>
    <td>
      <div class="row-actions">
        <button type="button" class="icon-btn preview" title="Preview" onclick="previewPDF(\${inv.id},'\${inv.tranId}')">
          <svg width="12" height="12" fill="none" viewBox="0 0 12 12"><ellipse cx="6" cy="6" rx="5" ry="3.5" stroke="currentColor" stroke-width="1.3"/><circle cx="6" cy="6" r="1.5" fill="currentColor"/></svg>
        </button>
        <button type="button" class="icon-btn dl" title="Download PDF" onclick="downloadSingle(\${inv.id},'\${inv.tranId}')">
          <svg width="12" height="12" fill="none" viewBox="0 0 12 12"><path d="M6 1v7M3.5 5.5L6 8l2.5-2.5M1 10h10" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div class="dl-status" style="min-width:72px">
          <span class="status-dot dot-pending" id="row-dot-\${inv.id}"></span>
          <span id="row-lbl-\${inv.id}" style="color:var(--text-muted);font-size:11.5px">Pending</span>
        </div>
      </div>
    </td>
  \`;
  return tr;
}

/* ── Invoice Group row ── */
function renderInvoiceGroupRow(inv) {
  const amt      = formatAmt(inv.amount, inv.currency);
  const tr       = document.createElement('tr');
  tr.id = 'row-' + inv.id;
  tr.innerHTML = \`
    <td class="cb-wrap"><input type="checkbox" class="row-cb" data-id="\${inv.id}" onchange="onRowCheck()"/></td>
    <td><span class="type-label">\${escHtml(inv._typeLabel || 'Invoice Group')}</span></td>
    <td></td>
    <td><span class="tran-id" style="color:var(--amber)">\${escHtml(inv.tranId)}</span></td>
    <td>\${escHtml(inv.customer)}</td>
    <td>\${escHtml(fmtDisplayDate(inv.date) || '—')}</td>
    <td>\${escHtml(fmtDisplayDate(inv.dueDate) || '—')}</td>
    <td><span class="amount">\${amt}</span></td>
    <td><span class="badge-status \${grpStatusClass(inv.statusCode)}">\${escHtml(inv.status || '—')}</span></td>
    <td>
      <div class="row-actions">
        <button type="button" class="icon-btn preview" title="Preview" onclick="previewPDF(\${inv.id},'\${inv.tranId}')">
          <svg width="12" height="12" fill="none" viewBox="0 0 12 12"><ellipse cx="6" cy="6" rx="5" ry="3.5" stroke="currentColor" stroke-width="1.3"/><circle cx="6" cy="6" r="1.5" fill="currentColor"/></svg>
        </button>
        <button type="button" class="icon-btn dl" title="Download PDF" onclick="downloadSingle(\${inv.id},'\${inv.tranId}')">
          <svg width="12" height="12" fill="none" viewBox="0 0 12 12"><path d="M6 1v7M3.5 5.5L6 8l2.5-2.5M1 10h10" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div class="dl-status" style="min-width:72px">
          <span class="status-dot dot-pending" id="row-dot-\${inv.id}"></span>
          <span id="row-lbl-\${inv.id}" style="color:var(--text-muted);font-size:11.5px">Pending</span>
        </div>
      </div>
    </td>
  \`;
  return tr;
}

/* ── Status badge helpers ── */
function invStatusClass(code) {
  if (code === 'C') return 'bs-paid';
  if (code === 'A' || code === 'B') return 'bs-open';
  return 'bs-other';
}
function cmStatusClass(code) {
  if (code === 'B') return 'bs-paid';  // Fully Applied
  if (code === 'A') return 'bs-open';  // Open
  return 'bs-other';
}
function grpStatusClass(code) {
  if (code === 'PAIDFULL' || code === 'BILLED') return 'bs-paid';
  if (code === 'OPEN' || code === 'PAIDPART')   return 'bs-open';
  return 'bs-other';
}

/* ── Shared helpers ── */
function avatarInitials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
function formatAmt(val, currency) {
  const n = parseFloat(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
  return currency ? currency + ' ' + n : n;
}

/* ─────────────────────────────────────────
   SELECTION HELPERS
───────────────────────────────────────── */
function getSelectedInvoices() {
  if (allSelected) return invoices;
  return selectedIds.size > 0 ? invoices.filter(inv => selectedIds.has(String(inv.id))) : [];
}

function onRowCheck() {
  // Sync selectedIds with visible checkboxes
  document.querySelectorAll('.row-cb').forEach(cb => {
    const id = cb.dataset.id;
    if (cb.checked) {
      selectedIds.add(id);
    } else {
      selectedIds.delete(id);
      allSelected = false;
    }
  });

  // Update header checkbox
  const visibleCbs = document.querySelectorAll('.row-cb');
  const cbAll = document.getElementById('cb-all');
  if (cbAll && visibleCbs.length > 0) {
    cbAll.checked = [...visibleCbs].every(c => c.checked);
  }

  // Update download button
  const anySelected = allSelected || selectedIds.size > 0;
  document.getElementById('btn-dl-selected').disabled = !anySelected;
}

function onSelectAll(cb) {
  if (cb.checked) {
    allSelected = true;
    invoices.forEach(inv => selectedIds.add(String(inv.id)));
  } else {
    allSelected = false;
    selectedIds.clear();
  }
  document.querySelectorAll('.row-cb').forEach(c => c.checked = cb.checked);
  onRowCheck();
}

function toggleSelectAll() {
  const wasAllSelected = allSelected && selectedIds.size === invoices.length;
  if (wasAllSelected) {
    allSelected = false;
    selectedIds.clear();
    document.querySelectorAll('.row-cb').forEach(c => c.checked = false);
    document.getElementById('cb-all').checked = false;
  } else {
    allSelected = true;
    invoices.forEach(inv => selectedIds.add(String(inv.id)));
    document.querySelectorAll('.row-cb').forEach(c => c.checked = true);
    document.getElementById('cb-all').checked = true;
  }
  onRowCheck();
}


/* ─────────────────────────────────────────
   MODAL NAVIGATION
───────────────────────────────────────── */
function openModal() {
  if (invoices.length === 0) {return; }
  const sel = getSelectedInvoices();
  document.getElementById('chip-count').textContent = sel.length + ' PDF' + (sel.length !== 1 ? 's' : '');
  document.getElementById('chip-est').textContent = Math.round(sel.length * 85);
  goToStep(1);
  document.getElementById('modal-overlay').classList.add('show');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('show');
}

function handleOverlayClick(e) {
  if (e.target === document.getElementById('modal-overlay') && !downloading) closeModal();
}

function resetAndClose() {
  cancelled = false; paused = false; downloading = false;
  dirHandle = null;
  {
    document.getElementById('folder-path').textContent = 'No folder chosen — click Browse to select';
    document.getElementById('folder-path').classList.remove('chosen');
    document.getElementById('folder-picker').classList.remove('selected');
    document.getElementById('fp-browse-btn').classList.remove('chosen');
    document.getElementById('fp-browse-btn').textContent = 'Browse…';
    document.getElementById('fp-title').textContent = 'No folder selected';
    document.getElementById('path-change-btn').style.display = 'none';
    document.getElementById('btn-start').disabled = true;
    document.getElementById('folder-tip').style.display = 'flex';
    document.querySelectorAll('.qf').forEach(q => q.classList.remove('active'));
  }
  allSelected = false;
  selectedIds.clear();
  currentTablePage = 1;
  setStats(invoices.length, 0, 0);
  invoices.forEach(inv => setRowStatus(inv.id, 'pending'));
  renderTablePage();
  closeModal();
}

function goToStep(n) {
  document.getElementById('modal-step-1').style.display = n === 1 ? '' : 'none';
  document.getElementById('modal-step-2').style.display = n === 2 ? '' : 'none';
  document.getElementById('modal-step-3').style.display = n === 3 ? '' : 'none';
}

/* ─────────────────────────────────────────
   FOLDER PICKER  →  File System Access API
───────────────────────────────────────── */
async function pickFolder() {
  try {
    dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    applyFolderUI(dirHandle.name);
  } catch (e) {
    if (e.name === 'AbortError') return;
    if (e.name === 'SecurityError' || (e.message && e.message.includes('system files'))) {
      showToast('The browser blocked direct access to that folder.<br>Please select or create a subfolder inside it (e.g. Downloads › Invoices).', 'warning', 7000);
      try {
        dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
        applyFolderUI(dirHandle.name);
      } catch (_) { /* user cancelled retry */ }
    } else {
      showToast('Could not access the selected folder. Please try a different location.', 'warning', 5000);
    }
  }
}

// Map quick-pick names to well-known File System Access API directory tokens
const WELL_KNOWN_DIRS = {
  'Downloads':            'downloads',
  'Desktop':              'desktop',
  'Documents/Invoices':   'documents'
};

async function pickQuick(el, folderName) {
  document.querySelectorAll('.qf').forEach(q => q.classList.remove('active'));
  el.classList.add('active');
  if (!fsSAPIEnabled) return;

  try {
    const startIn = WELL_KNOWN_DIRS[folderName] || 'downloads';
    dirHandle = await window.showDirectoryPicker({ mode: 'readwrite', startIn: startIn });
    applyFolderUI(dirHandle.name);
  } catch (e) {
    if (e.name === 'AbortError') return;
    if (e.name === 'SecurityError' || (e.message && e.message.includes('system files'))) {
      showToast('The browser blocked direct access to that folder.<br>Please select or create a subfolder inside it (e.g. ' + folderName + ' › Invoices).', 'warning', 7000);
      try {
        const startIn = WELL_KNOWN_DIRS[folderName] || 'downloads';
        dirHandle = await window.showDirectoryPicker({ mode: 'readwrite', startIn: startIn });
        applyFolderUI(dirHandle.name);
      } catch (_) { /* user cancelled retry */ }
    } else {
      showToast('Could not access the selected folder. Please try a different location.', 'warning', 5000);
    }
  }
}

function applyFolderUI(name) {
  document.getElementById('folder-picker').classList.add('selected');
  document.getElementById('fp-title').textContent = name;
  document.getElementById('fp-hint').textContent  = 'Folder selected — PDFs will be saved here';
  document.getElementById('fp-browse-btn').textContent = '✓ Selected';
  document.getElementById('fp-browse-btn').classList.add('chosen');
  document.getElementById('folder-path').textContent = name;
  document.getElementById('folder-path').classList.add('chosen');
  document.getElementById('path-change-btn').style.display = 'inline';
  document.getElementById('folder-tip').style.display = 'none';
  document.getElementById('btn-start').disabled = false;
}

/* ─────────────────────────────────────────
   CONCURRENCY LIMITER
───────────────────────────────────────── */
async function runWithConcurrency(tasks, limit, onTaskDone) {
  const queue  = [...tasks];
  const active = new Set();
  let resolved = false;

  return new Promise((resolve) => {
    function finish() {
      if (resolved) return;
      resolved = true;
      resolve();
    }

    function dispatch() {
      if (cancelled) { finish(); return; }
      while (active.size < limit && queue.length > 0 && !cancelled) {
        const task = queue.shift();
        const p = task().then((result) => {
          active.delete(p);
          if (!cancelled) onTaskDone(result);
          if (cancelled) { finish(); return; }
          if (queue.length === 0 && active.size === 0) finish();
          else dispatch();
        }).catch(() => {
          active.delete(p);
          if (cancelled) { finish(); return; }
          if (queue.length === 0 && active.size === 0) finish();
          else dispatch();
        });
        active.add(p);
      }
      if (active.size === 0 && (queue.length === 0 || cancelled)) finish();
    }
    dispatch();
  });
}

/* ─────────────────────────────────────────
   DOWNLOAD ONE PDF  →  action=getPDF
───────────────────────────────────────── */
async function downloadOnePDF(inv) {
  const url = BASE_URL + '&action=getPDF&id=' + inv.id + '&tranid=' + encodeURIComponent(inv.tranId) + '&type=' + encodeURIComponent(inv._typeKey || currentPage);
  const resp = await fetch(url, { signal: abortCtrl ? abortCtrl.signal : undefined });
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
  const ct = resp.headers.get('Content-Type') || '';
  if (!ct.includes('pdf') && !ct.includes('octet')) {
    const txt = await resp.text();
    try { const obj = JSON.parse(txt); throw new Error(obj.error || txt); }
    catch (_) { throw new Error(txt.slice(0, 120)); }
  }
  return await resp.arrayBuffer();
}

/* ─────────────────────────────────────────
   WRITE FILE  →  File System Access API
   handle can be the root dir OR a date subfolder handle
───────────────────────────────────────── */
async function writePDFToFolder(handle, filename, buffer) {
  if (!handle || !handle.getFileHandle) {
    // Fallback: trigger browser download if FS API handle is not available
    const blob = new Blob([buffer], { type: 'application/pdf' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
    return;
  }
  const fileHandle = await handle.getFileHandle(filename, { create: true });
  const writable   = await fileHandle.createWritable();
  await writable.write(buffer);
  await writable.close();
}

/* ─────────────────────────────────────────
   RESOLVE WRITE TARGET
   If "Create date subfolder" is ON and FS API
   is available, get or create YYYY-MM-DD subfolder
   inside dirHandle and return it. Otherwise return
   dirHandle as-is.
───────────────────────────────────────── */
async function resolveWriteTarget(baseHandle) {
  const wantSubfolder = document.getElementById('toggle-subfolder').classList.contains('on');
  if (!wantSubfolder || !baseHandle || baseHandle._quickPick) return baseHandle;

  const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  try {
    const subHandle = await baseHandle.getDirectoryHandle(dateStr, { create: true });
    return subHandle;
  } catch (e) {
    return baseHandle;
  }
}

/* ─────────────────────────────────────────
   OPEN FOLDER AFTER DOWNLOAD
   Best-effort: browser security prevents
   opening OS file explorer directly, so we:
   1. Try the Notifications API for a desktop ping
   2. Re-open showDirectoryPicker on the same
      handle (Chrome 111+) so the user lands
      at the right folder in the picker
   3. Fall back to a prominent UI message

  // 1. Desktop notification (non-blocking)
  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      new Notification('NetSuite Download Complete', {
        body: \`PDFs saved to "\${handle.name}". Open your file manager to view them.\`,
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><text y="28" font-size="28">📁</text></svg>'
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(p => {
        if (p === 'granted') {
          new Notification('NetSuite Download Complete', {
            body: \`PDFs saved to "\${handle.name}"\`
          });
        }
      });
    }
  }

  // 2. Try re-opening directory picker at same location (Chrome 111+)
  try {
    if (typeof handle.requestPermission === 'function') {
      await handle.requestPermission({ mode: 'read' });
    }
    // showDirectoryPicker with startIn lands user at the saved folder
    await window.showDirectoryPicker({ startIn: handle, mode: 'read' });
  } catch (e) {
    if (e.name !== 'AbortError') {
    }
  }
}

/* ─────────────────────────────────────────
   PAUSE / RESUME
───────────────────────────────────────── */
function togglePause() {
  paused = !paused;
  const btn = document.getElementById('btn-pause');
  const pill = document.getElementById('dl-status-pill');
  const statusText = document.getElementById('dl-status-text');
  const pulse = document.getElementById('dl-pulse');

  if (paused) {
    btn.innerHTML = '<svg width="11" height="11" fill="none" viewBox="0 0 11 11"><path d="M2 2l7 4-7 4z" fill="currentColor"/></svg> Resume';
    btn.className = 'ctrl-btn';
    pill.style.background = '#E8923A22';
    pill.style.borderColor = '#F0B87A44';
    statusText.textContent = 'Paused';
    pulse.style.background = 'var(--amber)';
  } else {
    btn.innerHTML = '<svg width="11" height="11" fill="none" viewBox="0 0 11 11"><rect x="1.5" y="1" width="3" height="9" rx="1" fill="currentColor"/><rect x="6.5" y="1" width="3" height="9" rx="1" fill="currentColor"/></svg> Pause';
    btn.className = 'ctrl-btn ctrl-pause';
    pill.style.background = '#2E9E9E33';
    pill.style.borderColor = '#4DC8C844';
    statusText.textContent = 'Active';
    pulse.style.background = 'var(--teal-glow)';
  }
}

/* ─────────────────────────────────────────
   CANCEL
───────────────────────────────────────── */
function cancelDownload() {
  cancelled = true;
  paused = false;
  if (abortCtrl) abortCtrl.abort();
}

/* ─────────────────────────────────────────
   START DOWNLOAD  (main orchestrator)
───────────────────────────────────────── */
async function startDownload() {
  const selected   = getSelectedInvoices();
  if (selected.length === 0) {return; }
  if (!dirHandle && fsSAPIEnabled) {return; }
  if (downloading) return;

  const skipErr        = document.getElementById('f-skiperr').checked;
  const concur         = parseInt(document.getElementById('f-concur').value, 10);
  const total          = selected.length;
  const dirName        = dirHandle ? dirHandle.name : 'Downloads';

  // Resolve actual write target (may be a date subfolder if toggle is on)
  let writeHandle = await resolveWriteTarget(dirHandle);
  _lastWriteHandle = writeHandle;
  const writeDirName = (writeHandle && writeHandle.name) ? writeHandle.name : dirName;

  successCount = 0;
  failedCount  = 0;
  failedItems  = [];
  cancelled    = false;
  abortCtrl    = new AbortController();
  paused       = false;
  downloading  = true;
  dlStartTime  = Date.now();

  // Reset row statuses
  selected.forEach(inv => setRowStatus(inv.id, 'pending'));
  setStats(total, 0, 0);

  // Update step 2 UI
  document.getElementById('dest-path-display').textContent = writeDirName;
  document.getElementById('step2-sub').textContent = \`Saving \${total} PDF\${total!==1?'s':''} — concurrency: \${concur}\`;
  document.getElementById('concur-val').textContent = concur;
  document.getElementById('skiperr-disp').textContent = skipErr ? 'On' : 'Off';
  document.getElementById('dl-hero-sub').textContent  = \`\${total} invoice\${total!==1?'s':''} · concurrency \${concur}\`;
  setProgress(0, total, 'Starting…');

  // Go to step 2
  goToStep(2);



  const done = { n: 0 };

  const tasks = selected.map(inv => async () => {
    // Wait while paused
    while (paused && !cancelled) {
      await new Promise(r => setTimeout(r, 200));
    }
    if (cancelled) return { inv, ok: false, cancelled: true };

    setRowStatus(inv.id, 'active');
    const filename = buildFilename(inv);
    const t0 = Date.now();

    try {
      const buffer = await downloadOnePDF(inv);
      if (cancelled) return { inv, ok: false, cancelled: true };

      const kb = (buffer.byteLength / 1024).toFixed(0);
      const ms = Date.now() - t0;
      const kbps = ms > 0 ? Math.round(buffer.byteLength / ms) : 0;

      // Update speed display
      document.getElementById('dm-speed').textContent  = kbps + ' KB/s';
      document.getElementById('speed-disp').textContent = kbps + ' KB/s';

      await writePDFToFolder(writeHandle, filename, buffer);

      setRowStatus(inv.id, 'ok');
      return { inv, ok: true, filename, kb };
    } catch (e) {
      console.error('[PDC] batch download failed for id=' + inv.id, e);
      setRowStatus(inv.id, 'err', e.message);
      if (!skipErr) cancelled = true;
      return { inv, ok: false, error: e.message };
    }
  });

  await runWithConcurrency(tasks, concur, (result) => {
    if (result.cancelled) return;
    done.n++;

    if (result.ok) {
      successCount++;
    } else {
      failedCount++;
      failedItems.push({ tranId: result.inv.tranId, reason: result.error || 'Unknown error' });
    }

    setStats(total, successCount, failedCount);
    setProgress(done.n, total, result.ok ? result.filename : ('FAILED: ' + result.inv.tranId));
  });

  downloading = false;
  const elapsed = ((Date.now() - dlStartTime) / 1000).toFixed(1);

  if (cancelled) {
    closeModal();
  } else {
    // Go to step 3
    const hasErrors = failedCount > 0;
    document.getElementById('done-icon').textContent  = hasErrors ? '⚠️' : '✅';
    document.getElementById('done-title').innerHTML   = hasErrors
      ? \`Download <em style="color:var(--amber)">Finished</em>\`
      : \`PDFs <em>Saved</em>\`;
    document.getElementById('done-sub').textContent   = hasErrors
      ? \`\${successCount} succeeded, \${failedCount} failed\`
      : \`All \${successCount} invoice\${successCount!==1?'s':''} saved successfully in \${elapsed}s\`;
    document.getElementById('done-success').textContent = successCount;
    document.getElementById('done-failed').textContent  = failedCount;
    document.getElementById('done-time').textContent    = elapsed + 's';
    document.getElementById('done-path').textContent    = writeDirName;
    document.getElementById('done-path-card').style.display = 'flex';
    document.getElementById('step3-sub').textContent = \`\${successCount} PDF\${successCount!==1?'s':''} saved to \${writeDirName}\`;

    // Show failed items with reasons
    var errList = document.getElementById('done-error-list');
    var errItems = document.getElementById('done-error-items');
    if (hasErrors && failedItems.length > 0) {
      errItems.innerHTML = failedItems.map(function(f) {
        return '<li><strong>' + escHtml(f.tranId) + '</strong> — ' + escHtml(f.reason) + '</li>';
      }).join('');
      errList.style.display = 'block';
    } else {
      errList.style.display = 'none';
      errItems.innerHTML = '';
    }

    goToStep(3);
  }
}

/* ─────────────────────────────────────────
   SPINNER KEYFRAME (injected)
───────────────────────────────────────── */
const style = document.createElement('style');
style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
document.head.appendChild(style);
`;

  return { getScript };
});
