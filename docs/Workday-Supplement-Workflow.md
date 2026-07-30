# Workday Supplement Workflow

Use this workflow when an applicant tracking system asks for structured profile fields that repeat information from a resume or profile. The goal is to make form entry easier without inventing details or exposing private context.

Generated Workday supplements are personal application artifacts. Save completed versions only inside a private job folder such as `.local-user/_Active/J-XX-Company/45-Workday-Supplement.md`.

Use the Markdown file as the auditable source of truth. Generate a companion `.docx` when users want an easier copy/paste surface for Workday fields, especially if they are less comfortable copying from Markdown.

## When To Use It

Use `templates/Workday-Supplement.md` after you have a serious opportunity and need to prepare structured ATS entries for:
- employment history
- education
- certifications
- skills

Do not use it to create a public resume, rewrite your profile, or add unsupported accomplishments. It is a normalization aid for fields the user will review and enter manually.

Recommended private artifacts:
- `45-Workday-Supplement.md` - source of truth with source evidence
- `45-Workday-Supplement.docx` - user-friendly copy/paste companion generated from the Markdown

## Source Material

Ground the supplement in user-owned source files:
- `.local-user/About_You/Resume.md`
- `.local-user/About_You/Strengths.md`
- `.local-user/About_You/Story-Bank.md`
- `.local-user/About_You/Logistics.md`
- the target job description in the private job folder
- direct user confirmation for any missing dates, credential names, schools, or locations

If a detail is not present in source material, mark it as `[Needs user confirmation]`. Do not infer it.

## Four-Section Workflow

### 1. Employment History

Normalize each role into Workday-friendly fields: employer, title, location, dates, and concise responsibility or impact bullets. Keep titles and dates faithful to source material. If the resume uses grouped consulting or contract work, preserve that structure unless the user confirms a different entry pattern.

### 2. Education

Prepare the smallest truthful education entry set that the ATS allows. If Workday's taxonomy does not match the exact degree, school, or field, choose the closest truthful option only with user review, and document the mismatch in the private supplement.

### 3. Certifications

List only active or accurately described credentials that appear in source material or are confirmed by the user. Do not invent certificate IDs, issuing dates, expiration dates, or issuing bodies.

### 4. Skills

List only skills supported by the user's profile or job materials. Prioritize terms that match the job description, but never add a skill just because it appears in the posting.

Present the skills as a single alphabetical (A-Z) bulleted list, one skill per line — not grouped into categories and not ranked by priority.

Keep to 20 total skills or fewer. Exceed 20 only when an additional skill is critical to a job application requirement, and call out each over-limit skill with the requirement it supports.

## Accuracy Guardrails

- Every factual claim must trace back to a source file or direct user confirmation.
- Preserve exact names, dates, titles, credential names, and institutions unless the user explicitly confirms a correction.
- Do not expose anything marked private in `.local-user/About_You/Search-Context.md`.
- Do not include sensitive application strategy, compensation context, layoff context, or interview positioning in ATS fields.
- Flag gaps instead of filling them with invention.
- Human review is required before anything is entered into Workday or another ATS.
- If a `.docx` companion is generated, it must preserve the same facts as the Markdown source and stay in the private job folder.

## Fictional Mini Example

This example is fictional and only shows the expected level of detail.

```markdown
## Certifications

### Certified Project Lead
- **Issuing organization:** Fictional Project Institute
- **Status:** Active
- **Issued:** [Needs user confirmation]
- **Expiration:** [Needs user confirmation]
- **Source evidence:** Resume.md > Certifications
```

## Suggested Prompt

```text
Read the job description and my private profile files. Create a Workday supplement using templates/Workday-Supplement.md.

Rules:
- Keep the output in the four sections from the template.
- Use only facts grounded in my source files or direct confirmation.
- Mark missing fields as [Needs user confirmation].
- Do not include private search context or sensitive application strategy.
- Add source evidence for each entry so I can review it before entering anything into Workday.
- After I review the Markdown, generate a .docx companion for easier copy/paste into Workday fields.
```
