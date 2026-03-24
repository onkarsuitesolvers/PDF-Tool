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
  const getScript = (baseUrl, customers, subsidiaries) => `
/* ── Server-side lookup data (embedded at render time) ── */
const __LOOKUPS__ = {
  customers:    ${JSON.stringify(customers)},
  subsidiaries: ${JSON.stringify(subsidiaries)}
};

'use strict';

/* ─────────────────────────────────────────
   CONSTANTS & STATE
───────────────────────────────────────── */
const BASE_URL = '${baseUrl}';

let invoices      = [];   // all loaded invoices
let dirHandle     = null; // FileSystemDirectoryHandle (Chrome/Edge)
let fsSAPIEnabled = false;
let cancelled     = false;
let paused        = false;
let downloading   = false;
let dlStartTime   = 0;
let successCount  = 0;
let failedCount   = 0;
const rowStatus   = {};
let currentPage   = 'invoices'; // 'invoices' | 'creditmemos' | 'invoicegroups'

/* ─────────────────────────────────────────
   PAGE CONFIG  — drives all dynamic UI
───────────────────────────────────────── */
const PAGE_CONFIG = {
  invoices: {
    title:       '<em>Invoices</em>',
    sub:         'Search, preview and download Invoice PDFs by customer or date range',
    searchLabel: 'Search Invoices',
    emptyIcon:   '🔎',
    emptyText:   'No invoices found',
    emptySub:    'Try adjusting your filters or broadening the date range',
    tableMeta:   'invoices',
    statusOptions: [
      { value: '',        label: 'All Statuses' },
      { value: 'open',    label: 'Open / Partial' },
      { value: 'paid',    label: 'Paid in Full' },
      { value: 'overdue', label: 'Overdue' }
    ],
    theadHTML: \`<tr>
      <th><input type="checkbox" id="cb-all" onchange="onSelectAll(this)"/></th>
      <th>Tran ID</th><th>Customer</th><th>Date</th><th>Due Date</th>
      <th>Amount</th><th>Status</th><th>DL Status</th>
    </tr>\`,
    rowRendererKey: 'renderInvoiceRow',
    action: 'getInvoices',
    prefix: 'INV'
  },
  creditmemos: {
    title:       '<em>Credit Memos</em>',
    sub:         'Search, preview and download credit memo PDFs by customer or date range',
    searchLabel: 'Search Credit Memos',
    emptyIcon:   '📋',
    emptyText:   'No credit memos found',
    emptySub:    'Try adjusting your filters — credit memos use different status codes',
    tableMeta:   'credit memos',
    statusOptions: [
      { value: '',        label: 'All Statuses' },
      { value: 'open',    label: 'Open' },
      { value: 'applied', label: 'Fully Applied' }
    ],
    theadHTML: \`<tr>
      <th><input type="checkbox" id="cb-all" onchange="onSelectAll(this)"/></th>
      <th>CM Number</th><th>Customer</th><th>Date</th><th>CM Amount</th>
      <th>Remaining</th><th>Status</th><th>DL Status</th>
    </tr>\`,
    rowRendererKey: 'renderCreditMemoRow',
    action: 'getCreditMemos',
    prefix: 'CM'
  },
  invoicegroups: {
    title:       '<em>Invoice Groups</em>',
    sub:         'Search, preview and download Invoice Group PDFs by customer or date range',
    searchLabel: 'Search Invoice Groups',
    emptyIcon:   '📦',
    emptyText:   'No invoice groups found',
    emptySub:    'Invoice groups must be created before they appear here',
    tableMeta:   'invoice groups',
    statusOptions: [],
    hideFilters: ['status', 'subsidiary'],
    theadHTML: \`<tr>
      <th><input type="checkbox" id="cb-all" onchange="onSelectAll(this)"/></th>
      <th>Group ID</th><th>Customer</th><th>Date</th>
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

  // Title / subtitle
  document.getElementById('page-title').innerHTML = cfg.title;
  document.getElementById('page-sub').textContent  = cfg.sub;

  // Search button label
  document.getElementById('btn-search-label').textContent = cfg.searchLabel;

  // Status dropdown
  const sel        = document.getElementById('f-status');
  const hideFilters = cfg.hideFilters || [];
  sel.innerHTML = cfg.statusOptions.map(o =>
    \`<option value="\${o.value}">\${o.label}</option>\`
  ).join('');

  // Show/hide status and subsidiary filter groups
  document.getElementById('fg-status').style.display     = hideFilters.includes('status')     ? 'none' : '';
  document.getElementById('fg-subsidiary').style.display = hideFilters.includes('subsidiary') ? 'none' : '';

  // Table headers
  document.getElementById('inv-thead').innerHTML = cfg.theadHTML;

  // Empty state
  document.getElementById('empty-icon').textContent = cfg.emptyIcon;
  document.getElementById('empty-text').textContent = cfg.emptyText;
  document.getElementById('empty-sub').textContent  = cfg.emptySub;

  // Reset results
  invoices = [];
  document.getElementById('inv-tbody').innerHTML   = '';
  document.getElementById('table-meta').textContent = '0 ' + cfg.tableMeta;
  document.getElementById('table-container').classList.remove('show');
  document.getElementById('empty-state').classList.remove('show');
  document.getElementById('btn-dl-selected').disabled = true;
  setStats(0, 0, 0);
}

/* ─────────────────────────────────────────
   TRANSACTION TYPE CHANGE
───────────────────────────────────────── */
function onTranTypeChange(val) {
  switchPage(val);
}

/* ─────────────────────────────────────────
   UNIFIED SEARCH DISPATCHER
───────────────────────────────────────── */
async function doSearch() {
  const cfg = PAGE_CONFIG[currentPage];
  const btn = document.getElementById('btn-search');
  btn.disabled = true;
  const origLabel = cfg.searchLabel;
  document.getElementById('btn-search-label').textContent = 'Searching…';

  const params = new URLSearchParams({
    action:     cfg.action,
    dateFrom:   document.getElementById('f-dateFrom').value,
    dateTo:     document.getElementById('f-dateTo').value,
    customer:   msGetValues('customer').join(','),
    subsidiary: msGetValues('subsidiary').join(','),
    status:     document.getElementById('f-status').value
  });


  try {
    const resp = await fetch(BASE_URL + '&' + params.toString());
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    if (!data.success) throw new Error(data.error || 'Unknown error');

    invoices = data.invoices || [];
    renderTable(invoices);
    setStats(invoices.length, 0, 0);

    if (invoices.length === 0) {
      document.getElementById('table-container').classList.remove('show');
      document.getElementById('empty-state').classList.add('show');
    } else {
      document.getElementById('empty-state').classList.remove('show');
      document.getElementById('table-container').classList.add('show');
    }
  } catch (e) {
  } finally {
    btn.disabled = false;
    document.getElementById('btn-search-label').textContent = origLabel;
  }
}

/* ─────────────────────────────────────────
   MULTISELECT WIDGET
───────────────────────────────────────── */
const MS_STATE = {
  customer:   { options: [], selected: new Set(), open: false },
  subsidiary: { options: [], selected: new Set(), open: false }
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
    document.getElementById(\`ms-\${key}-search\`).focus();
  }
}

function msClose(key) {
  MS_STATE[key].open = false;
  document.getElementById(\`ms-\${key}-wrap\`).classList.remove('open');
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
      <span class="ms-option-sub">#\${o.id}</span>
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
}

function msClear(key) {
  MS_STATE[key].selected.clear();
  msRenderList(key, MS_STATE[key].options);
  msUpdateTrigger(key);
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
    ph.textContent = key === 'customer' ? 'All Customers' : 'All Subsidiaries';
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
}

function msGetValues(key) {
  return [...MS_STATE[key].selected];
}


/* ─────────────────────────────────────────
   INIT
───────────────────────────────────────── */
(function init() {
  fsSAPIEnabled = ('showDirectoryPicker' in window);

  if (!fsSAPIEnabled) {
    document.getElementById('fsapi-warn').classList.add('show');
    document.getElementById('zip-warn').classList.add('show');
    document.getElementById('folder-section-label').textContent = 'Download Mode';
    document.getElementById('fp-title').textContent = 'ZIP Download (browser default folder)';
    document.getElementById('fp-hint').textContent  = 'PDFs will be bundled into a ZIP file';
    document.getElementById('folder-tip').style.display = 'none';
    document.getElementById('chip-mode').querySelector('svg').parentNode
      .querySelector('svg').nextSibling.textContent = ' ZIP Bundle';
    // Auto-enable start in ZIP mode
    dirHandle = { name: 'ZIP Download' };
    document.getElementById('btn-start').disabled = false;
    document.getElementById('folder-path').textContent = 'PDFs will be bundled as invoices.zip';
    document.getElementById('folder-path').classList.add('chosen');
    document.getElementById('quick-folders').style.display = 'none';
  }

  // Default date range: last 90 days
  const today = new Date();
  const ago90 = new Date(today); ago90.setDate(ago90.getDate() - 90);
  document.getElementById('f-dateTo').value   = fmtDate(today);
  document.getElementById('f-dateFrom').value = fmtDate(ago90);

  // Populate multiselect dropdowns from server-embedded data
  msSetOptions('customer',   __LOOKUPS__.customers    || []);
  msSetOptions('subsidiary', __LOOKUPS__.subsidiaries || []);
})();

function fmtDate(d) { return d.toISOString().slice(0, 10); }

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
  const pat  = document.getElementById('f-filename').value;
  const tid  = (inv.tranId   || 'doc').replace(/[^a-zA-Z0-9_\\-]/g, '_');
  const cust = (inv.customer || 'unknown').replace(/[^a-zA-Z0-9_\\-]/g, '_').slice(0, 30);
  const dt   = (inv.date     || '').replace(/-/g, '');
  if (pat === 'tranid_date') return \`\${tid}_\${dt}.pdf\`;
  if (pat === 'id_tranid')   return \`\${inv.id}_\${tid}.pdf\`;
  if (pat === 'cust_tranid') return \`\${cust}_\${tid}.pdf\`;
  return \`\${tid}.pdf\`;
}

function updatePreview() {
  const pat = document.getElementById('f-filename').value;
  const samples = {
    'tranid':      'INV-10482.pdf',
    'tranid_date': 'INV-10482_20260301.pdf',
    'id_tranid':   '12345_INV-10482.pdf',
    'cust_tranid': 'Acme-Corp_INV-10482.pdf'
  };
  document.getElementById('filename-preview').innerHTML =
    \`<span>Preview:</span> \${samples[pat] || 'INV-10482.pdf'}\`;
}

/* ─────────────────────────────────────────
   ROW STATUS
───────────────────────────────────────── */
function setRowStatus(id, status) {
  rowStatus[id] = status;
  const dot = document.getElementById('row-dot-' + id);
  const lbl = document.getElementById('row-lbl-' + id);
  const row = document.getElementById('row-' + id);
  if (!dot) return;
  dot.className = 'status-dot dot-' + status;
  if (lbl) lbl.textContent = status === 'ok'     ? '✓ Saved'
                            : status === 'err'    ? '✗ Failed'
                            : status === 'active' ? 'Downloading…'
                            : 'Pending';
  if (row) {
    row.className = status === 'ok'     ? 'row-ok'
                  : status === 'err'    ? 'row-err'
                  : status === 'active' ? 'row-active'
                  : '';
  }
}

/* ─────────────────────────────────────────
   SEARCH (legacy alias — kept for any
   inline onclick="searchInvoices()" calls)
───────────────────────────────────────── */
function searchInvoices() { doSearch(); }

/* ─────────────────────────────────────────
   RENDER TABLE  (dispatches to row renderer)
───────────────────────────────────────── */
function renderTable(list) {
  const cfg   = PAGE_CONFIG[currentPage];
  const tbody = document.getElementById('inv-tbody');
  tbody.innerHTML = '';

  // Re-attach cb-all after thead was rewritten by switchPage
  const cbAll = document.getElementById('cb-all');
  if (cbAll) cbAll.onchange = function() { onSelectAll(this); };

  // Resolve renderer by string key (avoids forward-reference issues)
  const renderers = {
    renderInvoiceRow,
    renderCreditMemoRow,
    renderInvoiceGroupRow
  };
  const rowRenderer = renderers[cfg.rowRendererKey];

  list.forEach((item) => {
    rowStatus[item.id] = 'pending';
    const tr = rowRenderer(item);
    tbody.appendChild(tr);
  });

  const lbl = list.length + ' ' + cfg.tableMeta;
  document.getElementById('table-meta').textContent = lbl;
}

/* ── Invoice row ── */
function renderInvoiceRow(inv) {
  const initials = avatarInitials(inv.customer);
  const amt      = formatAmt(inv.amount, inv.currency);
  const tr       = document.createElement('tr');
  tr.id = 'row-' + inv.id;
  tr.innerHTML = \`
    <td class="cb-wrap"><input type="checkbox" class="row-cb" data-id="\${inv.id}" onchange="onRowCheck()"/></td>
    <td><span class="tran-id">\${escHtml(inv.tranId)}</span></td>
    <td><div class="cust-cell"><div class="cust-av">\${escHtml(initials)}</div>\${escHtml(inv.customer)}</div></td>
    <td>\${escHtml(inv.date || '—')}</td>
    <td>\${escHtml(inv.dueDate || '—')}</td>
    <td><span class="amount">\${amt}</span></td>
    <td><span class="badge-status \${invStatusClass(inv.statusCode)}">\${escHtml(inv.status || '—')}</span></td>
    <td>
      <div class="row-actions">
        <button class="icon-btn preview" title="Preview" onclick="previewPDF(\${inv.id},'\${inv.tranId}')">
          <svg width="12" height="12" fill="none" viewBox="0 0 12 12"><ellipse cx="6" cy="6" rx="5" ry="3.5" stroke="currentColor" stroke-width="1.3"/><circle cx="6" cy="6" r="1.5" fill="currentColor"/></svg>
        </button>
        <button class="icon-btn dl" title="Download PDF" onclick="downloadSingle(\${inv.id},'\${inv.tranId}')">
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
  const initials = avatarInitials(inv.customer);
  const amt      = formatAmt(inv.amount, inv.currency);
  const rem      = formatAmt(inv.remaining, inv.currency);
  const tr       = document.createElement('tr');
  tr.id = 'row-' + inv.id;
  tr.innerHTML = \`
    <td class="cb-wrap"><input type="checkbox" class="row-cb" data-id="\${inv.id}" onchange="onRowCheck()"/></td>
    <td><span class="tran-id" style="color:var(--rose)">\${escHtml(inv.tranId)}</span></td>
    <td><div class="cust-cell"><div class="cust-av" style="background:#E8EEF8;color:#3B6CB5">\${escHtml(initials)}</div>\${escHtml(inv.customer)}</div></td>
    <td>\${escHtml(inv.date || '—')}</td>
    <td><span class="amount credit">\${amt}</span></td>
    <td style="color:var(--text-muted);font-size:12.5px">\${rem}</td>
    <td><span class="badge-status \${cmStatusClass(inv.statusCode)}">\${escHtml(inv.status || '—')}</span></td>
    <td>
      <div class="row-actions">
        <button class="icon-btn preview" title="Preview" onclick="previewPDF(\${inv.id},'\${inv.tranId}')">
          <svg width="12" height="12" fill="none" viewBox="0 0 12 12"><ellipse cx="6" cy="6" rx="5" ry="3.5" stroke="currentColor" stroke-width="1.3"/><circle cx="6" cy="6" r="1.5" fill="currentColor"/></svg>
        </button>
        <button class="icon-btn dl" title="Download PDF" onclick="downloadSingle(\${inv.id},'\${inv.tranId}')">
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
  const initials = avatarInitials(inv.customer);
  const amt      = formatAmt(inv.amount, inv.currency);
  const tr       = document.createElement('tr');
  tr.id = 'row-' + inv.id;
  tr.innerHTML = \`
    <td class="cb-wrap"><input type="checkbox" class="row-cb" data-id="\${inv.id}" onchange="onRowCheck()"/></td>
    <td><span class="tran-id" style="color:var(--amber)">\${escHtml(inv.tranId)}</span></td>
    <td><div class="cust-cell"><div class="cust-av" style="background:#FEF0E0;color:#A07030">\${escHtml(initials)}</div>\${escHtml(inv.customer)}</div></td>
    <td>\${escHtml(inv.date || '—')}</td>
    <td><span class="amount">\${amt}</span></td>
    <td><span class="badge-status \${grpStatusClass(inv.statusCode)}">\${escHtml(inv.status || '—')}</span></td>
    <td>
      <div class="row-actions">
        <button class="icon-btn preview" title="Preview" onclick="previewPDF(\${inv.id},'\${inv.tranId}')">
          <svg width="12" height="12" fill="none" viewBox="0 0 12 12"><ellipse cx="6" cy="6" rx="5" ry="3.5" stroke="currentColor" stroke-width="1.3"/><circle cx="6" cy="6" r="1.5" fill="currentColor"/></svg>
        </button>
        <button class="icon-btn dl" title="Download PDF" onclick="downloadSingle(\${inv.id},'\${inv.tranId}')">
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
  if (code === 'BILLED') return 'bs-paid'; // Billed/Closed
  if (code === 'OPEN')   return 'bs-open'; // Open
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
  const checked = [...document.querySelectorAll('.row-cb:checked')];
  const ids = new Set(checked.map(c => c.dataset.id));
  return ids.size > 0 ? invoices.filter(inv => ids.has(String(inv.id))) : invoices;
}

function onRowCheck() {
  const any = document.querySelectorAll('.row-cb:checked').length > 0;
  document.getElementById('btn-dl-selected').disabled = !any;
}

function onSelectAll(cb) {
  document.querySelectorAll('.row-cb').forEach(c => c.checked = cb.checked);
  onRowCheck();
}

function toggleSelectAll() {
  const cbs = document.querySelectorAll('.row-cb');
  const allChecked = [...cbs].every(c => c.checked);
  cbs.forEach(c => c.checked = !allChecked);
  document.getElementById('cb-all').checked = !allChecked;
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
  dirHandle = fsSAPIEnabled ? null : { name: 'ZIP Download' };
  if (fsSAPIEnabled) {
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
  setStats(invoices.length, 0, 0);
  invoices.forEach(inv => setRowStatus(inv.id, 'pending'));
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
  if (!fsSAPIEnabled) {
    dirHandle = { name: 'ZIP Download (browser default)' };
    document.getElementById('btn-start').disabled = false;
    return;
  }

  try {
    dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    applyFolderUI(dirHandle.name);
  } catch (e) {
    if (e.name !== 'AbortError') {
    }
  }
}

function pickQuick(el, folderName) {
  document.querySelectorAll('.qf').forEach(q => q.classList.remove('active'));
  el.classList.add('active');
  // In real usage showDirectoryPicker would open, here we show chosen name as hint
  if (!fsSAPIEnabled) return;
  // For demo purposes set a display name (actual picker is required for FS API writes)
  dirHandle = { name: folderName, _quickPick: true };
  applyFolderUI(folderName);
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

  return new Promise((resolve) => {
    function dispatch() {
      while (active.size < limit && queue.length > 0) {
        const task = queue.shift();
        const p = task().then((result) => {
          active.delete(p);
          onTaskDone(result);
          if (queue.length === 0 && active.size === 0) resolve();
          else dispatch();
        });
        active.add(p);
      }
      if (active.size === 0 && queue.length === 0) resolve();
    }
    dispatch();
  });
}

/* ─────────────────────────────────────────
   DOWNLOAD ONE PDF  →  action=getPDF
───────────────────────────────────────── */
async function downloadOnePDF(inv) {
  const url = BASE_URL + '&action=getPDF&id=' + inv.id + '&tranid=' + encodeURIComponent(inv.tranId) + '&type=' + encodeURIComponent(currentPage);
  const resp = await fetch(url);
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

  const dateStr = fmtDate(new Date()); // YYYY-MM-DD
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
  document.getElementById('btn-cancel').disabled = true;
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
  const useZip         = !fsSAPIEnabled || (dirHandle && dirHandle._quickPick);
  const total          = selected.length;
  const dirName        = dirHandle ? dirHandle.name : 'Downloads';

  // Resolve actual write target (may be a date subfolder if toggle is on)
  let writeHandle = dirHandle;
  if (!useZip) {
    writeHandle = await resolveWriteTarget(dirHandle);
  }
  _lastWriteHandle = writeHandle;
  const writeDirName = (writeHandle && writeHandle.name) ? writeHandle.name : dirName;

  successCount = 0;
  failedCount  = 0;
  cancelled    = false;
  paused       = false;
  downloading  = true;
  dlStartTime  = Date.now();

  // Reset row statuses
  selected.forEach(inv => setRowStatus(inv.id, 'pending'));
  setStats(total, 0, 0);

  // Update step 2 UI
  document.getElementById('dest-path-display').textContent = useZip ? 'invoices.zip (Downloads)' : writeDirName;
  document.getElementById('step2-sub').textContent = \`Saving \${total} PDF\${total!==1?'s':''} — concurrency: \${concur}\`;
  document.getElementById('concur-val').textContent = concur;
  document.getElementById('skiperr-disp').textContent = skipErr ? 'On' : 'Off';
  document.getElementById('dl-hero-sub').textContent  = \`\${total} invoice\${total!==1?'s':''} · concurrency \${concur}\${useZip?' · ZIP mode':''}\`;
  setProgress(0, total, 'Starting…');

  // Go to step 2
  goToStep(2);

  let zip = (useZip) ? new JSZip() : null;


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
      const kb = (buffer.byteLength / 1024).toFixed(0);
      const ms = Date.now() - t0;
      const kbps = ms > 0 ? Math.round(buffer.byteLength / ms) : 0;

      // Update speed display
      document.getElementById('dm-speed').textContent  = kbps + ' KB/s';
      document.getElementById('speed-disp').textContent = kbps + ' KB/s';

      if (useZip) {
        zip.file(filename, buffer);
      } else {
        await writePDFToFolder(writeHandle, filename, buffer);
      }

      setRowStatus(inv.id, 'ok');
      return { inv, ok: true, filename, kb };
    } catch (e) {
      setRowStatus(inv.id, 'err');
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
    }

    setStats(total, successCount, failedCount);
    setProgress(done.n, total, result.ok ? result.filename : ('FAILED: ' + result.inv.tranId));
  });

  downloading = false;
  const elapsed = ((Date.now() - dlStartTime) / 1000).toFixed(1);

  if (cancelled) {
    document.getElementById('dl-status-text').textContent = 'Stopped';
    document.getElementById('dl-pulse').style.background = 'var(--rose)';
  } else {
    // ZIP: trigger browser download
    if (useZip && successCount > 0) {
      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      saveAs(blob, 'invoices_' + fmtDate(new Date()) + '.zip');
    }


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
    document.getElementById('done-path').textContent    = useZip
      ? 'invoices_' + fmtDate(new Date()) + '.zip (Downloads folder)'
      : writeDirName;
    document.getElementById('done-path-card').style.display = 'flex';
    document.getElementById('step3-sub').textContent = useZip
      ? 'ZIP archive saved to Downloads'
      : \`\${successCount} PDF\${successCount!==1?'s':''} saved to \${writeDirName}\`;

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
