/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 *
 * PDC — CSS Styles Template
 * All CSS design tokens and styles for the Print & Download Center UI.
 */
define([], () => {

  /**
   * @returns {string} Complete CSS stylesheet content
   */
  const getStyles = () => `
:root {
  --teal-deep:     #0D4A4A;
  --teal-mid:      #1A6B6B;
  --teal-bright:   #2E9E9E;
  --teal-glow:     #4DC8C8;
  --teal-pale:     #E0F5F5;
  --amber:         #E8923A;
  --amber-light:   #F5B97A;
  --amber-pale:    #FEF0E0;
  --cream:         #F5EFE0;
  --sage:          #7BB5A0;
  --rose:          #D96060;
  --rose-pale:     #FAE8E8;
  --green:         #2A8A5E;
  --green-pale:    #DFF5EC;
  --surface:       #EFF6F6;
  --card:          #FAFCFC;
  --border:        #C8DEDE;
  --text-primary:  #0D3333;
  --text-secondary:#3D6666;
  --text-muted:    #7A9E9E;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'DM Sans', sans-serif;
  background: var(--surface);
  color: var(--text-primary);
  min-height: 100vh;
  overflow-x: hidden;
}

body::before {
  content: '';
  position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background:
    radial-gradient(ellipse 900px 600px at 0% 0%,   #1A6B6B18 0%, transparent 70%),
    radial-gradient(ellipse 600px 800px at 100% 100%,#E8923A12 0%, transparent 70%),
    radial-gradient(ellipse 500px 400px at 60% 20%,  #4DC8C80A 0%, transparent 60%);
}

/* ════════════════════════════════════
   MAIN CONTENT
════════════════════════════════════ */
.main {
  min-height: 100vh;
  padding: 30px 34px;
  position: relative; z-index: 1;
  display: flex; flex-direction: column; gap: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

/* ── Page header ── */
.page-header {
  display: flex; align-items: flex-start; justify-content: space-between;
}
.page-title {
  font-family: 'Fraunces', serif;
  font-size: 32px; font-weight: 500;
  color: var(--teal-deep); letter-spacing: -0.8px; line-height: 1.1;
}
.page-title em { color: var(--teal-bright); font-style: italic; }
.page-sub { font-size: 13px; color: var(--text-secondary); margin-top: 5px; }

/* ── FSAPI Warning ── */
.fsapi-warn {
  display: none;
  background: var(--amber-pale); border: 1.5px solid var(--amber-light);
  border-radius: 12px; padding: 12px 18px;
  font-size: 13px; color: var(--amber);
  align-items: center; gap: 10px;
}
.fsapi-warn.show { display: flex; }

/* ── Stats row ── */
.stats-row {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px;
}
.stat-card {
  background: var(--card); border: 1px solid var(--border);
  border-radius: 16px; padding: 18px 20px;
  display: flex; align-items: center; gap: 14px;
  box-shadow: 0 2px 12px #0D4A4A08;
  transition: transform 0.18s, box-shadow 0.18s;
}
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px #0D4A4A12; }
.stat-icon {
  width: 42px; height: 42px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  font-size: 18px;
}
.si-teal  { background: var(--teal-pale); }
.si-green { background: var(--green-pale); }
.si-rose  { background: var(--rose-pale); }
.si-amber { background: var(--amber-pale); }
.stat-val {
  font-family: 'Fraunces', serif; font-size: 26px; font-weight: 700;
  color: var(--text-primary); line-height: 1;
}
.stat-lbl {
  font-size: 11px; color: var(--text-muted); margin-top: 3px;
  text-transform: uppercase; letter-spacing: 0.7px; font-weight: 600;
}

/* ── Filter bar ── */
.filter-bar {
  background: var(--card); border: 1px solid var(--border);
  border-radius: 16px; padding: 16px 20px;
  display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap;
  box-shadow: 0 2px 12px #0D4A4A08;
}
.filter-group { display: flex; flex-direction: column; gap: 5px; }
.filter-label {
  font-size: 10.5px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.7px; color: var(--text-muted);
}
.filter-input, .filter-select {
  padding: 9px 12px; border: 1.5px solid var(--border);
  border-radius: 10px; font-size: 13px;
  font-family: 'DM Sans', sans-serif;
  color: var(--text-primary); background: var(--surface);
  outline: none; transition: border-color 0.18s, box-shadow 0.18s;
  min-width: 130px;
}
.filter-input:focus, .filter-select:focus {
  border-color: var(--teal-bright);
  box-shadow: 0 0 0 3px #2E9E9E14;
}
.filter-input[type="date"]::-webkit-calendar-picker-indicator {
  filter: opacity(0.5);
}
.filter-select {
  appearance: none; cursor: pointer; padding-right: 28px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='7' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%237A9E9E' stroke-width='1.4' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 10px center;
}
.filter-divider { width: 1px; height: 38px; background: var(--border); align-self: flex-end; }

/* ── Buttons ── */
.btn {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 10px 20px; border-radius: 10px;
  font-family: 'DM Sans', sans-serif;
  font-size: 13.5px; font-weight: 600;
  cursor: pointer; border: none; transition: all 0.18s;
}
.btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none !important; }
.btn-primary {
  background: linear-gradient(135deg, var(--teal-deep), var(--teal-mid));
  color: var(--cream); box-shadow: 0 4px 14px #0D4A4A28;
}
.btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px #0D4A4A38; }
.btn-amber {
  background: linear-gradient(135deg, var(--amber), var(--amber-light));
  color: var(--teal-deep); box-shadow: 0 4px 14px #E8923A35;
}
.btn-amber:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px #E8923A48; }
.btn-outline {
  background: transparent; border: 1.5px solid var(--border);
  color: var(--text-secondary);
}
.btn-outline:hover { border-color: var(--teal-bright); color: var(--teal-mid); }
.btn-ghost { background: transparent; color: var(--text-muted); }
.btn-ghost:hover { color: var(--text-secondary); }
.btn-success {
  background: linear-gradient(135deg, var(--green), #3AAA74);
  color: var(--cream); box-shadow: 0 4px 14px #2A8A5E28;
}
.btn-success:hover:not(:disabled) { transform: translateY(-1px); }
.btn-danger {
  background: var(--rose-pale); border: 1.5px solid #E8AAAA;
  color: var(--rose);
}
.btn-danger:hover:not(:disabled) { background: #F2D0D0; }
.btn-sm { padding: 7px 14px; font-size: 12.5px; border-radius: 8px; }

/* ── Table ── */
.table-container {
  background: var(--card); border: 1px solid var(--border);
  border-radius: 18px; overflow: hidden;
  box-shadow: 0 2px 16px #0D4A4A0A;
  display: none;
}
.table-container.show { display: block; }
.table-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px 14px; border-bottom: 1px solid var(--border);
  background: linear-gradient(135deg, #F2FAFA, #FAFCFC);
}
.table-title {
  font-family: 'Fraunces', serif; font-size: 16px; font-weight: 500;
  color: var(--text-primary);
}
.table-meta { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.table-actions { display: flex; gap: 8px; align-items: center; }

.table-scroll { max-height: 380px; overflow-y: auto; }
table { width: 100%; border-collapse: collapse; }
thead tr { background: #F2FAFA; border-bottom: 1px solid var(--border); }
th {
  padding: 11px 14px 10px; text-align: left;
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.8px;
  text-transform: uppercase; color: var(--text-muted); white-space: nowrap;
  position: sticky; top: 0; background: #F2FAFA;
  border-bottom: 1px solid var(--border);
}
th:first-child { padding-left: 20px; width: 44px; }
th:last-child  { padding-right: 20px; text-align: right; }
tbody tr { border-bottom: 1px solid #EEF5F5; transition: background 0.12s; }
tbody tr:last-child { border-bottom: none; }
tbody tr:hover { background: #F6FCFC; }
tbody tr.row-active { background: #EBF7F7; }
tbody tr.row-ok     { background: var(--green-pale); }
tbody tr.row-err    { background: var(--rose-pale); }
td { padding: 13px 14px; font-size: 13px; color: var(--text-primary); vertical-align: middle; }
td:first-child { padding-left: 20px; }
td:last-child  { padding-right: 20px; text-align: right; }

.cb-wrap { display: flex; align-items: center; }
input[type="checkbox"] { width: 15px; height: 15px; accent-color: var(--teal-mid); cursor: pointer; }
.tran-id { font-weight: 600; color: var(--teal-mid); font-size: 13px; }
.cust-cell { display: flex; align-items: center; gap: 9px; }
.cust-av {
  width: 28px; height: 28px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 700; flex-shrink: 0;
  background: var(--teal-pale); color: var(--teal-mid);
}
.amount { font-weight: 600; }
.amount.credit { color: var(--rose); }

/* Status badges */
.badge-status {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 9px; border-radius: 20px;
  font-size: 11px; font-weight: 600;
}
.badge-status::before {
  content: ''; width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0;
}
.bs-paid    { background: var(--green-pale); color: var(--green); }
.bs-paid::before { background: var(--green); }
.bs-open    { background: var(--amber-pale); color: var(--amber); }
.bs-open::before { background: var(--amber); }
.bs-overdue { background: var(--rose-pale); color: var(--rose); }
.bs-overdue::before { background: var(--rose); }
.bs-partial { background: #E8EEF8; color: #3B6CB5; }
.bs-partial::before { background: #3B6CB5; }
.bs-other   { background: var(--surface); color: var(--text-muted); border: 1px solid var(--border); }
.bs-other::before { background: var(--text-muted); }

/* Row download status */
.dl-status { display: flex; align-items: center; gap: 6px; justify-content: flex-end; font-size: 12px; font-weight: 600; }
.status-dot {
  display: inline-block; width: 7px; height: 7px;
  border-radius: 50%; flex-shrink: 0;
}
.dot-pending { background: var(--text-muted); }
.dot-ok      { background: var(--green); }
.dot-err     { background: var(--rose); }
.dot-active  { background: var(--teal-bright); animation: pulseDot 1s ease infinite; }
@keyframes pulseDot { 0%,100%{ opacity:1; } 50%{ opacity:0.3; } }

/* ── Empty state ── */
.empty-state {
  display: none; text-align: center;
  background: var(--card); border: 1px solid var(--border);
  border-radius: 18px; padding: 60px 30px;
  box-shadow: 0 2px 16px #0D4A4A0A;
}
.empty-state.show { display: block; }
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.empty-text { font-size: 15px; color: var(--text-muted); font-weight: 500; }
.empty-sub  { font-size: 13px; color: var(--text-muted); margin-top: 6px; }


/* ════════════════════════════════════
   DOWNLOAD MODAL
════════════════════════════════════ */
.modal-overlay {
  position: fixed; inset: 0; z-index: 500;
  background: #0D3333CC; backdrop-filter: blur(6px);
  display: none; align-items: center; justify-content: center;
  padding: 24px;
}
.modal-overlay.show { display: flex; }

.modal-card {
  background: var(--card); border: 1px solid var(--border);
  border-radius: 24px; overflow: hidden;
  box-shadow: 0 24px 80px #0D4A4A3A, 0 4px 20px #0D4A4A1A;
  width: 100%; max-width: 660px;
  max-height: 90vh; overflow-y: auto;
  animation: modalIn 0.35s cubic-bezier(0.4,0,0.2,1);
}
@keyframes modalIn {
  from { opacity: 0; transform: translateY(20px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* ── Modal header ── */
.modal-header {
  padding: 26px 30px 20px;
  border-bottom: 1px solid var(--border);
  display: flex; align-items: flex-start; justify-content: space-between;
  background: linear-gradient(135deg, #F2FAFA 0%, #FAFCFC 100%);
  position: sticky; top: 0; z-index: 10;
}
.mh-left { display: flex; align-items: flex-start; gap: 14px; }
.mh-icon {
  width: 44px; height: 44px; border-radius: 13px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.mhi-amber { background: var(--amber-pale); }
.mhi-teal  { background: var(--teal-pale); }
.mhi-green { background: var(--green-pale); }
.modal-title {
  font-family: 'Fraunces', serif;
  font-size: 21px; font-weight: 500;
  color: var(--text-primary); letter-spacing: -0.4px;
}
.modal-title em { color: var(--teal-bright); font-style: italic; }
.modal-sub { font-size: 12.5px; color: var(--text-muted); margin-top: 4px; }
.close-modal {
  width: 28px; height: 28px; border-radius: 7px;
  border: 1.5px solid var(--border); background: transparent;
  cursor: pointer; color: var(--text-muted); font-size: 16px;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s;
}
.close-modal:hover { background: var(--surface); color: var(--text-primary); }

/* ── Step track ── */
.step-track {
  display: flex; align-items: center;
  padding: 14px 30px;
  background: var(--surface); border-bottom: 1px solid var(--border);
}
.step-node { display: flex; align-items: center; gap: 8px; flex: 1; }
.step-node:last-child { flex: none; }
.step-circ {
  width: 27px; height: 27px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; flex-shrink: 0;
  border: 2px solid var(--border);
  background: var(--card); color: var(--text-muted); transition: all 0.3s;
}
.step-circ.done { background: var(--green); border-color: var(--green); color: var(--cream); }
.step-circ.curr { background: var(--teal-mid); border-color: var(--teal-mid); color: var(--cream); box-shadow: 0 0 0 4px #2E9E9E1E; }
.step-name { font-size: 11.5px; font-weight: 600; color: var(--text-muted); white-space: nowrap; }
.step-name.done { color: var(--green); }
.step-name.curr { color: var(--teal-mid); }
.step-conn { flex: 1; height: 2px; background: var(--border); margin: 0 6px; position: relative; }
.step-conn.done::after { content:''; position:absolute; inset:0; background: var(--green); }

/* ── Modal body & footer ── */
.modal-body   { padding: 24px 30px; display: flex; flex-direction: column; gap: 20px; }
.modal-footer {
  padding: 16px 30px 24px; border-top: 1px solid var(--border);
  display: flex; align-items: center; gap: 10px;
  background: var(--surface);
  position: sticky; bottom: 0; z-index: 10;
}

/* ── Section label ── */
.sec-label {
  font-size: 10px; font-weight: 700; letter-spacing: 1.4px;
  text-transform: uppercase; color: var(--text-muted); margin-bottom: 9px;
}

/* ── Summary chips ── */
.summary-chips { display: flex; gap: 8px; flex-wrap: wrap; }
.s-chip {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 6px 12px; border-radius: 9px;
  border: 1.5px solid var(--border);
  font-size: 12.5px; font-weight: 600;
  color: var(--text-secondary); background: var(--surface);
}
.s-chip.hi { border-color: var(--teal-bright); color: var(--teal-mid); background: var(--teal-pale); }

/* ── Folder picker ── */
.folder-picker {
  background: var(--surface); border: 2px dashed var(--border);
  border-radius: 14px; padding: 20px;
  cursor: pointer; transition: all 0.18s;
}
.folder-picker:hover { border-color: var(--teal-bright); background: #EBF7F7; }
.folder-picker.selected { border-style: solid; border-color: var(--teal-bright); background: #EBF7F7; }
.fp-top { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.fp-icon {
  width: 44px; height: 44px; border-radius: 12px;
  background: var(--amber-pale);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 20px;
}
.fp-title { font-size: 13.5px; font-weight: 600; color: var(--text-primary); }
.fp-hint  { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.fp-browse {
  margin-left: auto; padding: 8px 16px; border-radius: 9px;
  background: var(--card); border: 1.5px solid var(--border);
  font-size: 12.5px; font-weight: 600; cursor: pointer;
  font-family: 'DM Sans', sans-serif; color: var(--text-secondary);
  transition: all 0.18s; display: flex; align-items: center; gap: 7px; flex-shrink: 0;
}
.fp-browse:hover { border-color: var(--teal-bright); color: var(--teal-mid); background: var(--teal-pale); }
.fp-browse.chosen { background: var(--teal-mid); color: var(--cream); border-color: var(--teal-mid); }
.path-row {
  display: flex; align-items: center; gap: 9px;
  background: var(--card); border: 1.5px solid var(--border);
  border-radius: 9px; padding: 9px 13px; font-size: 12.5px;
}
.path-text { flex: 1; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.path-text.chosen { color: var(--teal-mid); font-weight: 500; }
.path-change { font-size: 11.5px; font-weight: 600; color: var(--teal-bright); cursor: pointer; flex-shrink: 0; }
.quick-folders { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
.qf {
  display: flex; align-items: center; gap: 7px;
  padding: 6px 11px; border-radius: 9px;
  border: 1.5px solid var(--border); background: var(--card);
  font-size: 12px; font-weight: 500; color: var(--text-secondary);
  cursor: pointer; transition: all 0.15s;
}
.qf:hover  { border-color: var(--teal-bright); color: var(--teal-mid); background: var(--teal-pale); }
.qf.active { border-color: var(--teal-bright); color: var(--teal-mid); background: var(--teal-pale); }

/* ── Settings grid ── */
.settings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field-g label {
  display: block; font-size: 10.5px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.5px;
  color: var(--text-muted); margin-bottom: 6px;
}
.field-input, .field-select {
  width: 100%; padding: 9px 12px; border: 1.5px solid var(--border);
  border-radius: 9px; font-size: 13px;
  font-family: 'DM Sans', sans-serif;
  color: var(--text-primary); background: var(--surface);
  outline: none; transition: border-color 0.18s, box-shadow 0.18s;
}
.field-input:focus, .field-select:focus {
  border-color: var(--teal-bright); box-shadow: 0 0 0 3px #2E9E9E12;
}
.field-select {
  appearance: none; cursor: pointer; padding-right: 28px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='7' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%237A9E9E' stroke-width='1.4' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 10px center;
}
.preview-row {
  grid-column: 1/-1; background: var(--teal-pale); border-radius: 9px;
  padding: 9px 13px; font-size: 12px; color: var(--teal-mid); font-weight: 500;
  display: flex; align-items: center; gap: 8px;
}
.preview-row span { color: var(--text-muted); font-size: 11px; }

/* Slider */
.slider-wrap { display: flex; align-items: center; gap: 9px; }
.slider-wrap input[type="range"] {
  flex: 1; accent-color: var(--teal-mid); height: 4px;
}
.slider-val {
  font-family: 'DM Mono', monospace; font-size: 14px;
  font-weight: 700; color: var(--teal-mid); min-width: 22px; text-align: center;
}

/* Toggle row */
.toggle-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 0; border-bottom: 1px solid #EEF5F5;
}
.toggle-row:last-child { border-bottom: none; }
.tl-label { font-size: 13px; font-weight: 500; }
.tl-sub   { font-size: 11px; color: var(--text-muted); }
.toggle-sw {
  width: 34px; height: 19px; border-radius: 10px;
  background: var(--border); cursor: pointer;
  position: relative; transition: background 0.2s; border: none; flex-shrink: 0;
}
.toggle-sw::after {
  content: ''; position: absolute; top: 3px; left: 3px;
  width: 13px; height: 13px; border-radius: 50%;
  background: var(--card); transition: transform 0.2s; box-shadow: 0 1px 3px #0004;
}
.toggle-sw.on { background: var(--teal-bright); }
.toggle-sw.on::after { transform: translateX(15px); }

/* ── Download step 2 ── */
.dl-hero {
  background: linear-gradient(135deg, var(--teal-deep) 0%, #155E5E 100%);
  border-radius: 16px; padding: 22px 24px; position: relative; overflow: hidden;
}
.dl-hero::before {
  content: ''; position: absolute; right: -30px; top: -30px;
  width: 160px; height: 160px; border-radius: 50%;
  background: #4DC8C810; border: 36px solid #4DC8C808;
}
.dl-hero-top {
  display: flex; align-items: flex-start; justify-content: space-between;
  margin-bottom: 16px; position: relative; z-index: 1;
}
.dl-hero-title {
  font-family: 'Fraunces', serif; font-size: 18px; font-weight: 500;
  color: var(--cream);
}
.dl-hero-sub { font-size: 12px; color: #88C8C8; margin-top: 3px; }
.dl-status-pill {
  display: flex; align-items: center; gap: 6px;
  padding: 4px 11px; border-radius: 20px;
  background: #2E9E9E33; border: 1px solid #4DC8C844;
  font-size: 11px; font-weight: 600; color: var(--teal-glow);
}
.pulse { width: 6px; height: 6px; border-radius: 50%; background: var(--teal-glow); animation: pulseDot 1.4s ease infinite; }
.ring-wrap { display: flex; align-items: center; gap: 20px; position: relative; z-index: 1; }
.ring-cont { position: relative; width: 76px; height: 76px; flex-shrink: 0; }
.ring-cont svg { transform: rotate(-90deg); }
.r-bg   { fill: none; stroke: #2E9E9E33; stroke-width: 6; }
.r-fill {
  fill: none; stroke: var(--teal-glow); stroke-width: 6; stroke-linecap: round;
  stroke-dasharray: 207; stroke-dashoffset: 207;
  transition: stroke-dashoffset 0.5s cubic-bezier(0.4,0,0.2,1);
}
.ring-txt {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Fraunces', serif; font-size: 17px; font-weight: 700; color: var(--cream);
}
.dl-mini-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; flex: 1; }
.dm-val { font-family: 'Fraunces', serif; font-size: 19px; font-weight: 500; color: var(--cream); }
.dm-lbl { font-size: 10px; color: #88C8C8; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.8px; }
.overall-bar-wrap { margin-top: 12px; position: relative; z-index: 1; }
.ob-top {
  display: flex; justify-content: space-between;
  font-size: 11px; margin-bottom: 5px; color: #88C8C8;
}
.ob-track { height: 6px; background: #2E9E9E33; border-radius: 3px; overflow: hidden; }
.ob-fill {
  height: 100%; width: 0%;
  background: linear-gradient(90deg, var(--teal-glow), var(--amber-light));
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
  background: var(--teal-pale); border: 1.5px solid var(--border);
  border-radius: 12px; padding: 11px 14px; font-size: 12.5px;
}
.dest-icon { font-size: 18px; flex-shrink: 0; }
.dest-lbl  { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.7px; color: var(--text-muted); }
.dest-path { font-size: 12.5px; color: var(--teal-mid); font-weight: 500; margin-top: 1px; word-break: break-all; }
.dest-change { margin-left: auto; font-size: 11.5px; font-weight: 600; color: var(--teal-bright); cursor: pointer; flex-shrink: 0; }
.dest-change:hover { text-decoration: underline; }

.dl-controls { display: flex; align-items: center; gap: 8px; }
.ctrl-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 14px; border-radius: 9px; font-size: 12.5px; font-weight: 600;
  border: 1.5px solid var(--border); background: var(--card); cursor: pointer;
  font-family: 'DM Sans', sans-serif; color: var(--text-secondary); transition: all 0.15s;
}
.ctrl-btn:hover { border-color: var(--teal-bright); color: var(--teal-mid); }
.ctrl-pause { background: var(--amber-pale); border-color: #F0B87A; color: var(--amber); }
.ctrl-cancel { background: var(--rose-pale); border-color: #E8AAAA; color: var(--rose); }
.ctrl-cancel:disabled { opacity: 0.5; cursor: not-allowed; }
.speed-info {
  margin-left: auto; font-size: 12px; font-weight: 600;
  color: var(--text-muted); display: flex; align-items: center; gap: 5px;
}
.speed-val { color: var(--teal-mid); }


/* ── Complete step ── */
.done-icon-wrap {
  width: 72px; height: 72px; border-radius: 50%;
  background: var(--green-pale); border: 3px solid var(--green);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 16px; font-size: 28px;
  box-shadow: 0 0 0 8px #2A8A5E10;
  animation: popIn 0.5s cubic-bezier(0.4,0,0.2,1);
}
@keyframes popIn {
  from { transform: scale(0.4); opacity: 0; }
  to   { transform: scale(1); opacity: 1; }
}
.done-title {
  font-family: 'Fraunces', serif; font-size: 24px; font-weight: 500;
  color: var(--text-primary); text-align: center; letter-spacing: -0.4px;
}
.done-title em { color: var(--green); font-style: italic; }
.done-sub { font-size: 13px; color: var(--text-muted); text-align: center; margin-top: 4px; margin-bottom: 22px; }
.done-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 18px; }
.done-stat-card {
  background: var(--surface); border: 1.5px solid var(--border);
  border-radius: 13px; padding: 15px 12px; text-align: center;
}
.dsv { font-family: 'Fraunces', serif; font-size: 22px; font-weight: 700; color: var(--text-primary); }
.dsl { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.7px; color: var(--text-muted); margin-top: 3px; font-weight: 600; }
.done-path-card {
  background: var(--teal-pale); border: 1.5px solid var(--teal-bright);
  border-radius: 13px; padding: 13px 16px;
  display: flex; align-items: center; gap: 12px; margin-bottom: 18px;
}
.dpc-lbl { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: var(--teal-mid); }
.dpc-path { font-size: 13px; font-weight: 500; color: var(--teal-deep); margin-top: 2px; word-break: break-all; }
.done-actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }

/* Warning banner */
.warn-banner {
  background: var(--amber-pale); border: 1.5px solid var(--amber-light);
  border-radius: 12px; padding: 12px 16px;
  font-size: 13px; color: #9A5A1A;
  display: none; align-items: flex-start; gap: 10px;
}
.warn-banner.show { display: flex; }

/* Scrollbar */
::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

/* ── Per-row action buttons ── */
.row-actions { display: flex; align-items: center; gap: 5px; justify-content: flex-end; }
.icon-btn {
  width: 30px; height: 30px; border-radius: 8px;
  border: 1.5px solid var(--border); background: transparent;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  color: var(--text-muted); transition: all 0.15s; flex-shrink: 0;
}
.icon-btn:hover       { background: var(--surface); border-color: var(--teal-bright); color: var(--teal-mid); }
.icon-btn.dl:hover    { background: var(--teal-pale); border-color: var(--teal-bright); color: var(--teal-mid); }
.icon-btn.preview:hover { background: var(--amber-pale); border-color: var(--amber-light); color: var(--amber); }

/* ════════════════════════════════════
   MULTISELECT DROPDOWN
════════════════════════════════════ */
.ms-wrap {
  position: relative;
  min-width: 200px;
}
.ms-trigger {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  min-height: 38px; padding: 4px 32px 4px 10px;
  border: 1.5px solid var(--border); border-radius: 10px;
  background: var(--surface); cursor: pointer;
  transition: border-color 0.18s, box-shadow 0.18s;
  position: relative;
}
.ms-trigger:focus-within,
.ms-wrap.open .ms-trigger {
  border-color: var(--teal-bright);
  box-shadow: 0 0 0 3px #2E9E9E14;
}
.ms-trigger .ms-arrow {
  position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
  pointer-events: none; color: var(--text-muted); transition: transform 0.18s;
}
.ms-wrap.open .ms-trigger .ms-arrow { transform: translateY(-50%) rotate(180deg); }
.ms-placeholder {
  font-size: 13px; color: var(--text-muted);
  font-family: 'DM Sans', sans-serif; user-select: none;
  white-space: nowrap;
}
.ms-pill {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 7px 2px 8px; border-radius: 6px;
  background: var(--teal-pale); border: 1px solid #C0E4E4;
  font-size: 11.5px; font-weight: 600; color: var(--teal-mid);
  white-space: nowrap; max-width: 130px;
}
.ms-pill span { overflow: hidden; text-overflow: ellipsis; max-width: 110px; }
.ms-pill-remove {
  cursor: pointer; color: var(--teal-mid); opacity: 0.6;
  display: flex; align-items: center; flex-shrink: 0;
  transition: opacity 0.15s;
}
.ms-pill-remove:hover { opacity: 1; }
.ms-pill-more {
  font-size: 11px; color: var(--text-muted); white-space: nowrap;
  padding: 2px 6px; background: #EEF5F5; border-radius: 6px;
  border: 1px solid var(--border);
}
.ms-dropdown {
  position: absolute; top: calc(100% + 5px); left: 0; right: 0;
  background: var(--card); border: 1.5px solid var(--border);
  border-radius: 12px; box-shadow: 0 8px 32px #0D4A4A18;
  z-index: 300; overflow: hidden;
  display: none;
}
.ms-wrap.open .ms-dropdown { display: block; }
.ms-search-wrap {
  padding: 8px 10px; border-bottom: 1px solid var(--border);
  background: #F7FBFB;
}
.ms-search {
  width: 100%; padding: 7px 10px 7px 30px;
  border: 1.5px solid var(--border); border-radius: 8px;
  font-size: 12.5px; font-family: 'DM Sans', sans-serif;
  color: var(--text-primary); background: var(--surface);
  outline: none; transition: border-color 0.18s;
}
.ms-search:focus { border-color: var(--teal-bright); }
.ms-search-icon {
  position: absolute; left: 19px; top: 50%; transform: translateY(-50%);
  color: var(--text-muted); pointer-events: none;
}
.ms-search-box { position: relative; }
.ms-list {
  max-height: 200px; overflow-y: auto;
  padding: 4px 0;
}
.ms-list::-webkit-scrollbar { width: 5px; }
.ms-list::-webkit-scrollbar-track { background: transparent; }
.ms-list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
.ms-option {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 12px; cursor: pointer;
  font-size: 13px; color: var(--text-primary);
  transition: background 0.12s; user-select: none;
}
.ms-option:hover { background: var(--teal-pale); }
.ms-option.selected { background: #EBF7F7; }
.ms-option input[type="checkbox"] {
  width: 14px; height: 14px; flex-shrink: 0;
  accent-color: var(--teal-mid); cursor: pointer;
}
.ms-option-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ms-option-sub { font-size: 11px; color: var(--text-muted); flex-shrink: 0; }
.ms-footer {
  padding: 7px 12px; border-top: 1px solid var(--border);
  background: #F7FBFB;
  display: flex; justify-content: space-between; align-items: center;
}
.ms-footer-count { font-size: 11px; color: var(--text-muted); }
.ms-footer-clear {
  font-size: 11px; color: var(--rose); cursor: pointer;
  font-weight: 600; opacity: 0.8; transition: opacity 0.15s;
}
.ms-footer-clear:hover { opacity: 1; }
.ms-empty {
  padding: 14px 12px; font-size: 12.5px;
  color: var(--text-muted); font-style: italic; text-align: center;
}
.ms-loading {
  padding: 14px 12px; font-size: 12.5px;
  color: var(--text-muted); text-align: center;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}

`;

  return { getStyles };
});
