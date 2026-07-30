# DOCX Pagination Safeguards

Generated Word documents can reflow differently across machines and renderers. A heading may be left at the bottom of one page while its content moves to the next, or a multi-line bullet may split across pages.

The optional `scripts/docx_pagination.py` utility applies conservative Word pagination metadata without reading document text or adding a third-party Python dependency.

## Default behavior

- Heading, title, and subtitle styles stay with the following paragraph.
- Numbered and list-style paragraphs stay together on one page.
- Widow/orphan control is enabled for all document-body paragraphs.
- Existing page breaks and all unrelated DOCX parts are preserved.

The utility does not keep entire sections together. Doing so can create large blank areas when a section cannot fit in the remaining page space.

## Usage

```powershell
python scripts/docx_pagination.py `
  --input ".local-user/path/to/resume.docx" `
  --output ".local-user/path/to/resume-ready.docx"
```

For generated documents that do not use semantic Word styles, pass zero-based paragraph indexes or ranges:

```powershell
python scripts/docx_pagination.py `
  --input ".local-user/path/to/resume.docx" `
  --output ".local-user/path/to/resume-ready.docx" `
  --keep-with-next "0,2-4,11,17-18" `
  --keep-together "all"
```

Use `--no-style-detection` when explicit selectors should be the only rules. Use `--no-widow-control` only when the source document deliberately manages that property itself.

## Review boundary

Pagination metadata reduces common reflow problems but does not replace visual review. Open the final DOCX in the intended renderer before submission. If you convert it to PDF, review the PDF as well because conversion preserves any remaining awkward page break.

Keep real resumes and generated output under `.local-user/`; never commit personal application artifacts.
