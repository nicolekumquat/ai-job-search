# AI Job Search Toolkit

Welcome to this open-source, AI-assisted framework for managing a job search. Profile-first, accuracy-constrained, voice-calibrated.

![Shelby says hello](Study-Topics/Resources/SuccessShelby.png)
(Shelby says hello!)

This isn't a resume builder or a job board. It's a structured system that teaches any LLM to be your job search partner - one that knows your real strengths, writes in your voice, scores opportunities against your priorities, and prepares you for interviews with targeted study plans.

## Framework vs Personal Workspace

Use this repository as the shared framework. Keep personal job-search execution in a local, gitignored workspace.

- Framework (tracked): docs, templates, scripts, and instructions that help all users.
- Personal (private): profile content, real applications, trackers, interview notes, outreach drafts, and study outputs.

Create a local private root at `.local-user/` and do personal work there. This path is ignored by git, so personal search data is not checked in.

If you or your friends have ideas to improve the toolkit, open a GitHub Issue first. Optional PRs are welcome for framework changes.

## How It Works

The toolkit follows a deliberate sequence. Each step builds on the last.

### Phase 1: Build Your Profile

Before the AI searches for anything, it learns who you are. You fill in structured templates with your career history, strengths, constraints, and what you actually want. This becomes the source of truth that every subsequent step draws from.

| Template | What it captures |
|---|---|
| `About_You/Resume.md` | Career history, accomplishments, technical depth |
| `About_You/Strengths.md` | Your demonstrated strengths with evidence |
| `About_You/Story-Bank.md` | 5-8 reusable STAR stories in neutral, reusable form |
| `About_You/Ideal-Role-Profile.md` | What roles fit you, where you'd be valued, what to avoid |
| `About_You/Search-Context.md` | Private context: situation, constraints, gaps, positioning |
| `About_You/Logistics.md` | Location, level, comp, dealbreakers |

### Phase 2: Calibrate Your Voice

Provide 5+ writing samples (emails, memos, posts). The AI analyzes them and produces:

| Template | What it does |
|---|---|
| `About_You/Writing-Style/Voice-Quick-Reference.md` | Compact guide: your tone, patterns, signature moves |
| `About_You/Writing-Style/Authenticity-Rubric.md` | Scoring rubric to QA any AI-generated text against your real voice |

Every email, cover letter, and LinkedIn post the AI drafts afterward gets checked against this rubric. No more generic AI voice.

### Phase 3: Find and Evaluate Opportunities

| Tool / Template | What it does |
|---|---|
| `scripts/linkedin-search.js` | Searches LinkedIn Jobs with your criteria via Playwright |
| `scripts/linkedin-scrape-jds.js` | Scrapes full job descriptions from LinkedIn URLs |
| `scripts/create-job-folders.js` | Creates `J-XX-CompanyName/` folders with `01-Job-Description.md` in `.local-user/_Active/` |
| `Job-Rubric.md` | Weighted scoring rubric you configure for your priorities |
| `.local-user/Job-Tracker.md` | Status and history for every opportunity (personal workspace) |
| `.local-user/tasks.md` | Task list for next steps and follow-ups (personal workspace) |

Jobs get organized into `.local-user/_Active/`, `.local-user/_Potential/`, or `.local-user/_Archive/`.

### Job Folder Artifact Ordering

Use numbered filenames inside each `J-*` folder so artifacts stay chronologically and logically ordered.

Recommended base sequence:

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

Reserve gaps for intermediate artifacts so you can insert docs without renaming everything later.
Examples for late-stage flow: `90-Offer-Packet-Review.md`, `95-Negotiation-Plan.md`, `98-Decision.md`.

### Phase 4: Analyze Fit and Prepare

For each serious opportunity, the AI generates materials grounded in your profile:

| Template | What it does |
|---|---|
| `templates/Fit-Analysis.md` | Where you align (with evidence), where you don't, how to position |
| `templates/Self-Assessment.md` | Mnookin-style Interests / Capabilities / Market Realities |
| `templates/Customer-Value-Stories.md` | Tailored STAR stories selected from your story bank for a specific role |
| `templates/Study-Plan.md` | Targeted study plan based on gaps from the fit analysis |
| `templates/Interview-Prep.md` | Company research + interviewer research + role-specific questions + study guide |
| `templates/Interview-Notes.md` | Consolidated interview notes plus lightly cleaned raw note handling that preserves every fragment |
| `templates/Outreach-Email.md` | Email drafts in your voice, grounded in your real experience |

### Phase 5: Study and Drill

The `Study-Topics/` folder is a complete AI-assisted study system. Write notes on any topic, then generate quizzes and drills from them - all graded with structured feedback.

**Knowledge mode** tests subject matter through MCQ quizzes (graded by a Python script - no AI needed).

**Behavior mode** trains communication patterns through 4 progressive phases:

| Phase | Exercise Type | What It Tests |
|---|---|---|
| 1. Concept Drilling | MCQ Quiz | "Do I know the framework?" |
| 2. Pattern Recognition | Altitude Drill | "Can I spot and fix weak answers?" |
| 3. Applied Practice | Scenario Response | "Can I write good answers from scratch?" |
| 4. Pressure Testing | Rapid-Fire Drill | "Can I do it under time pressure?" |

Gate check between phases: 80%+ quiz score or 13+/20 drill score before advancing.

See [Study-Topics/README.md](Study-Topics/README.md) for the full system reference.

