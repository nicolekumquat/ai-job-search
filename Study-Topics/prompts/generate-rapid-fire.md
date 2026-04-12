# Rapid-Fire Drill Generation Prompt

Use this prompt to generate **timed rapid-fire drills**. These present 5 sharp executive questions in quick succession, challenging you to produce structured answers in approximately 90 seconds each.

This is Phase 4 (Pressure Testing) of the behavior training workflow. Use it after you've passed concept drilling, altitude drills, and scenario responses.

---

## Prompt

```
You are an executive communication coach generating rapid-fire drill exercises. Using the study notes I provide below, generate a rapid-fire drill with the following specifications:

**Source File:** [SOURCE - the name of your notes file, without extension]

**Topic/Section Focus:** [TOPIC - e.g., "Mixed Executive Scenarios", "Revenue Strategy", "Technical Leadership"]

**Difficulty:** [DIFFICULTY - "standard" or "hard"]

**Exercise Format:**
- 5 rapid-fire questions
- Each question is a single sharp executive prompt (1-2 sentences max)
- You write compressed, structured answers (3-5 sentences target)
- If difficulty is "standard": Direct questions that map clearly to the framework
- If difficulty is "hard": Curveball questions, pushback scenarios, or ambiguous prompts that require fast reframing

**Output Format - Generate EXACTLY this Markdown structure:**

# Rapid-Fire Drill: [Source Name] - [Topic Name] v[VERSION] [If hard, append "(Hard)"]
**Date:** [Today's Date]
**Source:** [Name of the source notes file]
**Topic Focus:** [Topic]
**Version:** [VERSION]
**Exercise Type:** Rapid-Fire Drill
**Time Target:** 90 seconds per question (7.5 minutes total)
**Instructions:** Set a timer for 90 seconds per question. When the timer starts, read the question and write your answer immediately. Do NOT go back and revise previous answers. The goal is to build instinctive structural framing under time pressure. Your answer should compress the framework: thesis, structural insight, economic tie, in 3-5 sentences.

---

## Q1.
> "[Sharp executive question]"

**Your Answer (90 sec):**

[WRITE HERE]

---

## Q2.
> "[Sharp executive question]"

**Your Answer (90 sec):**

[WRITE HERE]

---

[...continue for all 5 questions...]

---

[INSERT 40 BLANK LINES HERE]

---

## Reference Answers & Quick Scoring

### Q1. Reference Answer
> [Concise senior-level answer in 3-5 sentences]

**Quick Score:** Rate yourself 1-5 on each:
- [ ] Structure (thesis present?) ___/5
- [ ] Altitude (strategic, not tactical?) ___/5
- [ ] Economics (revenue/cost/margin tie?) ___/5
- [ ] Decisiveness (assertive, not hedged?) ___/5

### Q2. Reference Answer
[...repeat for all 5 questions...]

---

## Self-Assessment Summary

After completing all 5 questions, tally your scores:

| Dimension | Q1 | Q2 | Q3 | Q4 | Q5 | Avg |
|-----------|----|----|----|----|----|----|
| Structure | | | | | | |
| Altitude | | | | | | |
| Economics | | | | | | |
| Decisiveness | | | | | | |

**Interpretation:**
- Avg 4-5: Ready for live executive conversations
- Avg 3-4: Structure is forming - keep drilling
- Avg 2-3: Falling back to tactical under pressure - slow down and use the framework consciously
- Avg 1-2: Review the framework before drilling again

---

**IMPORTANT RULES:**
1. Questions must be short and punchy - simulate real executive interruptions
2. Include a mix: strategy questions, pushback questions, "what would you do" questions
3. At least 1 question should be a challenging redirect (e.g., "That sounds expensive. Convince me." or "The CRO disagrees. Now what?")
4. Reference answers must demonstrate compressed senior-level structure
5. **Avoid duplicates:** Check `Exercises/` for existing rapid-fire drills from the same source

**VERSIONING RULES:**
- Check `Exercises/` for existing drills from the same source
- Version increments per source+type+difficulty
- Example: `Topic_Rapid_Fire_v01.md`

**NAMING CONVENTION:**
- File name format: `[SourceName]_Rapid_Fire_v[VERSION].md` or `[SourceName]_Rapid_Fire_v[VERSION]_Hard.md`
- Save to the `Exercises/` folder

**Here are my notes:**

[PASTE YOUR NOTES HERE]
```
