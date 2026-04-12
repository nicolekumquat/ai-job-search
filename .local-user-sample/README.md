# .local-user-sample

This folder is a **realistic reference example** of how to structure your private `.local-user/` workspace during a job search.

**How to use this:**
1. Clone the repo
2. Create your own `.local-user/` folder at the repo root (copy this structure, don't use these files directly)
3. Fill in your personal content (following the patterns shown here)
4. Never commit `.local-user/` to git (already in .gitignore)

---

## What's in This Sample

### Realistic Job Search Scenario

This example traces **one job opportunity (TechCorp) through the full 70-Interview-Notes stage**:
- How to research a company and form hypotheses
- Fit analysis with honest gaps acknowledged
- Interview notes that show what went well + where to improve for Round 2
- Task management (checkbox format, multi-job capable)

**Important:** This is a realistic but *fictional* example. Names, companies, interview details are anonymized for illustration.

---

## Key Files in This Sample

**Job Opportunity (J-01-TechCorp):**
- `_Active/J-01-TechCorp/01-Job-Description.md` — Raw JD
- `_Active/J-01-TechCorp/10-Company-Research.md` — Hypotheses about why role exists + customer pressures
- `_Active/J-01-TechCorp/20-Fit-Analysis.md` — Your strengths/gaps + positioning strategy
- `_Active/J-01-TechCorp/70-Interview-Notes.md` — Consolidated feedback from 3 interviewers (Marcus, Jenny, Anil)

**Portfolio Management:**
- `_Active/J-01-TechCorp/00-Job-Tracker-Reference.md` — Example of Job-Tracker row format (tracks 3 jobs)
- `tasks-SAMPLE.md` — Example checkbox task list with realistic priorities and @due dates

**Voice Calibration (filled sample, not placeholders):**
- `About_You/Writing-Style/Voice-Quick-Reference.md` — Completed voice profile for Royana
- `About_You/Writing-Style/Authenticity-Rubric.md` — Completed 6-dimension scoring rubric

**Study Outputs (with pass artifacts):**
- `Study-Topics/Completed/Quizzes/Model-Scoring_Quiz_v01_GRADES.md` — Grading summary (82%, pass)
- `Study-Topics/Completed/Certificates/Model-Scoring-Certificate.md` — Certificate generated after passing gate
- `Study-Topics/Completed/Certificates/Model-Scoring_Quiz_v01_certificate_20260412_1400.html` — Styled HTML certificate (fancy output example)

**Reference:**
- This `README.md` — How to adapt this structure for your own search

### Files You'll See

**Job folder artifacts (01-80 naming scheme):**
- `01-Job-Description.md` — The actual JD pasted in
- `10-Company-Research.md` — Your working hypotheses about why the role exists
- `20-Fit-Analysis.md` — Your honest assessment of fit + gaps + positioning strategy
- `70-Interview-Notes.md` — Consolidated feedback from all interviewers with key signals

**Portfolio management:**
- `_Active/J-01-TechCorp/00-Job-Tracker-Reference.md` — Example of how to track multiple opportunities
- `tasks-SAMPLE.md` — Example checkbox task list with realistic priorities

**Additional resources:**
- `README.md` (this file) — Explains the structure and how to adapt it

---

## Folder Structure (Your Workspace)

```
.local-user/                       ← Your private workspace (git-ignored)
├── About_You/
│   ├── Story-Bank.md             ← Your master STAR stories (reusable across jobs)
│   ├── Resume.md                 ← Your resume (personal copy)
│   ├── Strengths.md              ← Your proven strengths with evidence
│   ├── Ideal-Role-Profile.md     ← What roles fit you + what to avoid
│   ├── Search-Context.md         ← PRIVATE: Your real situation + positioning
│   ├── Logistics.md              ← Location, level, comp, dealbreakers
│   └── Writing-Style/
│       ├── Voice-Quick-Reference.md
│       └── Authenticity-Rubric.md
│
├── _Active/
│   ├── J-01-CompanyName/         ← Your first active opportunity
│   │   ├── 01-Job-Description.md
│   │   ├── 10-Company-Research.md
│   │   ├── 20-Fit-Analysis.md
│   │   ├── 25-Self-Assessment.md
│   │   ├── 30-Rubric-Score.md
│   │   ├── 35-Study-Plan.md
│   │   ├── 40-Outreach-Email.md
│   │   ├── 50-Customer-Value-Stories.md  ← Tailored from Story-Bank.md
│   │   ├── 60-Interview-Prep.md
│   │   ├── 65-Mock-Interview-Packet.md
│   │   ├── 70-Interview-Notes.md         ← Consolidated roll-up
│   │   ├── Interview note - [Name].md    ← Raw per-interviewer (keep ALL of these)
│   │   ├── 75-Follow-Up-Notes.md
│   │   └── 80-Post-Interview-Thank-You.md
│   │
│   ├── J-02-AnotherCompany/      ← Your second active opportunity
│   │   ├── 01-Job-Description.md
│   │   └── [continues as above...]
│   │
│   └── J-03-ThirdCompany/        ← Your third active (max recommended: 3)
│       └── [continues...]
│
├── _Potential/
│   └── J-04-CompanyToRevisit/    ← Jobs you might pursue later
│       ├── 01-Job-Description.md
│       └── [early-stage artifacts]
│
├── _Archive/
│   └── J-00-ClosedCompany/       ← Closed/declined opportunities
│       ├── 01-Job-Description.md
│       └── 98-Decision.md
│
├── Study-Topics/
│   ├── Data/
│   │   └── [Your study notes on domain gaps]
│   ├── Completed/
│   │   ├── Quizzes/
│   │   │   └── [Graded quizzes]
│   │   └── Exercises/
│   │       └── [Completed drills]
│   └── Gap-Log.md
│
├── Job-Tracker.md                ← Portfolio view (status + history for ALL jobs)
├── tasks.md                      ← Task list (checkbox format, multi-job)
└── [Your daily notes, reflection, etc.]
```

## Key Rules

1. **Never commit `.local-user/` to git.** It's in `.gitignore` by design.

2. **Job opportunity folders are private only.** J-XX-CompanyName goes in `.local-user/_Active/`, `.local-user/_Potential/`, or `.local-user/_Archive/`.

3. **Personal profile copies are local only.** While templates exist in `About_You/` (repo-tracked), your real Resume.md, Search-Context.md, and Story-Bank.md live in `.local-user/About_You/`.

4. **Job-Tracker.md and tasks.md are personal.** Keep these in `.local-user/` where they're gitignored.

5. **Study outputs are personal.** Quiz answers, exercise grades, and Gap-Log updates go in `.local-user/Study-Topics/Completed/`.

6. **Keep raw interview notes.** Never delete `.local-user/_Active/J-XX/Interview note - [Name].md` files after consolidating them into `70-Interview-Notes.md`. They're evidence of the interview and source material for follow-up.

## Workflow Integration

Each job folder mirrors the artifact numbering scheme. As you progress through the lifecycle:

- **Early stage (01-35):** JD → company research → fit analysis → self-assessment → rubric scoring → study plan
- **Mid stage (40-50):** Outreach → tailored stories
- **Interview stage (60-80):** Prep → mock → notes → follow-up → thank you
- **Late stage (90+):** Offer review → negotiation → decision

See `GETTING-STARTED.md` for step-by-step guidance on each phase.

## Tracker and Task Integration

### Job-Tracker.md

Single row per opportunity:
```
| J-01 | HelioWorks | Principal PM | Active | Consolidated Bob/Hu/Nandy feedback; next: rehearse model-scoring answer | 2026-04-12 |
```

Columns: ID, Company, Role, Status, Last Action, Date

Update after each significant step (JD arrival, interview round, feedback received, decision made).

### tasks.md

Checkbox list organized by job or by priority:
```
# J-01: HelioWorks
- [ ] P1 - Rehearse model-scoring answer @due:2026-04-13
- [ ] P1 - Prepare ops-cadence example @due:2026-04-13
- [ ] P2 - Review 75-Follow-Up-Notes if more interviews arrive @due:2026-04-20

# J-02: AnotherCompany
- [ ] P2 - Send outreach email to recruiter @due:2026-04-14
```

See `.github/copilot-instructions.md` for task format and MIRA integration rules.

## Getting Started

1. Copy the structure above into your `.local-user/` folder
2. Fill in `About_You/` with real content
3. Run the LinkedIn scraping pipeline or manually create first job folder
4. Use framework templates as guides; adapt to your situation
5. Keep `Job-Tracker.md` and `tasks.md` current as you work through opportunities
