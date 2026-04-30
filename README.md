# Print & Download Center (Invoice Download)

A NetSuite SuiteScript 2.1 Suitelet that gives users a single, filterable
page for searching and **bulk-downloading transaction PDFs** — invoices,
credit memos, and invoice groups — without clicking through each
transaction record one at a time.

The page is rendered server-side as a NetSuite form with embedded HTML/CSS/JS
and talks back to the same Suitelet via JSON actions to fetch lists and
stream PDFs.

---

## What you can do with it

- **Search transactions** by date range, transaction ID, PO #, work
  authorisation #, customer, subsidiary, department, and status.
- **Switch transaction type** between Invoices, Credit Memos, and Invoice
  Groups from the same UI.
- **Preview a single PDF** in the browser, or **bulk-download** every
  matching transaction as individual PDFs.
- **Use customer / subsidiary / department lookups** that ship pre-loaded
  with the page (no extra round-trip on first load).

---

## Project layout

```
src/
├── manifest.xml                              SuiteCloud manifest (ACCOUNTCUSTOMIZATION)
├── deploy.xml                                What gets deployed
├── Objects/
│   └── customscript_pdf_download_tool.xml    Suitelet + deployment definition
└── FileCabinet/
    └── SuiteScripts/
        └── Transaction PDF Download/
            ├── SL/
            │   └── pdc_SL_main.js            Entry point / action router
            └── LIB/
                ├── pdc_mod_invoices.js       getInvoices  (SuiteQL)
                ├── pdc_mod_creditMemos.js    getCreditMemos (SuiteQL)
                ├── pdc_mod_invoiceGroups.js  getInvoiceGroups (N/search)
                ├── pdc_mod_lookups.js        getLookups + customer/subsidiary/dept fetchers
                ├── pdc_mod_pdfRenderer.js    getPDF (render.transaction / invoicegroup)
                ├── pdc_mod_queryHelper.js    Shared filter / paging utilities
                ├── pdc_mod_htmlBuilder.js    Assembles full HTML page from templates
                ├── pdc_tpl_styles.js         CSS template
                ├── pdc_tpl_markup.js         HTML body template
                └── pdc_tpl_clientScript.js   Client-side JS template
```

`pdc_SL_main.js` routes every request through an `ACTION_MAP`. The action
is taken from the `action` query-string parameter; with no action, the
Suitelet renders the HTML UI page.

---

## Prerequisites

- A NetSuite account with **SuiteCloud Development Framework (SDF)**
  enabled.
- The **SuiteCloud CLI for Node.js** (`@oracle/suitecloud-cli`) installed
  globally, or the SuiteCloud extension for VS Code / WebStorm.
- The **Server SuiteScript** feature enabled (declared as required in
  `manifest.xml`).
- A NetSuite role with permission to deploy SuiteScripts and create
  Suitelet deployments (Administrator works).
- An Advanced PDF/HTML template for Invoice Groups if you intend to use
  the Invoice Group flow (see *Invoice Group template* below).

---

## Installing & deploying

1. **Authenticate the CLI** against the target account. The default auth
   ID configured in `project.json` is `4060931_SB1-Adm-Sand`; replace it
   with your own:

   ```bash
   suitecloud account:setup
   ```

2. **Validate** the project before deploying:

   ```bash
   suitecloud project:validate
   ```

3. **Deploy** files, the Suitelet object, and its deployment:

   ```bash
   suitecloud project:deploy
   ```

   This pushes everything under `src/FileCabinet/**`, the script object
   in `src/Objects/**`, and creates / updates the Suitelet deployment as
   defined in `customscript_pdf_download_tool.xml`.

4. **Confirm** in NetSuite under **Customization → Scripting → Scripts**
   that the script `customscript_pdf_download_tool` exists with a
   deployment `customdeploy_pdf_download_tool` set to **Released** and
   **Deployed = T**.

> ℹ️  The deployment defaults to: Audience → All Roles & All Employees,
> Run As → Administrator, Log Level → DEBUG, Available Without Login → F.
> Adjust on the deployment record if you need tighter audience control or
> external access.

---

## Configuration

### Suitelet script parameter

| Parameter (script ID)              | Type    | Default | Purpose                                                                 |
| ---------------------------------- | ------- | ------- | ----------------------------------------------------------------------- |
| `custscript_pdc_invgrp_tpl_id`     | Integer | `462`   | Internal ID of the Advanced PDF/HTML template used for Invoice Groups. |

