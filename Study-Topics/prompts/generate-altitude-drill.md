# Altitude Drill Generation Prompt

Use this prompt to generate "Fix the Altitude" exercises. These present **weak, surface-level answers** and challenge you to **rewrite them at a senior/executive level**.

This drill is most useful for roles that require executive communication - VP, Director, Principal, or senior leadership positions where how you frame answers matters as much as the content.

---

## Prompt

```
You are an executive communication coach generating altitude drill exercises. Using the study notes I provide below, generate a "Fix the Altitude" drill with the following specifications:

**Source File:** [SOURCE - the name of your notes file, without extension]

**Topic/Section Focus:** [TOPIC - e.g., "Strategic Framing", "Revenue Mechanics", "Org Design"]

**Difficulty:** [DIFFICULTY - "standard" or "hard"]

**Exercise Format:**
- 5 scenarios
- Each scenario provides:
  - An executive-level question or prompt
  - A weak/tactical answer that needs to be elevated
  - Space for you to write your senior-level rewrite
- If difficulty is "standard": Weak answers have 1-2 clear altitude problems (too tactical, missing economic tie, no thesis)
- If difficulty is "hard": Weak answers are subtly flawed - they sound reasonable but lack structural framing, have hidden hedging, or miss compounding effects

**Output Format - Generate EXACTLY this Markdown structure:**

# Altitude Drill: [Source Name] - [Topic Name] v[VERSION] [If hard, append "(Hard)"]
**Date:** [Today's Date]
**Source:** [Name of the source notes file]
**Topic Focus:** [Topic]
**Version:** [VERSION]
**Exercise Type:** Altitude Drill
**Instructions:** For each scenario, read the question and the weak answer provided. Then write your rewrite in the "Your Rewrite" section. Aim for responses that demonstrate: structural framing, economic clarity, decisive thesis, strategic pillars (max 3), and tradeoff acknowledgment.

---

## Scenario 1

**Executive Question:**
[A realistic question a senior executive would ask in an interview or strategy meeting]

**Weak Answer (Tactical Level):**
> [A plausible but altitude-challenged answer - too tactical, feature-listy, missing economic framing, hedging, or lacking thesis]

**What's Wrong:**
[1-2 sentence hint about the altitude problem]

**Your Rewrite:**

> [WRITE YOUR REWRITE HERE]

---

## Scenario 2
[...repeat structure for all 5 scenarios...]

---

[INSERT 40 BLANK LINES HERE to create vertical space so the reference answers are not visible while practicing]

---

## Reference Answers

### Scenario 1 - Reference Answer

> [A strong senior-level answer that demonstrates proper altitude]

**Scoring Criteria:**
| Dimension | What to Look For |
|-----------|-----------------|
| Structural Diagnosis | Identifies root cause, not symptoms |
| Decisive Thesis | Clear, assertive position statement |
| Strategic Pillars | 2-3 levers, not project lists |
| Economic Mechanism | Ties to revenue, margin, cost, or win rate |
| Tradeoff Acknowledgment | Names the tension and justifies the choice |

### Scenario 2 - Reference Answer
[...repeat for all 5 scenarios...]

---

**IMPORTANT RULES:**
1. Each "Your Rewrite" section must be blank with only the instructional placeholder
2. Reference Answers must be included at the bottom after the vertical space
3. Weak answers should be realistic - the kind of thing a strong IC or mid-level manager would say
4. Executive questions should feel like real interview or boardroom questions
5. Cover different altitude failure modes: missing thesis, tactical detail, hedging, no economic tie, feature lists, no tradeoffs
6. **Avoid duplicates:** Check the `Exercises/` folder for existing altitude drills from the same source

**VERSIONING RULES:**
- Check `Exercises/` for existing drills from the same source
- Version increments per source+type+difficulty
- Example: `Topic_Altitude_Drill_v01.md`

**NAMING CONVENTION:**
- File name format: `[SourceName]_Altitude_Drill_v[VERSION].md` or `[SourceName]_Altitude_Drill_v[VERSION]_Hard.md`
- Save to the `Exercises/` folder

**Here are my notes:**

[PASTE YOUR NOTES HERE]
```
