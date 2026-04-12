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

Create your private workspace:

```bash
mkdir .local-user
```

Then copy only the templates you need from the framework into `.local-user/` and fill those in there.

Recommended profile layer:
- Keep a master `About_You/Story-Bank.md` with 5-8 reusable STAR stories.
- Tailor copies of those stories inside each `J-*` folder when preparing for a specific role.

## Contribution rule

- Personal search execution: `.local-user/` only.
- Framework improvements: submit a GitHub Issue first, then optional PR.