Set it on the **deployment record** (Parameters tab) to point at the
correct template ID for your account. `render.transaction` handles
invoices and credit memos automatically — only Invoice Groups need a
custom template.

### Invoice Group template

NetSuite's `render.transaction` API does **not** support invoice groups,
so the renderer (`pdc_mod_pdfRenderer.js:31-44`) loads the
`invoicegroup` record and renders it through `render.create()` against
the Advanced PDF/HTML template referenced by the script parameter above.

Make sure the template you point at:

- Is enabled and accessible to the Run-As role.
- References its data via `record.*` (the renderer registers it under
  template name `record`).

---

## Using the tool

1. Open the deployment URL — easiest route is **Customization →
   Scripting → Script Deployments**, find *PDF Download Tool*, and click
   the link, or use the External URL if "Available Without Login" is on.
2. Pick a **Transaction Type** (Invoices / Credit Memos / Invoice Groups).
3. Apply any combination of filters: date range, Tran ID, PO #, Work
   Auth #, Customer, Subsidiary, Department, Status.
4. Hit **Search**. Results render in the table along with totals.
5. From the result list:
   - Click a row to **preview** the PDF inline.
   - Use the bulk action to **download every matching PDF** as individual
     files.

Behind the scenes the page calls back to the Suitelet with
`action=getInvoices` / `getCreditMemos` / `getInvoiceGroups` (JSON), then
fires one `action=getPDF&id=<internalId>&type=<…>` request per PDF.

---

## The "Choose Save Location" dialog

When you start a bulk download, the tool opens a three-step modal —
**Save Location → Downloading → Complete**. Step 1 is where you pick
the destination folder and tune how the batch runs.

### Anatomy of the dialog

**Selected for Download** — read-only summary at the top.

- The first chip shows the count of PDFs queued (e.g. `16626 PDFs`).
- The second chip shows an estimated total size in KB (e.g.
  `Est. ~ 1413210 KB`). This is an estimate based on average invoice
  size, not the exact figure.

**Download Folder** — where the PDFs will land on your machine.

1. Click **Browse…** and pick a folder. The browser will ask for
   permission to write to that folder; grant it.
2. The selected path appears in the dropdown below the Browse button.
3. **Browser tip:** Chromium-based browsers block direct writes to
   top-level folders such as `Downloads`, `Desktop`, or `Documents`.
   If your pick is rejected, either select a **subfolder** of one of
   those locations, or create a fresh folder (e.g. `Invoices-2026-04`)
   and pick that.

The **Start Download** button stays disabled and the footer shows
*"Select a folder to continue"* until a valid folder is chosen.

**Download Settings** — controls how each file is named and how many
run in parallel.

| Setting                | What it does                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Filename Pattern**   | Token-based pattern for each saved file. Default `{TranID}.pdf` (e.g. `INV-10482.pdf`). Pick from the dropdown. |
| **Filename Prefix**    | Optional string prepended to every filename — handy for grouping by client (e.g. `Acme_INV-10482.pdf`).       |
| **Download At a Time** | Slider, range 1–10 (default 5). Number of `getPDF` requests in flight concurrently. Higher = faster but heavier on NetSuite governance and your network. |
| **Preview**            | Live sample of the resulting filename based on the pattern + prefix you picked.                               |

**Options** — toggles for batch behaviour.

- **Skip failed PDFs** *(on by default)* — if a single transaction errors
  out (permission, render failure, voided record, etc.) the run keeps
  going and the failure is reported at the end. Turn it off to stop the
  whole batch on the first error.
- **Create date subfolder** *(on by default)* — saves files into a
  `YYYY-MM-DD` subfolder of the chosen download folder, so repeated runs
  don't overwrite each other.

### Step-by-step

1. Run a search on the main page so the result set is what you actually
   want to download — the count shown in the modal is the count that
   will be downloaded.
2. Click the bulk-download action; the modal opens on **step 1 — Save
   Location**.
3. Click **Browse…** and pick (or create) a destination folder. If the
   browser rejects it, pick a subfolder instead.
4. Adjust the **Filename Pattern** and optional **Filename Prefix** until
   the *Preview* line matches what you want.
5. Drag the **Download At a Time** slider — start at 5, drop to 2–3 if
   you see governance errors or rate-limit messages, raise toward 10
   only on a fast connection with light NetSuite load.
