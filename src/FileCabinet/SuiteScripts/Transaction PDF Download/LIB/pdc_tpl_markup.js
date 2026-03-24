/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 *
 * PDC — HTML Markup Template
 * Sidebar, filter bar, stats, table, modal — all structural HTML.
 */
define([], () => {

  /**
   * @returns {string} HTML body content (everything between <body> and <script>)
   */
  const getMarkup = () => `

<!-- ════════════════════════════════════════
     MAIN CONTENT
════════════════════════════════════════ -->
<main class="main">

  <!-- Page header -->
  <div class="page-header">
    <div>
      <div class="page-title" id="page-title"><em>Search, preview and download Transaction PDFs</em></div>
    </div>
  </div>

  <!-- Filter bar -->
  <div class="filter-bar">
    <div class="filter-group" id="fg-trantype">
      <div class="filter-label">Transaction Type</div>
      <div class="ms-wrap" id="ms-trantype-wrap">
        <div class="ms-trigger" id="ms-trantype-trigger" onclick="msToggle('trantype')">
          <span class="ms-placeholder" id="ms-trantype-placeholder">All Transaction Types</span>
          <svg class="ms-arrow" width="10" height="7" fill="none" viewBox="0 0 10 7"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
        </div>
        <div class="ms-dropdown" id="ms-trantype-dropdown">
          <div class="ms-search-wrap">
            <div class="ms-search-box">
              <svg class="ms-search-icon" width="13" height="13" fill="none" viewBox="0 0 13 13"><circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.5"/><path d="M10 10l2.5 2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
              <input class="ms-search" id="ms-trantype-search" placeholder="Search types…" oninput="msFilter('trantype')" onclick="event.stopPropagation()"/>
            </div>
          </div>
          <div class="ms-list" id="ms-trantype-list"></div>
          <div class="ms-footer">
            <span class="ms-footer-count" id="ms-trantype-count">0 selected</span>
            <span class="ms-footer-clear" onclick="msClear('trantype')">Clear all</span>
          </div>
        </div>
      </div>
    </div>
    <div class="filter-group">
      <div class="filter-label">Date From</div>
      <input class="filter-input" type="date" id="f-dateFrom"/>
    </div>
    <div class="filter-group">
      <div class="filter-label">Date To</div>
      <input class="filter-input" type="date" id="f-dateTo"/>
    </div>
    <div class="filter-group">
      <div class="filter-label">Tran ID</div>
      <input class="filter-input" type="text" id="f-tranId" placeholder="e.g. INV-10482"/>
    </div>
    <div class="filter-group">
      <div class="filter-label">Customer</div>
      <div class="ms-wrap" id="ms-customer-wrap">
        <div class="ms-trigger" id="ms-customer-trigger" onclick="msToggle('customer')">
          <span class="ms-placeholder" id="ms-customer-placeholder">All Customers</span>
          <svg class="ms-arrow" width="10" height="7" fill="none" viewBox="0 0 10 7"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
        </div>
        <div class="ms-dropdown" id="ms-customer-dropdown">
          <div class="ms-search-wrap">
            <div class="ms-search-box">
              <svg class="ms-search-icon" width="13" height="13" fill="none" viewBox="0 0 13 13"><circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.5"/><path d="M10 10l2.5 2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
              <input class="ms-search" id="ms-customer-search" placeholder="Search customers…" oninput="msFilter('customer')" onclick="event.stopPropagation()"/>
            </div>
          </div>
          <div class="ms-list" id="ms-customer-list">
            <div class="ms-loading">
              <svg width="14" height="14" fill="none" viewBox="0 0 14 14" style="animation:spin 1s linear infinite"><circle cx="7" cy="7" r="5.5" stroke="var(--border)" stroke-width="1.5"/><path d="M7 1.5A5.5 5.5 0 0112.5 7" stroke="var(--teal-bright)" stroke-width="1.5" stroke-linecap="round"/></svg>
              Loading…
            </div>
          </div>
          <div class="ms-footer">
            <span class="ms-footer-count" id="ms-customer-count">0 selected</span>
            <span class="ms-footer-clear" onclick="msClear('customer')">Clear all</span>
          </div>
        </div>
      </div>
    </div>
    <div class="filter-group" id="fg-subsidiary">
      <div class="filter-label">Subsidiary</div>
      <div class="ms-wrap" id="ms-subsidiary-wrap">
        <div class="ms-trigger" id="ms-subsidiary-trigger" onclick="msToggle('subsidiary')">
          <span class="ms-placeholder" id="ms-subsidiary-placeholder">All Subsidiaries</span>
          <svg class="ms-arrow" width="10" height="7" fill="none" viewBox="0 0 10 7"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
        </div>
        <div class="ms-dropdown" id="ms-subsidiary-dropdown">
          <div class="ms-search-wrap">
            <div class="ms-search-box">
              <svg class="ms-search-icon" width="13" height="13" fill="none" viewBox="0 0 13 13"><circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.5"/><path d="M10 10l2.5 2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
              <input class="ms-search" id="ms-subsidiary-search" placeholder="Search subsidiaries…" oninput="msFilter('subsidiary')" onclick="event.stopPropagation()"/>
            </div>
          </div>
          <div class="ms-list" id="ms-subsidiary-list">
            <div class="ms-loading">
              <svg width="14" height="14" fill="none" viewBox="0 0 14 14" style="animation:spin 1s linear infinite"><circle cx="7" cy="7" r="5.5" stroke="var(--border)" stroke-width="1.5"/><path d="M7 1.5A5.5 5.5 0 0112.5 7" stroke="var(--teal-bright)" stroke-width="1.5" stroke-linecap="round"/></svg>
              Loading…
            </div>
          </div>
          <div class="ms-footer">
            <span class="ms-footer-count" id="ms-subsidiary-count">0 selected</span>
            <span class="ms-footer-clear" onclick="msClear('subsidiary')">Clear all</span>
          </div>
        </div>
      </div>
    </div>
    <div class="filter-group" id="fg-status">
      <div class="filter-label">Status</div>
      <select class="filter-select" id="f-status">
        <option value="">All Statuses</option>
        <option value="open">Open / Partial</option>
        <option value="paid">Paid in Full</option>
        <option value="overdue">Overdue</option>
      </select>
    </div>
    <div class="filter-divider"></div>
    <button type="button" class="btn btn-primary" onclick="doSearch()" id="btn-search" style="align-self:flex-end">
      <svg width="14" height="14" fill="none" viewBox="0 0 14 14"><circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.6"/><path d="M10 10l3 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
      <span id="btn-search-label">Search Transactions</span>
    </button>
  </div>

  <!-- Stats row -->
  <div class="stats-row">
    <div class="stat-card">
      <div class="stat-icon si-teal">
        <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path d="M4 3h12l2 2v12a1 1 0 01-1 1H3a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="#1A6B6B" stroke-width="1.6"/><path d="M6 9h8M6 12h5" stroke="#1A6B6B" stroke-width="1.6" stroke-linecap="round"/></svg>
      </div>
      <div>
        <div class="stat-val" id="s-total">0</div>
        <div class="stat-lbl">Total Found</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon si-green">
        <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" stroke="#2A8A5E" stroke-width="1.6"/><path d="M7 10l2.5 2.5L13 8" stroke="#2A8A5E" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <div>
        <div class="stat-val" id="s-success">0</div>
        <div class="stat-lbl">Downloaded</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon si-rose">
        <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" stroke="#D96060" stroke-width="1.6"/><path d="M7 13l6-6M13 13l-6-6" stroke="#D96060" stroke-width="1.6" stroke-linecap="round"/></svg>
      </div>
      <div>
        <div class="stat-val" id="s-failed">0</div>
        <div class="stat-lbl">Failed</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon si-amber">
        <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" stroke="#E8923A" stroke-width="1.6"/><path d="M10 6v4l3 2" stroke="#E8923A" stroke-width="1.6" stroke-linecap="round"/></svg>
      </div>
      <div>
        <div class="stat-val" id="s-pending">0</div>
        <div class="stat-lbl">Remaining</div>
      </div>
    </div>
  </div>

  <!-- Invoice table -->
  <div class="table-container" id="table-container">
    <div class="table-head">
      <div>
        <div class="table-title" id="table-title">Search Results</div>
        <div class="table-meta" id="table-meta">0 transactions</div>
      </div>
      <div class="table-actions">
        <button type="button" class="btn btn-outline btn-sm" onclick="toggleSelectAll()">Select All</button>
        <button type="button" class="btn btn-amber btn-sm" onclick="openModal()" id="btn-dl-selected" disabled>
          <svg width="12" height="12" fill="none" viewBox="0 0 12 12"><path d="M6 1v8M3 6l3 3 3-3M2 10h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Download Selected
        </button>
      </div>
    </div>
    <div class="table-scroll">
      <table>
        <thead id="inv-thead">
          <tr>
            <th><input type="checkbox" id="cb-all" onchange="onSelectAll(this)"/></th>
            <th>Type</th>
            <th>Tran ID</th>
            <th>Customer</th>
            <th>Date</th>
            <th>Due Date</th>
            <th>Amount</th>
            <th>Status</th>
            <th>DL Status</th>
          </tr>
        </thead>
        <tbody id="inv-tbody"></tbody>
      </table>
    </div>
  </div>

  <!-- Empty state -->
  <div class="empty-state" id="empty-state">
    <div class="empty-icon" id="empty-icon">🔎</div>
    <div class="empty-text" id="empty-text">No invoices found</div>
    <div class="empty-sub" id="empty-sub">Try adjusting your filters or broadening the date range</div>
  </div>


</main>


<!-- ════════════════════════════════════════
     TOOL PAGES  (shown/hidden by switchPage)
════════════════════════════════════════ -->

<!-- ════════════════════════════════════════
     DOWNLOAD MODAL
════════════════════════════════════════ -->
<div class="modal-overlay" id="modal-overlay" onclick="handleOverlayClick(event)">
  <div class="modal-card" id="modal-card">

    <!-- ── STEP 1: Folder & Settings ── -->
    <div id="modal-step-1">
      <div class="modal-header">
        <div class="mh-left">
          <div class="mh-icon mhi-amber">
            <svg width="22" height="22" fill="none" viewBox="0 0 22 22">
              <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" fill="#FEF0E0" stroke="#E8923A" stroke-width="1.6"/>
              <path d="M11 11v5M8.5 13.5L11 16l2.5-2.5" stroke="#E8923A" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div>
            <div class="modal-title">Choose <em>Save Location</em></div>
            <div class="modal-sub" id="step1-sub">Select where PDFs will be saved on your machine</div>
          </div>
        </div>
        <button type="button" class="close-modal" onclick="closeModal()">✕</button>
      </div>

      <div class="step-track">
        <div class="step-node"><div class="step-circ curr">1</div><span class="step-name curr">Save Location</span></div>
        <div class="step-conn"></div>
        <div class="step-node"><div class="step-circ">2</div><span class="step-name">Downloading</span></div>
        <div class="step-conn"></div>
        <div class="step-node"><div class="step-circ">3</div><span class="step-name">Complete</span></div>
      </div>

      <div class="modal-body">

        <!-- Invoice summary -->
        <div>
          <div class="sec-label">Selected for Download</div>
          <div class="summary-chips" id="summary-chips">
            <div class="s-chip hi">
              <svg width="12" height="12" fill="none" viewBox="0 0 12 12"><path d="M2 2h8l1 1v7a1 1 0 01-1 1H2a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" stroke-width="1.2"/></svg>
              <span id="chip-count">0 PDFs</span>
            </div>
            <div class="s-chip">
              <svg width="12" height="12" fill="none" viewBox="0 0 12 12"><circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.2"/><path d="M6 3.5v3l2 1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
              Est. ~<span id="chip-est">0</span> KB
            </div>
            <div class="s-chip" id="chip-mode">
              <svg width="12" height="12" fill="none" viewBox="0 0 12 12"><path d="M2 3h3.5l1 1H10a1 1 0 011 1v4a1 1 0 01-1 1H2a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="currentColor" stroke-width="1.2"/></svg>
              Folder Mode
            </div>
          </div>
        </div>

        <!-- Folder picker -->
        <div>
          <div class="sec-label" id="folder-section-label">Download Folder</div>
          <div class="folder-picker" id="folder-picker" onclick="pickFolder()">
            <div class="fp-top">
              <div class="fp-icon">📁</div>
              <div>
                <div class="fp-title" id="fp-title">No folder selected</div>
                <div class="fp-hint" id="fp-hint">Click to browse or use a quick folder below</div>
              </div>
              <button type="button" class="fp-browse" id="fp-browse-btn" onclick="event.stopPropagation(); pickFolder()">
                <svg width="12" height="12" fill="none" viewBox="0 0 12 12"><path d="M2 3h3.5l1 1H10a1 1 0 011 1v4H1V4a1 1 0 011-1z" stroke="currentColor" stroke-width="1.2"/></svg>
                Browse…
              </button>
            </div>
            <div class="path-row">
              <svg width="13" height="13" fill="none" viewBox="0 0 13 13"><path d="M1.5 3.5h4L7 5h4.5v6h-10z" stroke="currentColor" stroke-width="1.2"/></svg>
              <span class="path-text" id="folder-path">No folder chosen — click Browse to select</span>
              <span class="path-change" id="path-change-btn" style="display:none" onclick="event.stopPropagation(); pickFolder()">Change</span>
            </div>
            <div class="quick-folders" id="quick-folders">
              <div class="qf" onclick="event.stopPropagation(); pickQuick(this, 'Downloads')">⬇️ Downloads</div>
              <div class="qf" onclick="event.stopPropagation(); pickQuick(this, 'Desktop')">🖥️ Desktop</div>
              <div class="qf" onclick="event.stopPropagation(); pickQuick(this, 'Documents/Invoices')">📁 Documents › Invoices</div>
            </div>
          </div>
        </div>

        <!-- Download Settings -->
        <div>
          <div class="sec-label">Download Settings</div>
          <div class="settings-grid">
            <div class="field-g">
              <label>Filename Pattern</label>
              <select class="field-select" id="f-filename" onchange="updatePreview()">
                <option value="tranid">{TranID}.pdf</option>
                <option value="tranid_date">{TranID}_{Date}.pdf</option>
                <option value="id_tranid">{ID}_{TranID}.pdf</option>
                <option value="cust_tranid">{Customer}_{TranID}.pdf</option>
              </select>
            </div>
            <div class="field-g">
              <label>Concurrent Downloads &nbsp;<span style="color:var(--teal-mid);font-weight:700" id="concur-display">5</span></label>
              <div class="slider-wrap">
                <span style="font-size:11px;color:var(--text-muted)">1</span>
                <input type="range" min="1" max="10" value="5" id="f-concur"
                  oninput="document.getElementById('concur-display').textContent=this.value;document.getElementById('concur-val').textContent=this.value"/>
                <span style="font-size:11px;color:var(--text-muted)">10</span>
              </div>
            </div>
            <div class="preview-row" id="filename-preview">
              <span>Preview:</span> INV-10482.pdf
            </div>
          </div>
        </div>

        <!-- Advanced toggles -->
        <div>
          <div class="sec-label">Options</div>
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:4px 14px;">
            <div class="toggle-row">
              <div>
                <div class="tl-label">Skip failed PDFs</div>
                <div class="tl-sub">Continue downloading even if one invoice fails</div>
              </div>
              <input type="checkbox" id="f-skiperr" checked style="width:15px;height:15px;accent-color:var(--teal-mid);cursor:pointer"/>
            </div>
            <div class="toggle-row">
              <div>
                <div class="tl-label">Create date subfolder</div>
                <div class="tl-sub">Save into YYYY-MM-DD subfolder</div>
              </div>
              <button type="button" class="toggle-sw on" id="toggle-subfolder" onclick="this.classList.toggle('on')"></button>
            </div>
          </div>
        </div>

      </div><!-- /modal-body step 1 -->

      <div class="modal-footer">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <span id="folder-tip" style="font-size:12px;color:var(--amber);display:flex;align-items:center;gap:5px;margin-right:auto;">
          <svg width="12" height="12" fill="none" viewBox="0 0 12 12"><circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.2"/><path d="M6 4.5v3M6 9v.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
          Select a folder to continue
        </span>
        <button type="button" class="btn btn-primary" id="btn-start" onclick="startDownload()" disabled>
          <svg width="14" height="14" fill="none" viewBox="0 0 14 14"><path d="M7 1v9M4 7l3 3 3-3M2 12h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Start Download →
        </button>
      </div>
    </div><!-- /step 1 -->

    <!-- ── STEP 2: Downloading ── -->
    <div id="modal-step-2" style="display:none">
      <div class="modal-header">
        <div class="mh-left">
          <div class="mh-icon mhi-teal">
            <svg width="22" height="22" fill="none" viewBox="0 0 22 22"><path d="M11 3v12M7 11l4 4 4-4M4 19h14" stroke="#2E9E9E" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          <div>
            <div class="modal-title">Downloading <em>PDFs</em></div>
            <div class="modal-sub" id="step2-sub">Generating and saving files…</div>
          </div>
        </div>
        <div style="font-size:11.5px;font-weight:600;color:var(--text-muted);">Do not close this window</div>
      </div>

      <div class="step-track">
        <div class="step-node"><div class="step-circ done" id="st-c1">✓</div><span class="step-name done" id="st-n1">Save Location</span></div>
        <div class="step-conn done" id="st-l1"></div>
        <div class="step-node"><div class="step-circ curr" id="st-c2">2</div><span class="step-name curr" id="st-n2">Downloading</span></div>
        <div class="step-conn" id="st-l2"></div>
        <div class="step-node"><div class="step-circ" id="st-c3">3</div><span class="step-name" id="st-n3">Complete</span></div>
      </div>

      <div class="modal-body">

        <!-- Hero progress -->
        <div class="dl-hero">
          <div class="dl-hero-top">
            <div>
              <div class="dl-hero-title">Generating &amp; Downloading PDFs</div>
              <div class="dl-hero-sub" id="dl-hero-sub">BFO renderer · NetSuite Suitelet</div>
            </div>
            <div class="dl-status-pill" id="dl-status-pill">
              <div class="pulse" id="dl-pulse"></div>
              <span id="dl-status-text">Active</span>
            </div>
          </div>
          <div class="ring-wrap">
            <div class="ring-cont">
              <svg width="76" height="76" viewBox="0 0 76 76">
                <circle class="r-bg" cx="38" cy="38" r="33"/>
                <circle class="r-fill" id="ring-fill" cx="38" cy="38" r="33"/>
              </svg>
              <div class="ring-txt" id="ring-pct">0%</div>
            </div>
            <div class="dl-mini-stats">
              <div><div class="dm-val" id="dm-files">0 / 0</div><div class="dm-lbl">Files Done</div></div>
              <div><div class="dm-val" id="dm-speed">— KB/s</div><div class="dm-lbl">Speed</div></div>
              <div><div class="dm-val" id="dm-eta">—</div><div class="dm-lbl">Est. Left</div></div>
            </div>
          </div>
          <div class="overall-bar-wrap">
            <div class="ob-top">
              <span id="ob-label">Preparing…</span>
              <span id="ob-pct">0%</span>
            </div>
            <div class="ob-track"><div class="ob-fill" id="ob-fill"></div></div>
          </div>
        </div>

        <!-- Destination -->
        <div class="dest-banner">
          <span class="dest-icon">📁</span>
          <div>
            <div class="dest-lbl">Saving to</div>
            <div class="dest-path" id="dest-path-display">—</div>
          </div>
          <span class="dest-change" onclick="cancelDownload(); setTimeout(()=>goToStep(1),400)">Change</span>
        </div>

        <!-- Controls -->
        <div class="dl-controls">
          <button type="button" class="ctrl-btn ctrl-pause" id="btn-pause" onclick="togglePause()">
            <svg width="11" height="11" fill="none" viewBox="0 0 11 11"><rect x="1.5" y="1" width="3" height="9" rx="1" fill="currentColor"/><rect x="6.5" y="1" width="3" height="9" rx="1" fill="currentColor"/></svg>
            Pause
          </button>
          <button type="button" class="ctrl-btn ctrl-cancel" id="btn-cancel" onclick="cancelDownload()">
            <svg width="11" height="11" fill="none" viewBox="0 0 11 11"><path d="M2 2l7 7M9 2l-7 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            Cancel
          </button>
          <div class="speed-info">
            <svg width="12" height="12" fill="none" viewBox="0 0 12 12"><path d="M1 6h2l1.5-3 2 6 1.5-4.5L9.5 7H11" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <span class="speed-val" id="speed-disp">—</span>
          </div>
        </div>


      </div><!-- /modal-body step 2 -->

      <div class="modal-footer" style="justify-content:space-between">
        <div style="font-size:12px;color:var(--text-muted)">
          Concurrent: <strong id="concur-val" style="color:var(--teal-mid)">5</strong> · Skip errors: <strong id="skiperr-disp" style="color:var(--teal-mid)">On</strong>
        </div>
        <div style="display:flex;gap:8px">
          <button type="button" class="btn btn-outline btn-sm" onclick="cancelDownload()">Stop Download</button>
        </div>
      </div>
    </div><!-- /step 2 -->

    <!-- ── STEP 3: Complete ── -->
    <div id="modal-step-3" style="display:none">
      <div class="modal-header">
        <div class="mh-left">
          <div class="mh-icon mhi-green">
            <svg width="22" height="22" fill="none" viewBox="0 0 22 22">
              <circle cx="11" cy="11" r="9" fill="#DFF5EC" stroke="#2A8A5E" stroke-width="1.7"/>
              <path d="M7 11l3 3 5-5" stroke="#2A8A5E" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div>
            <div class="modal-title">Download <em>Complete</em></div>
            <div class="modal-sub" id="step3-sub">All files saved successfully</div>
          </div>
        </div>
        <button type="button" class="close-modal" onclick="closeModal()">✕</button>
      </div>

      <div class="step-track">
        <div class="step-node"><div class="step-circ done">✓</div><span class="step-name done">Save Location</span></div>
        <div class="step-conn done"></div>
        <div class="step-node"><div class="step-circ done">✓</div><span class="step-name done">Downloading</span></div>
        <div class="step-conn done"></div>
        <div class="step-node"><div class="step-circ done">✓</div><span class="step-name done">Complete</span></div>
      </div>

      <div class="modal-body" style="text-align:center">
        <div class="done-icon-wrap" id="done-icon">✅</div>
        <div class="done-title" id="done-title">PDFs <em>Saved</em></div>
        <div class="done-sub" id="done-sub">Download finished</div>

        <div class="done-grid">
          <div class="done-stat-card">
            <div class="dsv" id="done-success">0</div><div class="dsl">Saved</div>
          </div>
          <div class="done-stat-card">
            <div class="dsv" id="done-failed">0</div><div class="dsl">Failed</div>
          </div>
          <div class="done-stat-card">
            <div class="dsv" id="done-time">—</div><div class="dsl">Duration</div>
          </div>
        </div>

        <div class="done-path-card" id="done-path-card">
          <span style="font-size:22px">📁</span>
          <div style="text-align:left;flex:1">
            <div class="dpc-lbl">Saved to</div>
            <div class="dpc-path" id="done-path">—</div>
          </div>
        </div>

        <div class="done-actions">
          <button type="button" class="btn btn-outline" onclick="resetAndClose()">← New Search</button>
          <button type="button" class="btn btn-success" onclick="closeModal()">Done</button>
        </div>

      </div><!-- /modal-body step 3 -->
    </div><!-- /step 3 -->

  </div><!-- /modal-card -->
</div><!-- /modal-overlay -->


<!-- ════════════════════════════════════ SCRIPT ════════════════════════════════════ -->
`;

  return { getMarkup };
});
