# Scenario Response Generation Prompt

Use this prompt to generate **scenario-based open response exercises**. These present executive-level questions and challenge you to write full, well-structured answers from scratch.

---

## Prompt

```
You are an executive communication coach generating scenario response exercises. Using the study notes I provide below, generate a scenario response exercise with the following specifications:

**Source File:** [SOURCE - the name of your notes file, without extension]

**Topic/Section Focus:** [TOPIC - e.g., "Customer Strategy", "Platform Architecture Decisions", "Stakeholder Management"]

**Difficulty:** [DIFFICULTY - "standard" or "hard"]

**Exercise Format:**
- 3 scenarios (capped at 3 to maintain quality under cognitive load)
- Each scenario provides:
  - Context setting (who is asking, what the situation is)
  - The executive question
  - Space for you to write your full response
- If difficulty is "standard": Clear, direct executive questions with obvious framework application
- If difficulty is "hard": Ambiguous or multi-layered questions that require clarifying objectives, handling tension between stakeholders, or navigating competing priorities

**Output Format - Generate EXACTLY this Markdown structure:**

# Scenario Response: [Source Name] - [Topic Name] v[VERSION] [If hard, append "(Hard)"]
**Date:** [Today's Date]
**Source:** [Name of the source notes file]
**Topic Focus:** [Topic]
**Version:** [VERSION]
**Exercise Type:** Scenario Response
**Instructions:** For each scenario, read the context and question carefully. Write your full response as if answering live in an executive interview or strategy meeting. Aim for: (1) Clarify the Objective, (2) Diagnose the Structural Issue, (3) State a Clear Thesis, (4) Outline 2-3 Strategic Pillars, (5) Tie to Economic Outcomes, (6) Acknowledge Tradeoffs. Aim for 4-8 sentences per response.

---

## Scenario 1

**Context:**
[Set the scene - who is in the room, what role the questioner holds, what the business situation is. Make it feel real and specific.]

**Question:**
> "[A direct quote of what the executive asks you]"

**Your Response:**

[WRITE YOUR RESPONSE HERE]

---

## Scenario 2
[...repeat structure for all 3 scenarios...]

---

[INSERT 40 BLANK LINES HERE]

---

## Reference Answers & Scoring Guide

### Scenario 1

**Strong Reference Answer:**
> [A model senior-level answer demonstrating all 6 framework elements]

**Scoring Rubric:**

| Dimension | Points | Criteria |
|-----------|--------|----------|
| Objective Clarity | 0-3 | Did they clarify what's being optimized before proposing? |
| Structural Diagnosis | 0-4 | Root cause identified, not symptoms or tools? |
| Decisive Thesis | 0-4 | Clear, assertive position - not hedged? |
| Strategic Pillars | 0-3 | 2-3 levers (not project lists, not more than 4)? |
| Economic Mechanism | 0-4 | Explicit economic tie (revenue, margin, cost, win rate)? |
| Tradeoff Maturity | 0-2 | Named tension and justified the choice? |
| **Total** | **0-20** | |

**Score Interpretation:**
- 17-20: Executive-ready response
- 13-16: Strong, with minor altitude gaps
- 9-12: Needs structural improvement
- 0-8: Tactical - review the framework

### Scenario 2
[...repeat for all 3 scenarios...]

---

**IMPORTANT RULES:**
1. Each "Your Response" section must be blank with only the instructional placeholder
2. Reference answers and scoring rubrics must be included after the vertical space
3. Scenarios must feel realistic - use plausible company situations and business tension
4. Each scenario should test different aspects of the framework
5. Include at least one scenario with a skeptical or pushback-style question
6. **Three scenarios maximum** - quality degrades after 2-3 under cognitive load
7. **Avoid duplicates:** Check `Exercises/` for existing scenario exercises from the same source

**VERSIONING RULES:**
- Check `Exercises/` for existing exercises from the same source
- Version increments per source+type+difficulty
- Example: `Topic_Scenario_Response_v01.md`

**NAMING CONVENTION:**
- File name format: `[SourceName]_Scenario_Response_v[VERSION].md` or `[SourceName]_Scenario_Response_v[VERSION]_Hard.md`
- Save to the `Exercises/` folder

**Here are my notes:**

[PASTE YOUR NOTES HERE]
```
