# Local job-search workflow

## Applied-posting refresh

When the user asks to refresh the private dashboard or **Applied and waiting** applications:

1. Check only explicitly labelled official job-posting URLs. If a packet has no `Official Job URL:` label, report it as skipped rather than guessing from another link.
2. Treat the first pass as a proposal only. Do not modify the tracker or move a packet until the user selects and confirms that specific proposed closure.
3. Propose a posting as closed only when the employer or ATS returns HTTP 404/410 or a closure notice is corroborated by its placement near the start of the posting or by the target job title no longer appearing.
4. Treat authentication walls, bot challenges, HTTP 401/403/429/5xx, timeouts, DNS failures, and unexplained redirects as inconclusive. Do not change application state for those results.
5. After explicit confirmation, update `.local-user/Job-Tracker.md` to `Closed - posting closed`; record `Official posting confirmed unavailable on YYYY-MM-DD; no rejection email received`; preserve Applied Date; set Interview Stage to `Closed`; and move the packet from `.local-user/_Active/` to `.local-user/_Archive/`.
6. Regenerate `.local-user/dashboard.html` with `node scripts/generate-job-dashboard.js`. Confirm the role appears in the **Rejected** tab as **Posting Closed**.

This is a personal workflow closure, not evidence that the employer explicitly rejected the candidate.
