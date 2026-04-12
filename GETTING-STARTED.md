# Getting Started

Step-by-step guide to set up your AI-assisted job search.

---

## Step 1: Clone and Install

```bash
git clone https://github.com/nicolekumquat/ai-job-search.git
cd ai-job-search
```

If you plan to use the LinkedIn scraping scripts:
```bash
npm install playwright
npx playwright install chromium
```

## Step 1.5: Create Your Private Local Workspace

Create a local-only folder for personal job-search execution:

```bash
mkdir .local-user
```

Use `.local-user/` for your real profile content, live applications, trackers, interview notes, and study outputs. This folder is gitignored and should never be committed.

Use the tracked framework files in this repo as reference templates.
The suggested layout is documented in `.local-user-sample/README.md` — you'll find a realistic worked example there showing a complete job search cycle.

## Step 2: Fill In Your Profile

Open each file in `About_You/` and follow the guided prompts. Do these in order - each builds on the previous.

### 2a. Resume (`About_You/Resume.md`)
Paste or write your career history. Focus on what you actually did, not job descriptions. Include:
- Accomplishments with specifics (numbers, scope, outcomes)
- Technical depth and domain expertise
- Team sizes you've led or influenced
- Transformations you've driven

### 2b. Strengths (`About_You/Strengths.md`)
List 5-8 demonstrated strengths. For each one, include evidence - a specific project, outcome, or pattern that proves it. The AI will use these as the basis for fit analyses and positioning. Only include strengths you can defend in an interview.

### 2c. Story Bank (`About_You/Story-Bank.md`)
Write 5-8 of your strongest STAR stories in neutral, reusable form. These are your raw materials for interview prep, networking, and role-specific story tailoring. Keep them factual and reusable; the AI can reframe emphasis later for specific companies.

### 2d. Ideal Role Profile (`About_You/Ideal-Role-Profile.md`)
Answer the prompts about what roles fit you, what energizes you, what you want to avoid. Be honest - this document is private and helps the AI steer you toward the right opportunities.

### 2e. Search Context (`About_You/Search-Context.md`)
PRIVATE document. Include your real situation: why you're looking, what gaps you have, sensitive details the AI needs to know but should never surface externally. Privacy rules in the LLM instructions enforce this.

### 2f. Logistics (`About_You/Logistics.md`)
Location constraints, target level/title, compensation expectations, dealbreakers.

## Step 3: Calibrate Your Voice

Gather 5+ writing samples - emails you've written, memos, blog posts, Slack messages, anything that represents how you actually communicate. Paste them into a conversation with your AI assistant and ask:

> "Analyze these writing samples and fill in `About_You/Writing-Style/Voice-Quick-Reference.md` and `About_You/Writing-Style/Authenticity-Rubric.md` based on my actual patterns."

The AI will identify your tone, structural habits, signature moves, and build a scoring rubric. Every draft it writes afterward gets checked against this.

## Step 4: Configure Your Job Rubric

Open `Job-Rubric.md` and customize:
1. **Dimensions** - keep the defaults or add/remove factors that matter to you
2. **Weights** - assign 1x-4x based on your priorities
3. **Anchors** - fill in the 0-5 descriptions with your specific situation (e.g., your comp baseline, your location constraints)

## Step 5: Configure the LLM Instructions

Open `.github/copilot-instructions.md` (for VS Code + Copilot) and update:
- Your name and current role
- Privacy rules (what should never be revealed)
- Accuracy rules (already set to strict by default)
- Any additional conventions

If you're using a different AI assistant, adapt the instructions as a system prompt. The key sections to preserve: accuracy rules, privacy rules, writing style reference, and job tracker protocols.

Also preserve the two-mode boundary:
- Personal job search work goes in `.local-user/` only.
- Toolkit improvements should be submitted as GitHub Issues first (PR optional).

## Step 6: Start Searching

Use a dual-channel sourcing approach:
- **Web sourcing:** job boards, LinkedIn, and company career pages
- **Network sourcing:** former colleagues, managers, mentors, and trusted contacts who can provide leads or referrals

Track both channels in `.local-user/`:
- Log job applications and status in `.local-user/Job-Tracker.md`
- Log outreach emails, follow-up dates, and networking meetings in `.local-user/tasks.md` and the relevant `J-*` folder

### Option A: LinkedIn Scraping Pipeline
```bash
cd scripts

# 1. Search - edit linkedin-search.js to set your search criteria
node linkedin-search.js
# → Outputs linkedin-search-results.json

# 2. Review results, pick interesting jobs, add them to linkedin-scrape-jds.js

# 3. Scrape full JDs
node linkedin-scrape-jds.js
# → Outputs linkedin-jd-results.json

# 4. Create job folders
node create-job-folders.js
# → Creates J-XX-CompanyName/ folders with 01-Job-Description.md under .local-user/_Active/
```

Folders are created in `.local-user/_Active/` by default.

### Option B: Manual
Create a folder like `.local-user/_Active/J-01-CompanyName/` and add a `01-Job-Description.md` with the JD text. The AI can work with it from there. Use `_Active/` for current opportunities, `_Potential/` for jobs you may apply to later, and `_Archive/` for completed or closed opportunities.

Use numbered filenames so files stay ordered as the folder grows. Recommended base sequence:
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

