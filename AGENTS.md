# Local job-search workflow

## Applied-posting refresh

When the user asks to refresh the private dashboard or **Applied and waiting** applications:

1. Check every saved official job-posting URL.
2. Mark a posting closed only when the employer or ATS returns HTTP 404/410 or explicitly says the job is closed, filled, removed, expired, or no longer accepting applications.
3. Treat authentication walls, bot challenges, HTTP 401/403/429/5xx, timeouts, DNS failures, and unexplained redirects as inconclusive. Do not change application state for those results.
4. For a confirmed closure, update `.local-user/Job-Tracker.md` to `Closed - posting closed`; record `Official posting confirmed unavailable on YYYY-MM-DD; no rejection email received`; preserve Applied Date; set Interview Stage to `Closed`; and move the packet from `.local-user/_Active/` to `.local-user/_Archive/`.
5. Regenerate `.local-user/dashboard.html` with `node scripts/generate-job-dashboard.js`. Confirm the role appears in the **Rejected** tab as **Posting Closed**.

This is a personal workflow closure, not evidence that the employer explicitly rejected the candidate.