6. Leave **Skip failed PDFs** on for unattended runs; turn it off if you
   want the run to halt the moment something fails so you can
   investigate.
7. Leave **Create date subfolder** on if you'll re-run the export — it
   keeps each run's output separated and avoids collisions.
8. Click **Start Download →**. The dialog advances to **step 2 —
   Downloading** with a live progress count, and finally **step 3 —
   Complete** with a summary of successes, failures, and the destination
   path. **Cancel** aborts at any time.

### Common pitfalls

- *"Select a folder to continue"* never goes away → your browser blocked
  the folder pick. Choose a subfolder instead of `Downloads` /
  `Documents` / `Desktop`.
- Files appear in the wrong folder → check whether **Create date
  subfolder** is enabled; PDFs land in `<chosen-folder>/YYYY-MM-DD/`.
- Slow / stalled batches → lower **Download At a Time**; each PDF is a
  separate Suitelet execution, and 10 in parallel can saturate slower
  links.
- Filename collisions → add a **Filename Prefix** or switch the pattern
  to one that includes the customer or date token.

---

## HTTP API reference

All actions hit the same Suitelet URL with an `action` query-string
parameter. Base URL pattern:

```
/app/site/hosting/scriptlet.nl?script=<scriptId>&deploy=<deploymentId>&action=<action>&…
```

| Action              | Method | Returns          | Notable params                                                                                          |
| ------------------- | ------ | ---------------- | ------------------------------------------------------------------------------------------------------- |
| *(none)* / `page`   | GET    | HTML page        | —                                                                                                       |
| `getInvoices`       | GET    | JSON             | `dateFrom`, `dateTo`, `customer`, `subsidiary`, `department`, `status`, `tranId`, `poNum`, `workAuth`   |
| `getCreditMemos`    | GET    | JSON             | Same filter set as `getInvoices`                                                                        |
| `getInvoiceGroups`  | GET    | JSON             | Same filter set, plus subsidiary filter via `N/search`                                                  |
| `getLookups`        | GET    | JSON             | Returns subsidiaries / customers / departments                                                          |
| `getPDF`            | GET    | `application/pdf` binary | `id` (internal ID, required), `tranid` (filename), `type` (`invoicegroups` for groups; otherwise transaction) |

Multi-value filters (`customer`, `subsidiary`, `department`, `status`)
accept comma-separated IDs.

---

## Governance notes

- `render.transaction` costs **10 units** per call. Each `getPDF`
  request is a separate Suitelet execution, so the 10,000-unit budget
  resets every PDF — bulk downloads are safe.
- Invoices and credit memos use SuiteQL with `ROWNUM`-based pagination
  and return all matches in one response.
- Invoice groups use `N/search.runPaged` (1000-row pages) — required
  because subsidiary filtering isn't available against the
  `invoicegroup` record in SuiteQL.

---

## Local development

`suitecloud.config.js` points the project root at `src/`. Common loops:

```bash
# Validate without deploying
suitecloud project:validate

# Deploy a single file (faster than full deploy)
suitecloud file:upload --paths "/SuiteScripts/Transaction PDF Download/SL/pdc_SL_main.js"

# Pull objects/files from the account into the project
suitecloud object:import --type customscript --scriptid customscript_pdf_download_tool
```

Logs are written via `N/log` at `DEBUG` level — open the deployment's
**Execution Log** in NetSuite to trace `PDC onRequest`,
`PDC invoices.serve`, `InvoiceGroup PDF`, etc.

---

## Troubleshooting

| Symptom                                              | Likely cause / fix                                                                                  |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Page loads but customer/subsidiary dropdowns empty   | Lookups fetch failed — check execution log for `lookups:*` errors; usually a permission issue.      |
| Invoice Group PDF returns an error                   | `custscript_pdc_invgrp_tpl_id` points at a missing/disabled template, or the template doesn't reference `record.*`. |
| `render.transaction` throws on a specific invoice    | Transaction is voided or the role lacks View access to it. Voided rows are already filtered out of the list. |
| Bulk download stalls                                 | Each PDF is a separate request; check the browser console for failed `action=getPDF` calls and the server execution log for the matching IDs. |
| Status filter returns nothing                        | Status codes are normalised via `pdc_mod_queryHelper`; pass the canonical code (e.g. `OpenA`, `PaidInFull`) rather than display labels. |

---

## License & ownership

Internal NetSuite customization — no public license declared. Treat the
deployment as account-specific and review audience / role settings
before exposing it externally.
