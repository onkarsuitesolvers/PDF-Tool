/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 *
 * PDC — HTML Markup Template
 * App shell: folder-tree sidebar, filter bar, results table, download modal.
 */
define([], () => {

  /**
   * @returns {string} HTML body content (everything between <body> and <script>)
   */
  const getMarkup = () => `

<div class="app">

  <!-- ════════════════════════════════════════
       TOP BAR
  ════════════════════════════════════════ -->
  <header class="topbar">
    <div class="topbar-left">
      <div class="brand-mark">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2v10M6 8l4 4 4-4M3 15h14" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <div>
        <div class="topbar-title">PDF Download Center</div>
        <div class="topbar-sub">Browse File Cabinet folders and download files in bulk</div>
      </div>
    </div>
  </header>

  <div class="layout">

    <!-- ════════════════════════════════════════
         SIDEBAR — FOLDER TREE (multi-select)
    ════════════════════════════════════════ -->
    <aside class="sidebar">
      <div class="panel tree-panel">
        <div class="panel-head">
          <div class="panel-title">Folders</div>
          <div class="panel-actions">
            <button type="button" class="link-btn" onclick="folderSelectAll()">Select all</button>
            <span class="dot-sep">·</span>
            <button type="button" class="link-btn" onclick="folderClearAll()">Clear</button>
          </div>
        </div>

        <div class="tree-search">
          <svg class="tree-search-icon" width="13" height="13" fill="none" viewBox="0 0 13 13"><circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.5"/><path d="M10 10l2.5 2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          <input type="text" id="folder-filter-input" placeholder="Filter folders…" oninput="onFolderFilterInput(this.value)"/>
        </div>

        <div class="tree-summary" id="folder-selected-summary">0 folders selected</div>

        <div class="tree-scroll" id="folder-tree-root">
          <div class="tree-loading">Loading folders…</div>
        </div>
      </div>
    </aside>

    <!-- ════════════════════════════════════════
         MAIN CONTENT
    ════════════════════════════════════════ -->
    <main class="main">

      <!-- Filters — selection only; nothing here triggers a search by itself -->
      <div class="panel filters-panel">
        <div class="filters-row">
          <div class="filter-group">
            <div class="filter-label">File Type</div>
            <div class="ms-wrap" id="ms-filetype-wrap">
              <div class="ms-trigger" id="ms-filetype-trigger" onclick="msToggle('filetype')">
                <span class="ms-placeholder" id="ms-filetype-placeholder">All File Types</span>
                <svg class="ms-arrow" width="10" height="7" fill="none" viewBox="0 0 10 7"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
              </div>
              <div class="ms-dropdown" id="ms-filetype-dropdown" style="display:none;visibility:hidden">
                <div class="ms-search-wrap">
                  <div class="ms-search-box">
                    <svg class="ms-search-icon" width="13" height="13" fill="none" viewBox="0 0 13 13"><circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.5"/><path d="M10 10l2.5 2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                    <input class="ms-search" id="ms-filetype-search" placeholder="Search file types…" oninput="msFilter('filetype')" onclick="event.stopPropagation()"/>
                  </div>
                </div>
                <div class="ms-list" id="ms-filetype-list"></div>
                <div class="ms-footer">
                  <span class="ms-footer-count" id="ms-filetype-count">0 selected</span>
                  <span class="ms-footer-clear" onclick="msClear('filetype')">Clear all</span>
                </div>
              </div>
            </div>
          </div>
          <div class="filter-group">
            <div class="filter-label">Date Created From</div>
            <input class="filter-input" type="text" id="f-createdFrom" placeholder="MM/DD/YYYY" maxlength="10"/>
          </div>
          <div class="filter-group">
            <div class="filter-label">Date Created To</div>
            <input class="filter-input" type="text" id="f-createdTo" placeholder="MM/DD/YYYY" maxlength="10"/>
          </div>
          <div class="filter-spacer"></div>
          <button type="button" class="btn btn-primary" onclick="runSearch()" id="btn-search">
            <svg width="14" height="14" fill="none" viewBox="0 0 14 14"><circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.6"/><path d="M10 10l3 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
            <span id="btn-search-label">Search Files</span>
          </button>
        </div>
        <div class="filters-hint">Pick folders on the left, adjust filters, then run <strong>Search Files</strong> — nothing loads until you search.</div>
      </div>

      <!-- Stats row -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-icon si-brand">
            <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path d="M4 3h12l2 2v12a1 1 0 01-1 1H3a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="#3D5AFE" stroke-width="1.6"/><path d="M6 9h8M6 12h5" stroke="#3D5AFE" stroke-width="1.6" stroke-linecap="round"/></svg>
          </div>
          <div>
            <div class="stat-val" id="s-total">0</div>
            <div class="stat-lbl">Total Found</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon si-green">
            <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" stroke="#16A34A" stroke-width="1.6"/><path d="M7 10l2.5 2.5L13 8" stroke="#16A34A" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          <div>
            <div class="stat-val" id="s-success">0</div>
            <div class="stat-lbl">Downloaded</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon si-rose">
            <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" stroke="#E11D48" stroke-width="1.6"/><path d="M7 13l6-6M13 13l-6-6" stroke="#E11D48" stroke-width="1.6" stroke-linecap="round"/></svg>
          </div>
          <div>
            <div class="stat-val" id="s-failed">0</div>
            <div class="stat-lbl">Failed</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon si-amber">
            <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" stroke="#D68A0E" stroke-width="1.6"/><path d="M10 6v4l3 2" stroke="#D68A0E" stroke-width="1.6" stroke-linecap="round"/></svg>
          </div>
          <div>
            <div class="stat-val" id="s-pending">0</div>
            <div class="stat-lbl">Remaining</div>
          </div>
        </div>
      </div>

      <!-- Results table -->
      <div class="panel table-container" id="table-container">
        <div class="table-head">
          <div>
            <div class="table-title" id="table-title">Search Results</div>
            <div class="table-meta" id="table-meta">0 files</div>
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
            <colgroup id="inv-colgroup">
              <col style="width:4%">
              <col style="width:26%">
              <col style="width:20%">
              <col style="width:12%">
              <col style="width:10%">
              <col style="width:13%">
              <col style="width:15%">
            </colgroup>
            <thead id="inv-thead">
              <tr>
                <th><input type="checkbox" id="cb-all" onchange="onSelectAll(this)"/></th>
                <th>Name</th>
                <th>Folder</th>
                <th>File Type</th>
                <th>Size</th>
                <th>Date Created</th>
                <th>DL Status</th>
              </tr>
            </thead>
            <tbody id="inv-tbody"></tbody>
          </table>
        </div>
        <div id="pagination-controls" class="pagination-controls" style="display:none"></div>
      </div>

      <!-- Empty state -->
      <div class="panel empty-state" id="empty-state">
        <div class="empty-icon" id="empty-icon">📁</div>
        <div class="empty-text" id="empty-text">No files found</div>
        <div class="empty-sub" id="empty-sub">Select one or more folders on the left, then click Search Files</div>
      </div>

    </main>
  </div><!-- /layout -->
</div><!-- /app -->


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
              <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" fill="#FFF3DF" stroke="#D68A0E" stroke-width="1.6"/>
              <path d="M11 11v5M8.5 13.5L11 16l2.5-2.5" stroke="#D68A0E" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div>
            <div class="modal-title">Choose <em>Save Location</em></div>
            <div class="modal-sub" id="step1-sub">Select where files will be saved on your machine</div>
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

        <!-- Selection summary -->
        <div>
          <div class="sec-label">Selected for Download</div>
          <div class="summary-chips" id="summary-chips">
            <div class="s-chip hi">
              <svg width="12" height="12" fill="none" viewBox="0 0 12 12"><path d="M2 2h8l1 1v7a1 1 0 01-1 1H2a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" stroke-width="1.2"/></svg>
              <span id="chip-count">0 Files</span>
            </div>
            <div class="s-chip">
              <svg width="12" height="12" fill="none" viewBox="0 0 12 12"><path d="M2 1.5h5l1.5 2H10a1 1 0 011 1v5a1 1 0 01-1 1H2a1 1 0 01-1-1v-7a1 1 0 011-1z" stroke="currentColor" stroke-width="1.2"/><path d="M4 7h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
              Est. ~<span id="chip-est">0</span> KB
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
              <span class="qf" onclick="event.stopPropagation();pickQuick(this,'Downloads')">📥 Downloads</span>
              <span class="qf" onclick="event.stopPropagation();pickQuick(this,'Desktop')">🖥️ Desktop</span>
              <span class="qf" onclick="event.stopPropagation();pickQuick(this,'Documents/Invoices')">📄 Documents</span>
            </div>
          </div>
          <div class="folder-note">
            <svg width="12" height="12" fill="none" viewBox="0 0 12 12"><circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.2"/><path d="M6 4.5v3M6 9v.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
            Tip: If the browser blocks a top-level folder (e.g. Downloads), simply select or create a subfolder inside it.
          </div>
        </div>

        <!-- Download Settings -->
        <div>
          <div class="sec-label">Download Settings</div>
          <div class="settings-grid">
            <div class="field-g">
              <label>Filename Prefix <span style="color:var(--ink-faint);font-weight:400">(optional)</span></label>
              <input class="field-input" type="text" id="f-prefix" placeholder="e.g. ClientName_" maxlength="50"/>
            </div>
            <div class="field-g">
              <label>Download at a time &nbsp;<span style="color:var(--brand);font-weight:700" id="concur-display">5</span></label>
              <div class="slider-wrap">
                <span style="font-size:11px;color:var(--ink-faint)">1</span>
                <input type="range" min="1" max="10" value="5" id="f-concur"
                  oninput="document.getElementById('concur-display').textContent=this.value;document.getElementById('concur-val').textContent=this.value"/>
                <span style="font-size:11px;color:var(--ink-faint)">10</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Advanced toggles -->
        <div>
          <div class="sec-label">Options</div>
          <div class="options-card">
            <div class="toggle-row">
              <div>
                <div class="tl-label">Skip failed files</div>
                <div class="tl-sub">Continue downloading even if one file fails</div>
              </div>
              <input type="checkbox" id="f-skiperr" checked class="opt-checkbox"/>
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
        <span id="folder-tip" style="font-size:12px;color:var(--accent-dark);display:flex;align-items:center;gap:5px;margin-right:auto;">
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
          <div class="mh-icon mhi-brand">
            <svg width="22" height="22" fill="none" viewBox="0 0 22 22"><path d="M11 3v12M7 11l4 4 4-4M4 19h14" stroke="#3D5AFE" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          <div>
            <div class="modal-title">Downloading <em>Files</em></div>
            <div class="modal-sub" id="step2-sub">Saving files…</div>
          </div>
        </div>
        <div style="font-size:11.5px;font-weight:600;color:var(--ink-faint);">Do not close this window</div>
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
              <div class="dl-hero-title">Downloading Files</div>
              <div class="dl-hero-sub" id="dl-hero-sub">NetSuite File Cabinet · Suitelet</div>
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
          <button type="button" class="ctrl-btn ctrl-stop" id="btn-stop" onclick="cancelDownload()">
            <svg width="11" height="11" fill="none" viewBox="0 0 11 11"><rect x="1.5" y="1.5" width="8" height="8" rx="1.5" fill="currentColor"/></svg>
            Stop
          </button>
          <div class="speed-info">
            <svg width="12" height="12" fill="none" viewBox="0 0 12 12"><path d="M1 6h2l1.5-3 2 6 1.5-4.5L9.5 7H11" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <span class="speed-val" id="speed-disp">—</span>
          </div>
        </div>

      </div><!-- /modal-body step 2 -->

      <div class="modal-footer">
        <div style="font-size:12px;color:var(--ink-faint)">
          At a time: <strong id="concur-val" style="color:var(--brand)">5</strong> · Skip errors: <strong id="skiperr-disp" style="color:var(--brand)">On</strong>
        </div>
      </div>
    </div><!-- /step 2 -->

    <!-- ── STEP 3: Complete ── -->
    <div id="modal-step-3" style="display:none">
      <div class="modal-header">
        <div class="mh-left">
          <div class="mh-icon mhi-green">
            <svg width="22" height="22" fill="none" viewBox="0 0 22 22">
              <circle cx="11" cy="11" r="9" fill="#DCFCE7" stroke="#16A34A" stroke-width="1.7"/>
              <path d="M7 11l3 3 5-5" stroke="#16A34A" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
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

        <div id="done-error-list" style="display:none;max-height:160px;overflow-y:auto;text-align:left;margin:10px 0;padding:8px 12px;border-radius:8px;background:var(--danger-pale);border:1px solid #F3AEBB;font-size:12.5px;">
          <div style="font-weight:600;margin-bottom:6px;color:var(--danger);">Failed Downloads:</div>
          <ul id="done-error-items" style="margin:0;padding-left:18px;list-style:disc;color:var(--ink);"></ul>
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
