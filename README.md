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
