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

## Daily Reminder Email (Optional)

`job-reminder.ps1` sends a simple overnight reminder email from:
- `.local-user/tasks.md` (open checkbox tasks)
- `.local-user/Job-Tracker.md` (stale pipeline detection)

### Dry run (preview only)
```powershell
powershell -ExecutionPolicy Bypass -File scripts/job-reminder.ps1 -DryRun
```

### Send email
```powershell
powershell -ExecutionPolicy Bypass -File scripts/job-reminder.ps1 -To "you@example.com"
```

### What it includes
- `OVERDUE`, `TODAY`, `TOMORROW`, `UPCOMING`, `ACTION`, and `STALE` status rows
- Study items section (if tasks under `## Study` exist)
- Timestamped footer showing source files

### Suggested scheduler setup (Windows)
- Run daily early morning (for example 6:30 AM)
- Command:
	- `powershell`
- Arguments:
	- `-ExecutionPolicy Bypass -File "<repo>\scripts\job-reminder.ps1" -To "you@example.com"`

Quick setup helper from repo root:
```powershell
powershell -ExecutionPolicy Bypass -File .\setup-reminder-task.ps1 -To "you@example.com"
```
