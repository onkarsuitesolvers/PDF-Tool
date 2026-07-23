# Print & Download Center (File Cabinet Download Tool)

A NetSuite SuiteScript 2.1 Suitelet that gives users a single, filterable
page for searching a **File Cabinet folder** and **bulk-downloading files**
without opening the File Cabinet UI or clicking through each file one at a
time.

The page is rendered server-side as a NetSuite form with embedded HTML/CSS/JS
and talks back to the same Suitelet via JSON actions to fetch the file list
and stream files.

---

## What you can do with it

- **Search File Cabinet files** by one or more folders, file type, and
  date-created range.
- **Preview a single file** in the browser, or **bulk-download** every
  matching file.
- **Use a folder lookup** that ships pre-loaded with the page (no extra
  round-trip on first load).

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
                ├── pdc_mod_files.js          getFiles (N/search, by folder)
                ├── pdc_mod_fileDownloader.js getFile (stream one File Cabinet file)
                ├── pdc_mod_lookups.js        getLookups + fetchFolders
                ├── pdc_mod_queryHelper.js    Shared response helpers
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

## Using the tool

1. Open the deployment URL — easiest route is **Customization →
   Scripting → Script Deployments**, find *PDF Download Tool*, and click
   the link, or use the External URL if "Available Without Login" is on.
2. Pick one or more **Folders** to search.
3. Optionally narrow by **File Type** and **Date Created** range.
4. Hit **Search Files**. Results render in the table along with totals.
5. From the result list:
   - Click a row to **preview** the file inline.
   - Use the bulk action to **download every matching file**.

Behind the scenes the page calls back to the Suitelet with
`action=getFiles` (JSON), then fires one `action=getFile&id=<internalId>`
request per file.

---

## The "Choose Save Location" dialog

When you start a bulk download, the tool opens a three-step modal —
**Save Location → Downloading → Complete**. Step 1 is where you pick
the destination folder and tune how the batch runs.

### Anatomy of the dialog

**Selected for Download** — read-only summary at the top.

- The first chip shows the count of files queued (e.g. `226 Files`).
- The second chip shows an estimated total size in KB. This is an
  estimate based on an average file size, not the exact figure.

**Download Folder** — where the files will land on your machine.

1. Click **Browse…** and pick a folder. The browser will ask for
   permission to write to that folder; grant it.
2. The selected path appears below the Browse button.
3. **Browser tip:** Chromium-based browsers block direct writes to
   top-level folders such as `Downloads`, `Desktop`, or `Documents`.
   If your pick is rejected, either select a **subfolder** of one of
   those locations, or create a fresh folder and pick that.

The **Start Download** button stays disabled and the footer shows
*"Select a folder to continue"* until a valid folder is chosen.

**Download Settings** — controls how each file is named and how many
run in parallel.

| Setting                | What it does                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Filename Prefix**    | Optional string prepended to every saved filename — handy for grouping by client (e.g. `Acme_invoice.pdf`).   |
| **Download At a Time** | Slider, range 1–10 (default 5). Number of `getFile` requests in flight concurrently. Higher = faster but heavier on NetSuite governance and your network. |

**Options** — toggles for batch behaviour.

- **Skip failed files** *(on by default)* — if a single file errors out
  (permission, missing file, etc.) the run keeps going and the failure
  is reported at the end. Turn it off to stop the whole batch on the
  first error.
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
4. Add an optional **Filename Prefix**.
5. Drag the **Download At a Time** slider — start at 5, drop to 2–3 if
   you see governance errors or rate-limit messages, raise toward 10
   only on a fast connection with light NetSuite load.
6. Leave **Skip failed files** on for unattended runs; turn it off if you
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
  subfolder** is enabled; files land in `<chosen-folder>/YYYY-MM-DD/`.
- Slow / stalled batches → lower **Download At a Time**; each file is a
  separate Suitelet execution, and 10 in parallel can saturate slower
  links.
- Filename collisions → add a **Filename Prefix**.

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
| `getLookups`        | GET    | JSON             | Returns folders                                                                                          |
| `getFiles`          | GET    | JSON             | `folder` (required, comma-separated IDs), `fileType`, `createdFrom`, `createdTo`, `rowBegin`, `rowEnd`  |
| `getFile`           | GET    | binary           | `id` (internal ID, required)                                                                             |

`folder` accepts comma-separated internal IDs.

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
`PDC files.serve`, `PDC fileDownloader.serve`, etc.

---

## Troubleshooting

| Symptom                                              | Likely cause / fix                                                                                  |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Page loads but folder dropdown is empty              | The folder lookup fetch failed — check execution log for `lookups:folders` errors; usually a permission issue. |
| Search returns nothing                                | Confirm at least one folder is selected — the server requires it and returns an empty list otherwise. |
| Bulk download stalls                                  | Each file is a separate request; check the browser console for failed `action=getFile` calls and the server execution log for the matching IDs. |

---

## License & ownership

Internal NetSuite customization — no public license declared. Treat the
deployment as account-specific and review audience / role settings
before exposing it externally.
