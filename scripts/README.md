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

### Step 3: Create Folders (`create-job-folders.js`)
```bash
node create-job-folders.js
```
Creates `J-XX-CompanyName/01-Job-Description.md` for each scraped job. Then triage into `_Active/`, `_Potential/`, or `_Archive/`.

## Notes
- Scripts use Playwright with Edge and persistent context for authentication
- LinkedIn requires manual login (no credential automation)
- LinkedIn's DOM changes periodically - selectors may need updating
- Scraping results are gitignored (regenerable data)

## Local Private Job Dashboard

Initialize `.local-user/` from [`local-user-template`](../local-user-template/), install Playwright, and start the local-only dashboard:

```bash
npm install
npx playwright install chromium
npm run dashboard
```

Open `http://127.0.0.1:4173/`. The Markdown tracker remains the source of truth; `.local-user/dashboard.html` is private generated output.

In **Applied and waiting**, **Refresh posting status** checks official employer or ATS URLs locally without calling an AI model. A posting is closed only for HTTP 404/410 or explicit closed, filled, removed, expired, or no-longer-accepting language. Authentication walls, bot challenges, HTTP 401/403/429/5xx, timeouts, DNS failures, and unexplained redirects remain inconclusive and do not change application state.

Preview the check without changing files:

```bash
npm run refresh:postings:dry-run
```

For setup, tracker fields, career-portal configuration, and the full safety policy, see [Local Job Dashboard](../docs/Local-Job-Dashboard.md).

## Job ID Allocation & Drift Check

`next-job-id.js` prevents duplicate `J-XX` IDs. IDs used to be allocated by
reading `Job-Tracker.md` and taking max+1 — but folders and tracker rows are
created in separate steps, so a session (human or AI agent) that creates packet
folders without registering tracker rows leaves the tracker stale, and the next
session re-issues the same IDs. This script scans **both** the tracker and the
packet folders (`_Active/`, `_Potential/`, `_Archive/`), so an unregistered
folder can never cause a collision.

```bash
node scripts/next-job-id.js           # print the next safe J-ID + drift warnings
node scripts/next-job-id.js --check   # CI-style check; exit 1 on drift
node scripts/next-job-id.js --json    # machine-readable output
```

Drift rules: a **folder without a tracker row is an error** (that's the
collision hazard — add the row); a tracker row without a folder is only a
warning (legitimate when a role was tracked without a packet or the packet was
deliberately removed). Duplicate folder IDs across buckets are also errors.

Always run this before assigning a new J-ID, and treat a packet as incomplete
until its `Job-Tracker.md` row exists.

## DOCX Pagination Safeguards

`docx_pagination.py` is an optional, standard-library utility for improving
pagination in generated Word documents. It keeps headings with following
content, keeps individual list paragraphs intact, and enables widow/orphan
control without changing document text or removing intentional page breaks.

See [DOCX Pagination Safeguards](../docs/DOCX-Pagination.md) for usage and
review guidance.
