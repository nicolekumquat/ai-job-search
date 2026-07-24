# Local User Workspace Template

This folder documents a recommended private workspace layout for real job-search execution.

Do not commit personal artifacts to the repository. Keep personal work in `.local-user/` (gitignored).

## Suggested private layout

```text
.local-user/
  About_You/
  _Active/
  _Potential/
  _Archive/
  Study-Topics/
  Job-Tracker.md
  dashboard-config.json
  tasks.md
```

## Quick setup

Create your private workspace and dashboard-compatible tracker:

PowerShell:

```powershell
New-Item -ItemType Directory -Force .local-user, .local-user/_Active, .local-user/_Potential, .local-user/_Archive
Copy-Item local-user-template/Job-Tracker.md .local-user/Job-Tracker.md
Copy-Item local-user-template/dashboard-config.json .local-user/dashboard-config.json
```

macOS/Linux:

```bash
mkdir -p .local-user/{_Active,_Potential,_Archive}
cp local-user-template/Job-Tracker.md .local-user/Job-Tracker.md
cp local-user-template/dashboard-config.json .local-user/dashboard-config.json
```

Then copy only the templates you need from the framework into `.local-user/` and fill those in there.

Start the local dashboard with `node scripts/run-job-dashboard.js`, then open `http://127.0.0.1:4173/`.

See [`docs/Local-Job-Dashboard.md`](../docs/Local-Job-Dashboard.md) for tracker fields, posting-refresh safeguards, and optional career-portal links.

Recommended profile layer:
- Keep a master `About_You/Story-Bank.md` with 5-8 reusable STAR stories.
- Tailor copies of those stories inside each `J-*` folder when preparing for a specific role.

## Contribution rule

- Personal search execution: `.local-user/` only.
- Framework improvements: submit a GitHub Issue first, then optional PR.
