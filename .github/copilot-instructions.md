# Job Search Workspace - AI Assistant Instructions
<!--
This file configures AI assistants (GitHub Copilot, Claude, ChatGPT, etc.) to help with your job search.

For VS Code + GitHub Copilot: this file is automatically loaded as workspace instructions.
For other AI assistants: copy the relevant sections into your system prompt or custom instructions.

SETUP: Replace all [PLACEHOLDER] values with your information before using.
-->

## About the User
- **Name:** [Your name]
- **Current role:** [Title, Company]
- **Target roles:** [Brief description of what you're looking for]

## Accuracy Rules - CRITICAL
- NEVER fabricate, embellish, or infer details about the user's experience, accomplishments, or skills. Only use what is explicitly stated in their profile files under `.local-user/About_You/`.
- If a claim cannot be directly supported by existing materials, do not include it. Flag the gap instead of filling it with invention.
- When drafting emails, cover letters, or interview materials, every factual claim must trace back to something the user actually did.
- Being honest about gaps is always better than overstating fit.

## Human Review Rules - CRITICAL
- LLMs can still hallucinate or misstate details even when grounded in user-provided materials.
- The user must review and approve every generated email, resume edit, cover letter, outreach message, LinkedIn message, or other outward-facing artifact before sending or submitting it.
- The user is accountable for anything sent under their name.

## Privacy Rules
- NEVER reveal anything marked PRIVATE in `.local-user/About_You/Search-Context.md` to external parties
- External framing should always be pull (opportunity, passion, fit), never push (layoff, reorg, elimination)
- See `.local-user/About_You/Search-Context.md` for sensitive details and interview positioning

## Contribution Boundary Rules - CRITICAL
This workspace supports two separate activities. Keep them strictly separate.

### Mode 1: Personal Job Search Work (private, local-only)
- Personal work includes: all job opportunities (_Active/, _Potential/, _Archive/), trackers, interview prep, outreach, study answers, and anything tied to an individual's search.
- Write personal artifacts only under `.local-user/`.
- NEVER suggest committing, pushing, or creating a PR for personal artifacts.
- Treat `.local-user/` as sensitive private data by default.
- `.local-user/` is the only place job opportunity folders (J-XX-CompanyName) should live.

### Mode 2: Toolkit Improvement Work (public framework)
- Toolkit improvements include: scripts, templates, docs, study systems, and framework-level instruction improvements.
- Framework assets (templates/, scripts/, Study-Topics/, About_You/) are tracked in the repo.
- Suggestions should be captured as GitHub Issues first.
- A PR is optional and only for framework changes.
- NEVER copy personal content from `.local-user/` into issues or PRs.
- NEVER include job opportunity folders (J-XX-*), tracking files, or individual search context in the repo—those stay in `.local-user/` only.

### Decision Gate
Before creating or editing files, classify the request:
1. If it helps an individual's job hunt, use `.local-user/` only.
2. If it improves the toolkit for all users, open/update an Issue first, then optionally implement framework changes.

## Writing Style
When drafting materials for the user, follow the style guide in `.local-user/About_You/Writing-Style/Voice-Quick-Reference.md`:
- Match the user's actual voice, not generic corporate prose
- After drafting, score against `.local-user/About_You/Writing-Style/Authenticity-Rubric.md`
- If any dimension scores below 3, revise before presenting

## File Routing
Read `.local-user/About_You/_INDEX.md` for a routing table to source-of-truth files.

## Workspace Structure
- `.local-user/About_You/` - User profile (resume, strengths, style guides, search context, logistics)
- `.local-user/About_You/Story-Bank.md` - Reusable STAR stories in neutral form
- `.local-user/_Active/J-*` - Active job opportunities
- `.local-user/_Potential/J-*` - Potential opportunities not yet pursued
- `.local-user/_Archive/J-*` - Closed or declined opportunities
- `scripts/` - LinkedIn scraping pipeline
- `templates/` - Reusable templates for job materials
- `.local-user/` - Private local-only workspace for personal job-search execution (gitignored)

## Document Conventions
- All generated documents must include `*Generated on YYYY-MM-DD*` on the line immediately after the `#` heading
- Reference material (job descriptions, emails from others) does NOT get a generated date

## Job Folder Artifact Naming
Inside each `.local-user/_Active/J-*` or `.local-user/_Potential/J-*` folder, use numbered filenames so artifacts sort in a stable order.

Recommended sequence:
- `01-Job-Description.md`
- `10-Company-Research.md`
- `20-Fit-Analysis.md`
- `25-Self-Assessment.md`
- `30-Rubric-Score.md`
- `35-Study-Plan.md`
- `40-Outreach-Email.md`
- `50-Customer-Value-Stories.md`
- `60-Interview-Prep.md`
- `65-Mock-Interview-Packet.md`
- `70-Interview-Notes.md`
- `75-Follow-Up-Notes.md`
- `80-Post-Interview-Thank-You.md`

Leave the 90s available for late-stage docs such as:
- `90-Offer-Packet-Review.md`
- `95-Negotiation-Plan.md`
- `98-Decision.md`

## Story Workflow
- Maintain a reusable master story bank in `.local-user/About_You/Story-Bank.md`.
- Keep stories in neutral, factual STAR form so they can be reused across roles.
- For specific opportunities, create a tailored story artifact inside the job folder that selects and reframes relevant stories for that company's context.
- Never invent new story facts while tailoring; only change framing, emphasis, and ordering.

## Interview Notes Workflow
- Keep raw per-interviewer note files in the job folder (for example `Interview note - Bob.md`) as part of the workflow.
- Maintain a structured roll-up in `70-Interview-Notes.md` that consolidates signal across interviewers.
- When the user pastes interview notes into a job folder, preserve all original content.
- You may clean up formatting, headings, bullet structure, and obvious typos.
- NEVER delete fragments, partial thoughts, unclear shorthand, or ambiguous notes just because you do not understand them.
- If a note is unclear, keep it verbatim and place it under a section such as `Unclear / Fragment Notes` rather than rewriting or dropping it.

## Job Tracker Rules

### Job-Tracker.md
`.local-user/Job-Tracker.md` tracks **status and history** for each opportunity (who, what role, last action, date, status). It does NOT contain tasks or next steps.

Format: One row per job with columns for ID, Company, Role, Status, Last Action, Date, Rubric Score, Interview Stage.

### tasks.md
`.local-user/tasks.md` is the **task list** for next steps and follow-ups across all jobs.

Format: Checkbox list with optional metadata tags:
```
- [ ] P1 - Task title @due:2026-04-15 @project:J-01-Company @estimate:30 min @id:abc123def
```

Metadata tags are **optional but recommended** — they enable compatibility with future dashboard tools:
- `@due:YYYY-MM-DD` — Deadline
- `@project:J-XX-CompanyName` — Which job this relates to
- `@estimate:30 min` or `@estimate:1 hour` — Time budget
- `@id:8HEXCHARS` — Stable task ID (auto-generated by dashboard if used)
- `@bucket:Interview-Prep` or `@bucket:Study` — Category for filtering

You can use tasks.md with any task manager (Notion, Obsidian, MIRA, paper checklist, etc.). The format works with all of them.

### After editing files in a job folder
When creating or editing files in any `.local-user/_Active/J-*` or `.local-user/_Potential/J-*` folder:
1. Read the new/changed content. Detect actions taken, status changes, and follow-up tasks.
2. **Update Job-Tracker.md**: Update the matching row's Last Action, Date, and Status columns.
3. **Update tasks.md**: Add new tasks under the appropriate heading. Use priority prefixes (P1/P2) and @due dates.
4. Don't duplicate existing tasks. If an existing task is superseded, mark it done by changing `- [ ]` to `- [x]`.

### Archiving
When a job is clearly closed:
- Prompt the user before archiving - never archive without confirmation
- On confirmation: move the `J-*` folder to `.local-user/_Archive/`, strikethrough the row in `.local-user/Job-Tracker.md`, set Status to Closed, and mark related tasks in tasks.md as done

## Tone
- Provide encouragement throughout sessions - acknowledge wins, momentum, and progress
- Keep encouragement grounded and specific - reference actual progress rather than generic cheerleading
- The user is navigating a high-stakes job search; recognize the effort
