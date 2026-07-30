# Scripts

## LinkedIn Scraping Pipeline

Three scripts that work in sequence to discover, scrape, and scaffold job opportunities.

### Prerequisites
```bash
npm install playwright
npx playwright install chromium
```

### Step 1: Search (`linkedin-search.js`)
Edit the `searches` array with your LinkedIn Jobs search URLs, then run:
```bash
node linkedin-search.js
```
A browser opens, you log in manually, and the script runs your searches and extracts results to `linkedin-search-results.json`.

### Step 2: Scrape JDs (`linkedin-scrape-jds.js`)
Review `linkedin-search-results.json`, pick the interesting jobs, add them to the `jobs` array in the script, then run:
```bash
node linkedin-scrape-jds.js
```
Visits each job URL and extracts the full description. Saves to `linkedin-jd-results.json`.

### Step 3: Register Jobs (`create-job-folders.js`)
```bash
node create-job-folders.js
```
Registers each scraped job in `.local-user/_Active/`. For every job, the script
allocates a J-ID, creates `01-Job-Description.md`, and adds the matching
`Job-Tracker.md` row as one operation. Re-running the same input safely skips
jobs whose official URL is already registered.

## Notes
- Scripts use Playwright with Edge and persistent context for authentication
- LinkedIn requires manual login (no credential automation)
- LinkedIn's DOM changes periodically - selectors may need updating
- Scraping results are gitignored (regenerable data)

## Job Registration

Use `register-job.js` whenever you create one job packet manually:

```bash
node scripts/register-job.js \
  --company "Example Corp" \
  --role "Senior Product Manager" \
  --url "https://careers.example.com/jobs/123" \
  --bucket potential
```

Add `--description-file path/to/job-description.md` to initialize the packet
with a saved description, or `--dry-run` to validate and preview without
writing. Use `--bucket active --status Applied --applied-date YYYY-MM-DD` when
the application has already been submitted.

This is the only supported new-packet creation path. It automatically:

1. checks the tracker and all packet folders for J-ID drift;
2. rejects a duplicate official job URL, ignoring common tracking parameters;
3. allocates the next safe J-ID;
4. creates the packet and tracker row; and
5. rolls both changes back if registration or verification fails.

No hook installation or AI agent is required. The registrar uses Node.js and
runs the checks as part of the operation itself.

## Job ID Allocation & Drift Check

`next-job-id.js` prevents duplicate `J-XX` IDs. IDs used to be allocated by
reading `Job-Tracker.md` and taking max+1, but folders and tracker rows are
created in separate steps, so a session (human or AI agent) that creates packet
folders without registering tracker rows leaves the tracker stale, and the next
session re-issues the same IDs. This script scans **both** the tracker and the
packet folders (`_Active/`, `_Potential/`, `_Archive/`) whenever it is run.
Manual folder creation can still introduce drift, which is why new packets
must go through `register-job.js`.

```bash
node scripts/next-job-id.js           # print the next safe J-ID + drift warnings
node scripts/next-job-id.js --check   # CI-style check; exit 1 on drift
node scripts/next-job-id.js --json    # machine-readable output
node scripts/next-job-id.test.js      # run allocator and drift regression tests
```

Drift rules: a **folder without a tracker row is an error** (that's the
collision hazard; add the row); a tracker row without a folder is only a
warning (legitimate when a role was tracked without a packet or the packet was
deliberately removed). Duplicate folder IDs across buckets are also errors.
`--check` also fails when `Job-Tracker.md` is missing because tracker/folder
consistency cannot be verified.

Use this command directly for diagnostics and repairs. You do not need to run
it before `register-job.js`; the registrar runs it automatically and stops
before writing if drift exists.

### Registration tests

```bash
node scripts/register-job.test.js
node scripts/create-job-folders.test.js
```

## DOCX Pagination Safeguards

`docx_pagination.py` is an optional, standard-library utility for improving
pagination in generated Word documents. It keeps headings with following
content, keeps individual list paragraphs intact, and enables widow/orphan
control without changing document text or removing intentional page breaks.

See [DOCX Pagination Safeguards](../docs/DOCX-Pagination.md) for usage and
review guidance.
