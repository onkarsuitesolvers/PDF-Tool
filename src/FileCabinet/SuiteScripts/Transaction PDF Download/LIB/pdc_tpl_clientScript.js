/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 *
 * PDC — Client-Side JavaScript Template
 * All browser-side logic: folder tree (multi-select), file-type multiselect,
 * explicit search action, table/pagination, modal, download orchestrator,
 * File System Access API, concurrency limiter, row renderer, etc.
 *
 * Server-injected values: baseUrl
 */
define([], () => {

  /**
   * @param {string} baseUrl  Suitelet base URL
   * @returns {string} Complete <script> block content
   */
  const getScript = (baseUrl) => `
'use strict';

/* ── Server-side lookup data ──
   Fetched via action=getLookups rather than embedded server-side: the
   folder list grows with the account's File Cabinet and NetSuite's
   LONGTEXT field type caps out at 100,000 characters, which large
   accounts can exceed. */
async function fetchFolderLookups() {
  try {
    const resp = await fetch('${baseUrl}&action=getLookups');
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    if (!data.success) throw new Error(data.error || 'Unknown error');
    return data.folders || [];
  } catch (e) {
    console.error('[PDC] fetchFolderLookups failed:', e);
    return [];
  }
}

/* ─────────────────────────────────────────
   TOAST NOTIFICATIONS
───────────────────────────────────────── */
const TOAST_ICONS = {
  warning: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2L1 18h18L10 2z" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M10 8v4M10 14v1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  error:   '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8.5" stroke="currentColor" stroke-width="1.5"/><path d="M7 7l6 6M13 7l-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  success: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8.5" stroke="currentColor" stroke-width="1.5"/><path d="M6.5 10.5l2.5 2.5 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  info:    '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8.5" stroke="currentColor" stroke-width="1.5"/><path d="M10 9v5M10 6.5v1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
};

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

let files         = [];   // all loaded files
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

/* ── Pagination state ── */
let currentTablePage = 1;
let rowsPerPage      = 50;
let allSelected      = false;
const selectedIds    = new Set();

/* ─────────────────────────────────────────
   FILE TYPE OPTIONS
───────────────────────────────────────── */
const FILE_TYPE_OPTIONS = [
  { id: 'PDF',        label: 'PDF' },
  { id: 'WORD',       label: 'Word Document' },
  { id: 'EXCEL',      label: 'Excel Spreadsheet' },
  { id: 'POWERPOINT', label: 'PowerPoint' },
  { id: 'CSV',        label: 'CSV' },
  { id: 'PLAINTEXT',  label: 'Plain Text' },
  { id: 'HTMLDOC',    label: 'HTML' },
  { id: 'XMLDOC',     label: 'XML' },
  { id: 'JPGIMAGE',   label: 'JPEG Image' },
  { id: 'PNGIMAGE',   label: 'PNG Image' },
  { id: 'GIFIMAGE',   label: 'GIF Image' },
  { id: 'ZIP',        label: 'ZIP Archive' },
  { id: 'JSON',       label: 'JSON' }
];

/* ─────────────────────────────────────────
   FOLDER TREE  (multi-select, tri-state)
   Selection here never triggers a search by
   itself — the user must click "Search Files".
───────────────────────────────────────── */
let FOLDER_TREE = { roots: [], byId: {}, order: [] };
let folderFilterQuery = '';

function buildFolderTree(flatFolders) {
  const byId = {};
  flatFolders.forEach((f) => {
    byId[f.id] = {
      id: f.id, name: f.name, parentId: f.parentId || null,
      children: [], depth: 0,
      checked: false, indeterminate: false, expanded: false,
      match: false, hasMatchDescendant: false, visible: true
    };
  });

  const roots = [];
  Object.keys(byId).forEach((key) => {
    const node = byId[key];
    if (node.parentId && byId[node.parentId]) {
      byId[node.parentId].children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortAndDepth = (node, depth) => {
    node.depth = depth;
    node.children.sort((a, b) => a.name.localeCompare(b.name));
    node.children.forEach((c) => sortAndDepth(c, depth + 1));
  };
  roots.sort((a, b) => a.name.localeCompare(b.name));
  roots.forEach((r) => sortAndDepth(r, 0));

  const order = [];
  const visit = (node) => { order.push(node); node.children.forEach(visit); };
  roots.forEach(visit);

  return { roots, byId, order };
}

function markMatches(node, q) {
  node.match = node.name.toLowerCase().indexOf(q) !== -1;
  let childMatch = false;
  node.children.forEach((c) => { if (markMatches(c, q)) childMatch = true; });
  node.hasMatchDescendant = childMatch;
  return node.match || childMatch;
}

function computeFolderVisibility() {
  const filterActive = !!folderFilterQuery;
  if (filterActive) {
    FOLDER_TREE.roots.forEach((r) => markMatches(r, folderFilterQuery));
    FOLDER_TREE.order.forEach((node) => { node.visible = node.match || node.hasMatchDescendant; });
  } else {
    FOLDER_TREE.order.forEach((node) => {
      let visible = true;
      let p = node.parentId;
      while (p != null) {
        const pn = FOLDER_TREE.byId[p];
        if (!pn || !pn.expanded) { visible = false; break; }
        p = pn.parentId;
      }
      node.visible = visible;
    });
  }
}

function renderFolderTree() {
  const root = document.getElementById('folder-tree-root');
  if (!root) return;

  if (FOLDER_TREE.order.length === 0) {
    root.innerHTML = '<div class="tree-empty">No folders found</div>';
    updateFolderSelectedSummary();
    return;
  }

  computeFolderVisibility();

  const filterActive = !!folderFilterQuery;
  root.innerHTML = FOLDER_TREE.order.map((node) => {
    const hasChildren  = node.children.length > 0;
    const effExpanded  = filterActive ? !!node.hasMatchDescendant : node.expanded;
    const toggleClass  = hasChildren ? ('tree-toggle' + (effExpanded ? ' tree-expanded' : '')) : 'tree-toggle tree-toggle-empty';
    const rowClass     = 'tree-row' + (filterActive && node.match ? ' tree-match' : '');
    const indent       = 6 + node.depth * 18;

    return '<div class="' + rowClass + '" id="tree-row-' + node.id + '" style="display:' + (node.visible ? 'flex' : 'none') + ';padding-left:' + indent + 'px">'
      + '<span class="' + toggleClass + '" onclick="toggleFolderExpand(\\'' + node.id + '\\')">'
      + (hasChildren ? '<svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M2 1l4 3.5L2 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' : '')
      + '</span>'
      + '<input type="checkbox" class="tree-checkbox" id="tree-cb-' + node.id + '" onclick="onFolderCheckboxClick(\\'' + node.id + '\\')" ' + (node.checked ? 'checked' : '') + '/>'
      + '<span class="tree-folder-icon">📁</span>'
      + '<span class="tree-label" title="' + escHtml(node.name) + '" onclick="onFolderCheckboxClick(\\'' + node.id + '\\')">' + escHtml(node.name) + '</span>'
      + '</div>';
  }).join('');

  FOLDER_TREE.order.forEach((node) => {
    const cb = document.getElementById('tree-cb-' + node.id);
    if (cb) cb.indeterminate = !!node.indeterminate && !node.checked;
  });

  updateFolderSelectedSummary();
}

function toggleFolderExpand(id) {
  const node = FOLDER_TREE.byId[id];
  if (!node) return;
  node.expanded = !node.expanded;
  renderFolderTree();
}

function onFolderFilterInput(val) {
  folderFilterQuery = (val || '').trim().toLowerCase();
  renderFolderTree();
}

function setFolderNodeChecked(node, checked) {
  node.checked = checked;
  node.indeterminate = false;
  node.children.forEach((c) => setFolderNodeChecked(c, checked));
}

function updateFolderAncestors(node) {
  let p = node.parentId != null ? FOLDER_TREE.byId[node.parentId] : null;
  while (p) {
    const allChecked = p.children.every((c) => c.checked);
    const noneChecked = p.children.every((c) => !c.checked && !c.indeterminate);
    p.checked = allChecked;
    p.indeterminate = !allChecked && !noneChecked;
    p = p.parentId != null ? FOLDER_TREE.byId[p.parentId] : null;
  }
}

function onFolderCheckboxClick(id) {
  const node = FOLDER_TREE.byId[id];
  if (!node) return;
  const newChecked = !node.checked;
  setFolderNodeChecked(node, newChecked);
  updateFolderAncestors(node);
  renderFolderTree();
}

function folderSelectAll() {
  FOLDER_TREE.roots.forEach((r) => setFolderNodeChecked(r, true));
  renderFolderTree();
}

function folderClearAll() {
  FOLDER_TREE.roots.forEach((r) => setFolderNodeChecked(r, false));
  renderFolderTree();
}

function getSelectedFolderIds() {
  return FOLDER_TREE.order.filter((n) => n.checked).map((n) => n.id);
}

function updateFolderSelectedSummary() {
  const el = document.getElementById('folder-selected-summary');
  if (!el) return;
  const n = getSelectedFolderIds().length;
  el.textContent = n === 0 ? '0 folders selected' : (n + ' folder' + (n !== 1 ? 's' : '') + ' selected');
}

/* ─────────────────────────────────────────
   SEARCH  →  action=getFiles
   Only ever fires from the explicit "Search
   Files" button — folder/file-type/date
   selections never trigger it on their own.
   ROWNUM pagination on server, client fetches
   page-by-page with live progress & exact counts.
───────────────────────────────────────── */
const FILE_SEARCH_PAGE_SIZE = 1000; // matches server PAGE_SIZE in pdc_mod_files.js
const SEARCH_PAGE_CONCURRENCY = 4;  // parallel page fetches once total is known

function showSearchProgress() {
  hideSearchProgress();
  var overlay = document.createElement('div');
  overlay.id = 'search-progress-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(19,27,51,0.4);display:flex;align-items:center;justify-content:center;z-index:99999;';
  var box = document.createElement('div');
  box.style.cssText = 'background:#fff;border-radius:14px;padding:2rem 2.5rem;box-shadow:0 8px 32px rgba(19,27,51,0.22);text-align:center;min-width:380px;';
  var spinner = document.createElement('div');
  spinner.style.cssText = 'width:44px;height:44px;border:4px solid #E2E7F0;border-top:4px solid #3D5AFE;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 1rem auto;';
  box.appendChild(spinner);
  var title = document.createElement('div');
  title.id = 'search-progress-title';
  title.style.cssText = 'font-size:1.05rem;font-weight:700;color:#131B33;margin-bottom:0.75rem;';
  title.textContent = 'Searching files...';
  box.appendChild(title);
  var barOuter = document.createElement('div');
  barOuter.style.cssText = 'width:100%;height:8px;background:#E2E7F0;border-radius:4px;overflow:hidden;margin-bottom:0.5rem;';
  var barInner = document.createElement('div');
  barInner.id = 'search-progress-bar';
  barInner.style.cssText = 'width:0%;height:100%;background:linear-gradient(90deg,#3D5AFE,#6B84FF);border-radius:4px;transition:width 0.3s ease;';
  barOuter.appendChild(barInner);
  box.appendChild(barOuter);
  var status = document.createElement('div');
  status.id = 'search-progress-status';
  status.style.cssText = 'font-size:0.85rem;color:#4C5670;font-weight:600;';
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
  if (status) status.textContent = 'Found ' + fetched + ' of ' + total + ' records' + (typeLabel ? ' (' + typeLabel + ')' : '');
  if (title) title.textContent = 'Searching files... ' + pct + '%';
}

function hideSearchProgress() {
  var el = document.getElementById('search-progress-overlay');
  if (el) el.remove();
}

async function runSearch() {
  // No folder selected → search across all folders instead of blocking.
  var folderIds = getSelectedFolderIds();

  var btn      = document.getElementById('btn-search');
  var labelEl  = document.getElementById('btn-search-label');
  var origLabel = labelEl.textContent;
  btn.disabled = true;
  labelEl.textContent = 'Searching...';

  showSearchProgress();

  try {
    var baseParams = {
      action:      'getFiles',
      folder:      folderIds.join(','),
      fileType:    msGetValues('filetype').join(','),
      createdFrom: toISODate(document.getElementById('f-createdFrom').value),
      createdTo:   toISODate(document.getElementById('f-createdTo').value)
    };

    // Fetch page 1 first — it also reports totalCount, which tells us how
    // many more pages exist. Those remaining pages are independent server
    // requests (each re-runs the search and reads just its own row range),
    // so they can be fetched in parallel instead of one-at-a-time.
    var firstParams = new URLSearchParams(Object.assign({}, baseParams, {
      rowBegin: 1,
      rowEnd:   FILE_SEARCH_PAGE_SIZE
    }));
    var firstResp = await fetch(BASE_URL + '&' + firstParams.toString());
    if (!firstResp.ok) throw new Error('HTTP ' + firstResp.status);
    var firstData = await firstResp.json();
    if (!firstData.success) throw new Error(firstData.error || 'Unknown error');

    var firstItems  = firstData.files || [];
    var grandTotal  = firstData.totalCount != null ? firstData.totalCount : firstItems.length;
    var totalPages  = Math.max(1, Math.ceil(grandTotal / FILE_SEARCH_PAGE_SIZE));
    var pageResults = new Array(totalPages);
    pageResults[0]  = firstItems;

    var fetchedCount = firstItems.length;
    updateSearchProgress(fetchedCount, grandTotal, 'Files');

    if (totalPages > 1) {
      var firstError = null;

      var pageTasks = [];
      for (var pi = 1; pi < totalPages; pi++) {
        pageTasks.push((function (pageIndex) {
          return async function () {
            var rowBegin = pageIndex * FILE_SEARCH_PAGE_SIZE + 1;
            var rowEnd   = rowBegin + FILE_SEARCH_PAGE_SIZE - 1;
            var params = new URLSearchParams(Object.assign({}, baseParams, {
              rowBegin: rowBegin,
              rowEnd:   rowEnd
            }));
            try {
              var resp = await fetch(BASE_URL + '&' + params.toString());
              if (!resp.ok) throw new Error('HTTP ' + resp.status);
              var data = await resp.json();
              if (!data.success) throw new Error(data.error || 'Unknown error');
              pageResults[pageIndex] = data.files || [];
              fetchedCount += pageResults[pageIndex].length;
              updateSearchProgress(fetchedCount, grandTotal, 'Files');
            } catch (e) {
              if (!firstError) firstError = e;
            }
          };
        })(pi));
      }

      await runWithConcurrency(pageTasks, SEARCH_PAGE_CONCURRENCY, function () {});

      if (firstError) throw firstError;
    }

    files = [].concat.apply([], pageResults);
    renderTable(files);
    setStats(files.length, 0, 0);

    if (files.length === 0) {
      document.getElementById('table-container').classList.remove('show');
      document.getElementById('empty-state').classList.add('show');
    } else {
      document.getElementById('empty-state').classList.remove('show');
      document.getElementById('table-container').classList.add('show');
    }
  } catch (e) {
    console.error('[PDC runSearch] Error:', e);
    var tbody = document.getElementById('inv-tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#E11D48;padding:1rem;">Search failed: ' + (e.message || 'Unknown error') + '</td></tr>';
    document.getElementById('table-container').classList.add('show');
    document.getElementById('empty-state').classList.remove('show');
  } finally {
    hideSearchProgress();
    btn.disabled = false;
    labelEl.textContent = origLabel;
  }
}

/* ─────────────────────────────────────────
   MULTISELECT WIDGET  (File Type only)
───────────────────────────────────────── */
const MS_STATE = {
  filetype: { options: [], selected: new Set(), open: false }
};

const MS_PLACEHOLDERS = {
  filetype: 'All File Types'
};

function msToggle(key) {
  const state = MS_STATE[key];
  const wrap  = document.getElementById(\`ms-\${key}-wrap\`);
  if (state.open) {
    msClose(key);
  } else {
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
  msFilter(key);
}

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

  const arrow = trigger.querySelector('.ms-arrow');
  trigger.innerHTML = '';
  trigger.appendChild(arrow);

  if (n === 0) {
    const ph = document.createElement('span');
    ph.className = 'ms-placeholder';
    ph.id = \`ms-\${key}-placeholder\`;
    ph.textContent = MS_PLACEHOLDERS[key] || 'All Items';
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
(async function init() {
  fsSAPIEnabled = ('showDirectoryPicker' in window);

  const folders = await fetchFolderLookups();
  FOLDER_TREE = buildFolderTree(folders);
  renderFolderTree();

  msSetOptions('filetype', FILE_TYPE_OPTIONS);

  // Default "Date Created" range: last 90 days
  const today = new Date();
  const ago90 = new Date(today); ago90.setDate(ago90.getDate() - 90);
  document.getElementById('f-createdTo').value   = fmtDate(today);
  document.getElementById('f-createdFrom').value = fmtDate(ago90);
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
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// Escapes a string for safe use inside a single-quoted inline JS attribute, e.g. onclick="fn('...')"
function escJsStr(s) {
  var bs = String.fromCharCode(92); // backslash char, built this way to dodge nested template-escaping
  return String(s).split(bs).join(bs + bs).split("'").join(bs + "'");
}

// Best-effort MIME type from a filename's extension — used for previews/downloads.
function guessMimeFromName(name) {
  var ext = (String(name).split('.').pop() || '').toLowerCase();
  var map = {
    pdf: 'application/pdf', csv: 'text/csv', txt: 'text/plain',
    htm: 'text/html', html: 'text/html', xml: 'application/xml',
    json: 'application/json', zip: 'application/zip',
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
    bmp: 'image/bmp', tif: 'image/tiff', tiff: 'image/tiff',
    doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  };
  return map[ext] || 'application/octet-stream';
}

// 'documentsize' from N/search (file type) is returned by NetSuite in KB.
function formatFileSize(kb) {
  var n = parseFloat(kb) || 0;
  if (n < 1024) return n.toFixed(0) + ' KB';
  return (n / 1024).toFixed(1) + ' MB';
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

function buildFilename(item) {
  const prefix = (document.getElementById('f-prefix').value || '').replace(/[^a-zA-Z0-9_\\-]/g, '_');
  const base   = item.name || ('file_' + item.id);
  return prefix ? \`\${prefix}\${base}\` : base;
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
async function previewPDF(id, name) {
  const item = files.find(i => String(i.id) === String(id));
  if (!item) return;
  try {
    const buffer = await downloadOneFile(item);
    const mime   = guessMimeFromName(item.name);
    const blob   = new Blob([buffer], { type: mime });
    window.open(URL.createObjectURL(blob), '_blank');
  } catch (e) {
    showToast('Preview failed: ' + e.message, 'error');
  }
}

async function downloadSingle(id, name) {
  const item = files.find(i => String(i.id) === String(id));
  if (!item) { console.error('[PDC] downloadSingle: item not found for id=' + id); return; }
  setRowStatus(id, 'active');
  try {
    const buffer   = await downloadOneFile(item);
    const filename = buildFilename(item);
    const mime     = guessMimeFromName(filename);

    if (dirHandle && dirHandle.getFileHandle) {
      await writeFileToFolder(dirHandle, filename, buffer, mime);
    } else {
      const blob = new Blob([buffer], { type: mime });
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
   RENDER TABLE
───────────────────────────────────────── */
function renderTable(list) {
  const cbAll = document.getElementById('cb-all');
  if (cbAll) cbAll.onchange = function() { onSelectAll(this); };

  list.forEach((item) => { rowStatus[item.id] = 'pending'; });

  currentTablePage = 1;
  allSelected = false;
  selectedIds.clear();

  document.getElementById('table-meta').textContent = list.length + ' files';
  renderTablePage();
}

function renderTablePage() {
  const tbody = document.getElementById('inv-tbody');
  tbody.innerHTML = '';

  const total = files.length;
  const isAllMode = rowsPerPage === 0;
  const perPage = isAllMode ? total : rowsPerPage;
  const totalPages = isAllMode ? 1 : Math.max(1, Math.ceil(total / perPage));

  if (currentTablePage > totalPages) currentTablePage = totalPages;

  const startIdx = (currentTablePage - 1) * perPage;
  const endIdx   = Math.min(startIdx + perPage, total);
  const pageSlice = files.slice(startIdx, endIdx);

  const frag = document.createDocumentFragment();
  pageSlice.forEach((item) => frag.appendChild(renderFileRow(item)));
  tbody.appendChild(frag);

  document.querySelectorAll('.row-cb').forEach(cb => {
    const id = cb.dataset.id;
    cb.checked = allSelected || selectedIds.has(id);
  });

  const cbAll = document.getElementById('cb-all');
  if (cbAll) {
    const visibleCbs = document.querySelectorAll('.row-cb');
    cbAll.checked = visibleCbs.length > 0 && [...visibleCbs].every(c => c.checked);
  }

  onRowCheck();

  renderPaginationControls(total, totalPages, startIdx, endIdx);
}

function renderPaginationControls(total, totalPages, startIdx, endIdx) {
  const container = document.getElementById('pagination-controls');
  if (!container) return;

  if (total <= 0) { container.style.display = 'none'; return; }
  container.style.display = 'flex';

  const options = [25, 50, 100, 250, 500];
  const optionsHtml = options.map(n =>
    \`<option value="\${n}" \${rowsPerPage === n ? 'selected' : ''}>\${n}</option>\`
  ).join('') + \`<option value="0" \${rowsPerPage === 0 ? 'selected' : ''}>All</option>\`;

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
  const total = files.length;
  const perPage = rowsPerPage === 0 ? total : rowsPerPage;
  const totalPages = rowsPerPage === 0 ? 1 : Math.max(1, Math.ceil(total / perPage));
  if (page < 1 || page > totalPages) return;
  currentTablePage = page;
  renderTablePage();
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
  const sel = document.querySelector('.pg-rows-select');
  if (sel) {
    const match = [...sel.options].find(o => parseInt(o.value, 10) === n);
    sel.value = match ? match.value : '';
  }
  renderTablePage();
}

function renderFileRow(item) {
  const tr = document.createElement('tr');
  tr.id = 'row-' + item.id;
  const nameJs = escJsStr(item.name || '');
  tr.innerHTML = \`
    <td class="cb-wrap"><input type="checkbox" class="row-cb" data-id="\${item.id}" onchange="onRowCheck()"/></td>
    <td><span class="tran-id">\${escHtml(item.name)}</span></td>
    <td>\${escHtml(item.folder || '—')}</td>
    <td><span class="type-label">\${escHtml(item.fileType || '—')}</span></td>
    <td>\${escHtml(formatFileSize(item.size))}</td>
    <td>\${escHtml(fmtDisplayDate(item.created) || '—')}</td>
    <td>
      <div class="row-actions">
        <button type="button" class="icon-btn preview" title="Preview" onclick="previewPDF(\${item.id},'\${nameJs}')">
          <svg width="12" height="12" fill="none" viewBox="0 0 12 12"><ellipse cx="6" cy="6" rx="5" ry="3.5" stroke="currentColor" stroke-width="1.3"/><circle cx="6" cy="6" r="1.5" fill="currentColor"/></svg>
        </button>
        <button type="button" class="icon-btn dl" title="Download" onclick="downloadSingle(\${item.id},'\${nameJs}')">
          <svg width="12" height="12" fill="none" viewBox="0 0 12 12"><path d="M6 1v7M3.5 5.5L6 8l2.5-2.5M1 10h10" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div class="dl-status" style="min-width:72px">
          <span class="status-dot dot-pending" id="row-dot-\${item.id}"></span>
          <span id="row-lbl-\${item.id}" style="color:var(--ink-faint);font-size:11.5px">Pending</span>
        </div>
      </div>
    </td>
  \`;
  return tr;
}

/* ─────────────────────────────────────────
   SELECTION HELPERS  (result rows)
───────────────────────────────────────── */
function getSelectedFiles() {
  if (allSelected) return files;
  return selectedIds.size > 0 ? files.filter(item => selectedIds.has(String(item.id))) : [];
}

function onRowCheck() {
  document.querySelectorAll('.row-cb').forEach(cb => {
    const id = cb.dataset.id;
    if (cb.checked) {
      selectedIds.add(id);
    } else {
      selectedIds.delete(id);
      allSelected = false;
    }
  });

  const visibleCbs = document.querySelectorAll('.row-cb');
  const cbAll = document.getElementById('cb-all');
  if (cbAll && visibleCbs.length > 0) {
    cbAll.checked = [...visibleCbs].every(c => c.checked);
  }

  const anySelected = allSelected || selectedIds.size > 0;
  document.getElementById('btn-dl-selected').disabled = !anySelected;
}

function onSelectAll(cb) {
  if (cb.checked) {
    allSelected = true;
    files.forEach(item => selectedIds.add(String(item.id)));
  } else {
    allSelected = false;
    selectedIds.clear();
  }
  document.querySelectorAll('.row-cb').forEach(c => c.checked = cb.checked);
  onRowCheck();
}

function toggleSelectAll() {
  const wasAllSelected = allSelected && selectedIds.size === files.length;
  if (wasAllSelected) {
    allSelected = false;
    selectedIds.clear();
    document.querySelectorAll('.row-cb').forEach(c => c.checked = false);
    document.getElementById('cb-all').checked = false;
  } else {
    allSelected = true;
    files.forEach(item => selectedIds.add(String(item.id)));
    document.querySelectorAll('.row-cb').forEach(c => c.checked = true);
    document.getElementById('cb-all').checked = true;
  }
  onRowCheck();
}


/* ─────────────────────────────────────────
   MODAL NAVIGATION
───────────────────────────────────────── */
function openModal() {
  if (files.length === 0) { return; }
  const sel = getSelectedFiles();
  document.getElementById('chip-count').textContent = sel.length + ' File' + (sel.length !== 1 ? 's' : '');
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
  setStats(files.length, 0, 0);
  files.forEach(item => setRowStatus(item.id, 'pending'));
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
  document.getElementById('fp-hint').textContent  = 'Folder selected — files will be saved here';
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
   DOWNLOAD ONE FILE  →  action=getFile
───────────────────────────────────────── */
async function downloadOneFile(item) {
  const url = BASE_URL + '&action=getFile&id=' + item.id;
  const resp = await fetch(url, { signal: abortCtrl ? abortCtrl.signal : undefined });
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
  const ct = resp.headers.get('Content-Type') || '';
  if (ct.includes('json')) {
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
async function writeFileToFolder(handle, filename, buffer, mime) {
  mime = mime || 'application/octet-stream';
  if (!handle || !handle.getFileHandle) {
    const blob = new Blob([buffer], { type: mime });
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
    pill.style.background = '#D68A0E22';
    pill.style.borderColor = '#F0C97D44';
    statusText.textContent = 'Paused';
    pulse.style.background = 'var(--accent)';
  } else {
    btn.innerHTML = '<svg width="11" height="11" fill="none" viewBox="0 0 11 11"><rect x="1.5" y="1" width="3" height="9" rx="1" fill="currentColor"/><rect x="6.5" y="1" width="3" height="9" rx="1" fill="currentColor"/></svg> Pause';
    btn.className = 'ctrl-btn ctrl-pause';
    pill.style.background = '#3D5AFE30';
    pill.style.borderColor = '#6B84FF44';
    statusText.textContent = 'Active';
    pulse.style.background = '#6B84FF';
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
  const selected   = getSelectedFiles();
  if (selected.length === 0) { return; }
  if (!dirHandle && fsSAPIEnabled) { return; }
  if (downloading) return;

  const skipErr        = document.getElementById('f-skiperr').checked;
  const concur         = parseInt(document.getElementById('f-concur').value, 10);
  const total          = selected.length;
  const dirName        = dirHandle ? dirHandle.name : 'Downloads';

  let writeHandle = await resolveWriteTarget(dirHandle);
  const writeDirName = (writeHandle && writeHandle.name) ? writeHandle.name : dirName;

  successCount = 0;
  failedCount  = 0;
  failedItems  = [];
  cancelled    = false;
  abortCtrl    = new AbortController();
  paused       = false;
  downloading  = true;
  dlStartTime  = Date.now();

  selected.forEach(item => setRowStatus(item.id, 'pending'));
  setStats(total, 0, 0);

  document.getElementById('dest-path-display').textContent = writeDirName;
  document.getElementById('step2-sub').textContent = \`Saving \${total} File\${total!==1?'s':''} — concurrency: \${concur}\`;
  document.getElementById('concur-val').textContent = concur;
  document.getElementById('skiperr-disp').textContent = skipErr ? 'On' : 'Off';
  document.getElementById('dl-hero-sub').textContent  = \`\${total} file\${total!==1?'s':''} · concurrency \${concur}\`;
  setProgress(0, total, 'Starting…');

  goToStep(2);

  const done = { n: 0 };

  const tasks = selected.map(item => async () => {
    while (paused && !cancelled) {
      await new Promise(r => setTimeout(r, 200));
    }
    if (cancelled) return { item, ok: false, cancelled: true };

    setRowStatus(item.id, 'active');
    const filename = buildFilename(item);
    const t0 = Date.now();

    try {
      const buffer = await downloadOneFile(item);
      if (cancelled) return { item, ok: false, cancelled: true };

      const ms = Date.now() - t0;
      const kbps = ms > 0 ? Math.round(buffer.byteLength / ms) : 0;

      document.getElementById('dm-speed').textContent  = kbps + ' KB/s';
      document.getElementById('speed-disp').textContent = kbps + ' KB/s';

      const mime = guessMimeFromName(filename);
      await writeFileToFolder(writeHandle, filename, buffer, mime);

      setRowStatus(item.id, 'ok');
      return { item, ok: true, filename };
    } catch (e) {
      console.error('[PDC] batch download failed for id=' + item.id, e);
      setRowStatus(item.id, 'err', e.message);
      if (!skipErr) cancelled = true;
      return { item, ok: false, error: e.message };
    }
  });

  const itemLabel = (item) => item.name || ('#' + item.id);

  await runWithConcurrency(tasks, concur, (result) => {
    if (result.cancelled) return;
    done.n++;

    if (result.ok) {
      successCount++;
    } else {
      failedCount++;
      failedItems.push({ tranId: itemLabel(result.item), reason: result.error || 'Unknown error' });
    }

    setStats(total, successCount, failedCount);
    setProgress(done.n, total, result.ok ? result.filename : ('FAILED: ' + itemLabel(result.item)));
  });

  downloading = false;
  const elapsed = ((Date.now() - dlStartTime) / 1000).toFixed(1);

  if (cancelled) {
    closeModal();
  } else {
    const hasErrors = failedCount > 0;
    document.getElementById('done-icon').textContent  = hasErrors ? '⚠️' : '✅';
    document.getElementById('done-title').innerHTML   = hasErrors
      ? \`Download <em style="color:var(--accent-dark)">Finished</em>\`
      : \`Files <em>Saved</em>\`;
    document.getElementById('done-sub').textContent   = hasErrors
      ? \`\${successCount} succeeded, \${failedCount} failed\`
      : \`All \${successCount} file\${successCount!==1?'s':''} saved successfully in \${elapsed}s\`;
    document.getElementById('done-success').textContent = successCount;
    document.getElementById('done-failed').textContent  = failedCount;
    document.getElementById('done-time').textContent    = elapsed + 's';
    document.getElementById('done-path').textContent    = writeDirName;
    document.getElementById('done-path-card').style.display = 'flex';
    document.getElementById('step3-sub').textContent = \`\${successCount} file\${successCount!==1?'s':''} saved to \${writeDirName}\`;

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
