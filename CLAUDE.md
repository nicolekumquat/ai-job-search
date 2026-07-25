# Shared workspace instructions

Use `.github/copilot-instructions.md` as the shared job-search workflow and accuracy policy for this repository.

For the private local dashboard and Applied and Waiting posting refresh, follow `docs/Local-Job-Dashboard.md`. Use the deterministic local checker rather than an AI model. The first pass only proposes possible closures; never modify the tracker or move a packet until the user explicitly selects and confirms it. Never treat access failures, bot checks, rate limits, server errors, timeouts, or unexplained redirects as evidence that a posting closed.

Keep all personal job-search data under `.local-user/`; never copy it into tracked framework files.
