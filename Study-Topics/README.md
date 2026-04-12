# Study Topics

An AI-assisted study system for interview preparation. Write study notes on any topic, then generate quizzes, drills, and exercises from them - all graded with structured feedback.

## How It Works

```
Write notes  →  Generate quiz/drill  →  Take it  →  Grade  →  Review gaps  →  Repeat
```

You write study notes in `Data/`. The AI generates quizzes and exercises from those notes. You complete them. The AI (or grading script) grades your work and tells you what to review.

## Two Learning Modes

### Knowledge Mode
Test and reinforce subject matter expertise through multiple-choice quizzes.

**Best for:** Terminology, concepts, frameworks, comparisons, decision criteria - any factual content you need to recall.

**Workflow:**
1. Write or paste study notes into `Data/` (e.g., `Data/System-Design-Basics.md`)
2. Ask your AI: *"Generate a quiz from Data/System-Design-Basics.md focusing on storage tradeoffs"*
3. Quiz saved to `Quizzes/`, working copy to `Completed/Quizzes/`
4. Fill in your answers
5. Grade with `python grade_quiz.py Completed/Quizzes/<file>.md`
6. Review the report in `Results/`
7. Repeat targeting weak areas until you score 90%+

### Behavior Mode
Train communication patterns through progressive drills - useful for executive interviews, case studies, or any role where how you answer matters as much as what you know.

**Best for:** Executive communication, strategic framing, case interview structure, system design walkthrough discipline.

**Workflow (4 phases, progressive):**

| Phase | Exercise | Purpose | Time |
|-------|----------|---------|------|
| 1. Concept Drilling | MCQ Quiz | "Do I know the framework?" | ~20 min |
| 2. Pattern Recognition | Altitude Drill | "Can I spot and fix weak answers?" | ~25 min |
| 3. Applied Practice | Scenario Response | "Can I produce good answers from scratch?" | ~20 min |
| 4. Pressure Testing | Rapid-Fire Drill | "Can I do it under time pressure?" | ~20 min |

Gate check between phases: 80%+ on Phase 1 before moving to Phase 2, etc.

## Folder Structure

```
Study-Topics/
├── Data/                    # Your study notes (source material)
├── Quizzes/                 # Generated quizzes (blank originals)
├── Exercises/               # Generated drills (blank originals)
├── Completed/
│   ├── Quizzes/            # Your answered quizzes
│   └── Exercises/          # Your completed drills
├── Results/                 # Graded reports with scores and feedback
├── Gap-Log.md              # Running log of knowledge gaps
├── grade_quiz.py           # Python script for grading MCQ quizzes
└── prompts/                # Generation and grading prompt templates
    ├── generate-quiz.md
    ├── generate-altitude-drill.md
    ├── generate-scenario-response.md
    ├── generate-rapid-fire.md
    └── grade-exercise.md
```

## Prompt Templates

Each prompt template in `prompts/` is a complete instruction set you can give to any AI assistant. They define the exact output format, scoring rubric, and exercise structure. The AI generates exercises grounded in your study notes - not generic questions.

| Template | Generates |
|----------|-----------|
| `generate-quiz.md` | 15-question MCQ quiz with answer key and explanations |
| `generate-altitude-drill.md` | 5 scenarios with weak answers to rewrite at a higher level |
| `generate-scenario-response.md` | 3 scenarios to answer from scratch with reference answers |
| `generate-rapid-fire.md` | 5 time-pressured questions (90 sec each) |
| `grade-exercise.md` | Grading rubric for all drill types (6 dimensions, 20-point scale) |

## Grading

**MCQ Quizzes:** Use `grade_quiz.py` (no AI needed):
```bash
python grade_quiz.py Completed/Quizzes/<quiz-file>.md
```

**Exercises (drills, scenarios, rapid-fire):** Ask your AI assistant:
> "Grade my completed exercise at Completed/Exercises/<file>.md using the rubric in prompts/grade-exercise.md"

## Gap Log

`Gap-Log.md` is a running log of things you don't know. Every time you miss a question or the AI flags a weakness, add it here. Review it before interviews. Over time, it becomes your personalized study guide.

## Companion: StudySort

[StudySort](https://github.com/nicolekumquat/StudySort) is an optional companion tool - a drag-and-drop learning game that teaches concepts by sorting items into categories. You can create topic packs for any domain (cloud services, architecture patterns, framework comparisons, etc.) and use it alongside this study system for visual/interactive reinforcement.