Leave the 90s open for late-stage artifacts such as `90-Offer-Packet-Review.md`, `95-Negotiation-Plan.md`, and `98-Decision.md`.

## Step 7: Analyze and Prepare

For each active opportunity, ask your AI assistant to:

1. **Score it** against your rubric → fill in `Job-Rubric.md`
2. **Analyze fit** → use `templates/Fit-Analysis.md`
3. **Write a self-assessment** → use `templates/Self-Assessment.md`
4. **Tailor interview stories** from your story bank → use `templates/Customer-Value-Stories.md`
5. **Build a study plan** for knowledge gaps → use `templates/Study-Plan.md`
6. **Prep for interviews** → use `templates/Interview-Prep.md` (include company research and focused study priorities based on role-relevant risks and constraints)
7. **Capture raw per-interviewer notes** in the job folder as they happen (for example `Interview note - Bob.md`)
8. **Merge and lightly clean interview notes** → use `templates/Interview-Notes.md` for the structured roll-up (preserve every note fragment, even if unclear)
9. **Draft outreach** → use `templates/Outreach-Email.md`

If interviewer names are available, include a LinkedIn/profile review pull-in in your interview prep artifact.

Update `Job-Tracker.md` and `tasks.md` as you go.

## Step 8: Study and Drill

When a fit analysis reveals knowledge gaps, use `Study-Topics/` to close them:

### Write Study Notes
Create a file in `Study-Topics/Data/` (e.g., `System-Design.md`) with your notes on the topic. Use `Study-Topics/Data/_TEMPLATE.md` as a starting point.

### Generate and Take Quizzes
Ask your AI: *"Generate a quiz from Study-Topics/Data/System-Design.md focusing on storage tradeoffs"*

Fill in your answers in the `Completed/Quizzes/` copy, then grade:
```bash
cd Study-Topics
python grade_quiz.py Completed/Quizzes/System-Design_Quiz_v01.md
```

### Train Communication Patterns (Behavior Mode)
For roles requiring executive communication, run the 4-phase behavior drill progression:

1. **Concept Quiz** - Score 80%+ before advancing
2. **Altitude Drill** - Rewrite weak answers at a senior level
3. **Scenario Response** - Write full answers from scratch
4. **Rapid-Fire** - Answer under 90-second time pressure

Ask the AI to generate each exercise type using the prompt templates in `Study-Topics/prompts/`, then grade with `prompts/grade-exercise.md`.

### Track Gaps
Add missed concepts to `Study-Topics/Gap-Log.md`. Review it before every interview.

See [Study-Topics/README.md](Study-Topics/README.md) for the complete system reference.

## Step 9: Manage Your Task List

Create a `.local-user/tasks.md` file to track next steps across all your active job searches. Format it as a simple checkbox list:

```markdown
<!-- MIRA-SCAN parser:checkbox -->

## J-01: Company Name
- [ ] P1 - Task title @due:2026-04-15 @estimate:30 min
- [ ] P2 - Another task @due:2026-04-20 @estimate:1 hour

## Study
- [ ] Quiz on Topic X @due:2026-04-18 @estimate:45 min

## Admin
- [ ] Weekly check-in review @due:2026-04-14 @estimate:15 min
```

**Format notes:**
- Start each line with `- [ ]` or `- [x]` (checkbox)
- Use `@due:YYYY-MM-DD` for deadlines
- Use `@estimate:Xh` or `@estimate:X min` for time tracking
- Use `@project:J-01-CompanyName` to group by job
- Prefix tasks with `P1` or `P2` for priority (P1 = urgent, P2 = nice-to-have)

This format is optional but recommended. It works with common task dashboards if you want to add one later.

## Step 10: Set Up Daily Reminder Email (Optional)

If you want an overnight reminder email from your `.local-user/tasks.md` and `.local-user/Job-Tracker.md`, run this one-liner from the repo root:

```powershell
powershell -ExecutionPolicy Bypass -File .\setup-reminder-task.ps1 -To "you@example.com"
```

What this does:
- Creates a Windows Scheduled Task (`AIJobSearch-Reminder`)
- Runs daily at 06:30 by default
- Sends a simple status email using `scripts/job-reminder.ps1`

Customize time (optional):

```powershell
powershell -ExecutionPolicy Bypass -File .\setup-reminder-task.ps1 -To "you@example.com" -Time "07:15"
```

Remove the scheduled reminder task (optional):

```powershell
powershell -ExecutionPolicy Bypass -File .\remove-reminder-task.ps1
```

## Ongoing

- Keep `.local-user/Job-Tracker.md` current with status and last actions
- Update `.local-user/tasks.md` as you progress through interviews, offers, and decisions
- Track networking actions as first-class pipeline work (outreach sent, follow-up due dates, and meeting outcomes), not just application submissions
- During check-ins: if you only have one active job, ask whether to add 1-3 additional opportunities in parallel to reduce single-pipeline risk
- During weekly check-ins: even with 2-3 active jobs, consider sourcing 1-2 additional opportunities as backup in case one pipeline slows or closes
- Archive closed opportunities by moving folders from `.local-user/_Active/` to `.local-user/_Archive/`
- When you get an offer, use the fit analysis and rubric scores to compare and decide
- Review your Gap-Log before every interview to stay prepared on weak areas

For toolkit feedback from real usage:
- Open a GitHub Issue describing the improvement.
- Optionally submit a PR for framework changes only.