**Companion tool:** [StudySort](https://github.com/nicolekumquat/StudySort) is a drag-and-drop learning game for visual/interactive concept reinforcement.

### Phase 6: Stay Organized

| File | What it does |
|---|---|
| `Job-Tracker.md` | Single view of all opportunities with status and last action |
| `tasks.md` | Tasks and next steps (compatible with MIRA or any checkbox-based system) |

Raw per-interviewer notes should also live in the job folder as they happen, for example `Interview note - Bob.md`. Keep those originals, then merge the signal into the structured `70-Interview-Notes.md` artifact.

## Core Principles

**Profile-first.** The AI learns you before doing anything. Your profile documents are the source of truth.

**Accuracy-constrained.** The system is configured to never fabricate, embellish, or infer details about your experience. Every claim in a generated email or fit analysis must trace back to your source files. Gaps get flagged, not filled with invention.

**Voice-calibrated.** AI-drafted materials match your actual writing style, not generic corporate prose. The authenticity rubric scores drafts against your real voice.

**LLM-agnostic.** The templates and methodology work with any AI assistant. The `.github/copilot-instructions.md` file is optimized for VS Code + GitHub Copilot, but the same rules can be adapted as a system prompt for Claude, ChatGPT, or any other LLM.

**Honest about gaps.** Fit analyses call out where you don't match. Self-assessments name market realities. Being honest about gaps is always better than overstating fit.

## Getting Started

See [GETTING-STARTED.md](GETTING-STARTED.md) for the step-by-step setup guide.

### Quick Start

```bash
# Clone the repo
git clone https://github.com/nicolekumquat/ai-job-search.git
cd ai-job-search

# Install dependencies for LinkedIn scraping (optional)
npm install playwright
npx playwright install chromium

# Start filling in your profile
# Open About_You/Resume.md and follow the prompts
```

Then open the workspace in VS Code (or your editor of choice with AI assistance) and start a conversation with your AI assistant. The instructions file teaches it how to help you.

For privacy: do your real job-search execution under `.local-user/` instead of editing framework files directly.

## Included Custom Agents

Workspace-scoped custom agents are included under `.github/agents/`:

- `Job-Jeeves-Coordinator`: chief-of-staff style assistant for daily and weekly check-ins, workflow-stage orientation, follow-up tracking, pipeline sufficiency checks, network-outreach prompting, and periodic strategic market/role recalibration
- `Job-Shelby-Study-Assistant`: encouraging learning coach for interview-focused concept mastery, drills, confidence-building reps, and study tool selection (including StudySort when useful)

In VS Code Copilot Chat, use the agent picker to switch between them based on the task.
Both agents begin with a short self-introduction and example prompt suggestions.
Routing rule: if you ask about training or learning, use `Job-Shelby-Study-Assistant`.

Example invocation style:
- "Jeeves, what's next?"
- "Jeeves, run my weekly check-in."
- "Jeeves, run a strategic reset for my pipeline this week."
- "Shelby, help me study for this interview."
- "Shelby, give me a 60-minute prep block for system design."

## Folder Structure

```
ai-job-search/
├── .github/
│   └── copilot-instructions.md    # LLM instructions (configurable)
├── .local-user/                   # PRIVATE local-only workspace (gitignored)
├── local-user-template/           # Suggested private workspace layout
├── About_You/                     # Your profile (source of truth)
│   ├── _INDEX.md                  # Routing table for AI agents
│   ├── Resume.md                  # Career history + accomplishments
│   ├── Strengths.md               # Demonstrated strengths with evidence
│   ├── Story-Bank.md              # Reusable STAR stories
│   ├── Ideal-Role-Profile.md      # Where you'd be valued
│   ├── Search-Context.md          # PRIVATE: situation, gaps, positioning
│   ├── Logistics.md               # Location, level, comp, constraints
│   └── Writing-Style/
│       ├── Voice-Quick-Reference.md
│       └── Authenticity-Rubric.md
├── Study-Topics/                  # AI-assisted study system
│   ├── README.md                  # Full system reference
│   ├── Data/                      # Your study notes (source material)
│   ├── Quizzes/                   # Generated quizzes
│   ├── Exercises/                 # Generated drills
│   ├── Completed/                 # Your answered quizzes and drills
│   ├── Results/                   # Graded reports
│   ├── Gap-Log.md                 # Running log of knowledge gaps
│   ├── grade_quiz.py              # Python grading script for MCQ quizzes
│   └── prompts/                   # Generation and grading prompt templates
├── _Active/                       # Active job opportunities
├── _Potential/                    # Potential, not yet pursued
├── _Archive/                      # Closed or declined
├── scripts/                       # LinkedIn scraping pipeline
├── templates/                     # Reusable templates for job materials
├── Job-Tracker.md                 # Status tracker for all opportunities
├── Job-Rubric.md                  # Weighted scoring rubric
├── tasks.md                       # Tasks and next steps
├── GETTING-STARTED.md             # Step-by-step onboarding guide
└── README.md                      # This file
```

## Origin Story

This toolkit was extracted from a real job search run by a senior tech leader using GitHub Copilot as a partner over several weeks. What started as LinkedIn scraping scripts evolved into a full AI-assisted system - profile analysis, voice calibration, 25 years of performance review synthesis, weighted job scoring, fit analyses, targeted study programs, and interview prep. The methodology worked. This repo packages the reusable parts as a framework anyone can use.

## Contributing

PRs welcome. The most valuable contributions are:
- Additional scraping scripts (Indeed, Glassdoor, other job boards)
- Templates for additional job search artifacts (negotiation prep, reference prep, etc.)
- Adaptations of the LLM instructions for other AI assistants (Claude Projects, ChatGPT custom instructions, etc.)
- Improvements to the profile builder flow

For user feedback from real usage:
- Open a GitHub Issue with the improvement idea or pain point.
- Optional: include a PR for framework-only changes.
- Do not include personal job-search content in Issues or PRs.

## License

MIT
