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
  tasks.md
```

## Quick setup

Create your private workspace, packet directories, and blank tracker:

```bash
mkdir .local-user
mkdir .local-user/_Active .local-user/_Potential .local-user/_Archive
cp local-user-template/Job-Tracker.md .local-user/Job-Tracker.md
```

Then copy only the templates you need from the framework into `.local-user/` and fill those in there.

Register every new opportunity with `scripts/register-job.js`. Do not manually
assign a J-ID or create a new packet folder; the registrar creates the folder
and tracker row together.

Recommended profile layer:
- Keep a master `About_You/Story-Bank.md` with 5-8 reusable STAR stories.
- Tailor copies of those stories inside each `J-*` folder when preparing for a specific role.

## Contribution rule

- Personal search execution: `.local-user/` only.
- Framework improvements: submit a GitHub Issue first, then optional PR.
