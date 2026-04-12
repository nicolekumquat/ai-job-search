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

### 2c. Ideal Role Profile (`About_You/Ideal-Role-Profile.md`)
Answer the prompts about what roles fit you, what energizes you, what you want to avoid. Be honest - this document is private and helps the AI steer you toward the right opportunities.

### 2d. Search Context (`About_You/Search-Context.md`)
PRIVATE document. Include your real situation: why you're looking, what gaps you have, sensitive details the AI needs to know but should never surface externally. Privacy rules in the LLM instructions enforce this.

### 2e. Logistics (`About_You/Logistics.md`)
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

## Step 6: Start Searching

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
# → Creates J-XX-CompanyName/ folders with Job-Description.md
```

Then triage folders into `_Active/`, `_Potential/`, or `_Archive/`.

### Option B: Manual
Create a folder like `_Active/J-01-CompanyName/` and add a `Job-Description.md` with the JD text. The AI can work with it from there.

## Step 7: Analyze and Prepare

For each active opportunity, ask your AI assistant to:

1. **Score it** against your rubric → fill in `Job-Rubric.md`
2. **Analyze fit** → use `templates/Fit-Analysis.md`
3. **Write a self-assessment** → use `templates/Self-Assessment.md`
4. **Build a study plan** for knowledge gaps → use `templates/Study-Plan.md`
5. **Prep for interviews** → use `templates/Interview-Prep.md`
6. **Draft outreach** → use `templates/Outreach-Email.md`

Update `Job-Tracker.md` and `tasks.md` as you go.

## Ongoing

- Keep `Job-Tracker.md` current with status and last actions
- Use `tasks.md` for next steps and follow-ups
- Archive closed opportunities by moving folders to `_Archive/`
- When you get an offer, use the fit analysis and rubric scores to compare and decide
