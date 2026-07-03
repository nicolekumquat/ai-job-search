# Workday Supplement: [Role Title] at [Company]
<!--
INSTRUCTIONS: Generate a privacy-safe supplement for re-entering resume details into a
structured application form (Workday and similar ATS). The goal is to normalize your
employment history, education, certifications, and skills for copy/paste into form fields
WITHOUT inventing anything.

Prompt: "Generate a Workday supplement using templates/Workday-Supplement.md for the role in
[path to JD]. Pull only from my profile in About_You/. Every field must trace to a source
file. Flag anything that is not in my profile as [Needs user confirmation] instead of
guessing. Do not change dates, titles, institutions, or credential names, and do not leak
anything marked PRIVATE in Search-Context.md."

Rules the assistant must follow:
- Source-grounded only. Every claim traces to a profile file; cite it in "Source evidence".
- Never alter dates, titles, employer names, institutions, or credential names.
- Missing data is flagged as [Needs user confirmation] — never filled by inference.
- No PRIVATE search context (from Search-Context.md) enters this document; it may be pasted
  into an external application form.
- Human review required. You are accountable for what you submit under your name — read every
  field before entering it.

Source of truth vs. copy surface:
- This Markdown file is the auditable source. Keep it in the job folder.
- If you want an easier copy/paste surface, generate a private .docx companion from this file
  and keep it in .local-user/ as well. The Markdown stays canonical; the .docx is a convenience
  copy only.

Save the generated supplement in the job folder as 45-Workday-Supplement.md
(under .local-user/_Active/J-XX-Company/). Never commit it.

The four sections below are stable — keep them in this order: Employment History, Education,
Certifications, Skills.
-->

*Generated on YYYY-MM-DD*

---

## Employment History

<!--
One block per role, most recent first. Copy each field into the matching Workday field.
Example (fictional — replace with your real, source-grounded entries):

### Blue Fern Analytics - Program Manager
- **Workday employer name:** Blue Fern Analytics
- **Title:** Program Manager
- **Location:** Remote
- **Start date:** March 2021
- **End date:** Present
- **Description:** Coordinated cross-functional delivery for analytics platform releases;
  maintained launch plans, dependency tracking, and stakeholder updates.
- **Source evidence:** Resume.md > Blue Fern Analytics
- **Review notes:** Confirm whether Workday requires city/state for remote roles.
-->

### [Employer] - [Title]

- **Workday employer name:** [Legal / display employer name]
- **Title:** [Exact historical title]
- **Location:** [City, State — or Remote]
- **Start date:** [Month YYYY]
- **End date:** [Month YYYY — or Present]
- **Description:** [1-2 sentences of what you owned. Source-grounded only.]
- **Source evidence:** [File > section this traces to]
- **Review notes:** [Anything to confirm before entry, or "None"]

### [Employer] - [Title]

- **Workday employer name:**
- **Title:**
- **Location:**
- **Start date:**
- **End date:**
- **Description:**
- **Source evidence:**
- **Review notes:**

---

## Education

### [School / Institution]

- **School / institution:** [Name — exactly as it appears on the credential]
- **Degree:** [Degree type]
- **Field of study:** [Field]
- **Start date:** [Month YYYY — or [Needs user confirmation] if not in profile]
- **End date:** [Month YYYY]
- **Additional details:** [Honors, etc. — only if sourced; otherwise "None sourced"]
- **Source evidence:** [File > section]
- **Review notes:** [e.g., "Start date not available in source material"]

---

## Certifications

<!-- Do not add a credential ID or URL unless the user explicitly provides one. -->

### [Certification Name]

- **Issuing organization:** [Organization]
- **Status:** [Active / Expired — only if known]
- **Issued:** [Month YYYY]
- **Expiration:** [Month YYYY — or [Needs user confirmation]]
- **Credential ID / URL:** [Only if the user provided one; otherwise leave blank]
- **Source evidence:** [File > section]
- **Review notes:** [e.g., "Do not add a credential ID unless provided"]

---

## Skills

<!--
Group skills the way Workday's skill picker expects. Only list skills your profile supports,
and say why each group is supported. Remove any entry not available in the Workday picker.
-->

### [Skill Group]

- **Skills to enter:** [Comma-separated skills]
- **Why these are supported:** [What in the profile backs this group]
- **Source evidence:** [File > section(s)]
- **Review notes:** [e.g., "Confirm exact Workday skill taxonomy before entry"]

### [Skill Group]

- **Skills to enter:**
- **Why these are supported:**
- **Source evidence:**
- **Review notes:**

---

## Gaps to Confirm

<!-- Collect every [Needs user confirmation] item here so nothing gets entered unverified. -->

- [ ] [Field that needs user confirmation before form entry]
- [ ] [Field that needs user confirmation before form entry]
