# Quiz Generation Prompt

Use this prompt with any AI assistant. Fill in the **[BRACKETS]** with your specifics.

---

## Prompt

```
You are a quiz generator for study materials. Using the notes I provide below, generate a multiple choice quiz with the following specifications:

**Source File:** [SOURCE - the name of your notes file, without extension]

**Topic/Section Focus:** [TOPIC - e.g., "Data Modeling", "API Design Patterns", or "Cloud Architecture". Use a concise, descriptive label - never just "All"]

**Difficulty:** [DIFFICULTY - "standard" or "hard"]

**Quiz Format:**
- 15 questions
- 4 answer choices per question (A, B, C, D)
- If difficulty is "standard": Mix of recall, understanding, and application questions
- If difficulty is "hard": Focus on nuanced, scenario-based, and analytical questions (see Hard Quiz Rules below)
- Questions should test genuine understanding, not just memorization

**Output Format - Generate EXACTLY this Markdown structure:**

# Quiz: [Source Name] - [Topic Name] v[VERSION] [If hard difficulty, append "(Hard)"]
**Date:** [Today's Date]
**Source:** [Name of the source notes file]
**Topic Focus:** [Topic]
**Version:** [VERSION - see Versioning Rules below]

---

## Questions

**Q1.** [Question text]
- A) [Option A]
- B) [Option B]
- C) [Option C]
- D) [Option D]

**Your Answer:** ___

---

**Q2.** [Question text]
- A) [Option A]
- B) [Option B]
- C) [Option C]
- D) [Option D]

**Your Answer:** ___

---

[...continue for all 15 questions...]

---

[INSERT 40 BLANK LINES HERE to create vertical space so the answer key is not visible while taking the quiz]

---

## Answer Key

| Question | Correct Answer | Explanation |
|----------|---------------|-------------|
| Q1 | [Letter] | [Brief explanation] |
| Q2 | [Letter] | [Brief explanation] |
[...for all 15 questions...]

---

**IMPORTANT RULES:**
1. Each "Your Answer" line must show ___ (three underscores) as placeholder
2. The Answer Key table MUST be included at the bottom
3. Questions should be drawn directly from the provided notes
4. Include a mix of: definition questions, concept application, scenario-based, and comparison questions
5. All 4 options should be plausible - avoid obviously wrong answers
6. **Equalize option length:** The correct answer should NOT be noticeably longer or more detailed than the incorrect options. Incorrect options should include their own reasoning or rationale (even if flawed) so that all four choices are similar in length and apparent depth
7. **Avoid duplicate questions:** Check the `Quizzes/` folder for any existing quizzes with the same source file name. Do NOT reuse the same questions or close paraphrases
8. **Randomize correct answer positions:** Distribute correct answers roughly evenly across A, B, C, and D. Each letter should be correct approximately 3-4 times out of 15 questions. NEVER have the same letter correct for more than 3 consecutive questions

**VERSIONING RULES:**
- Check the `Quizzes/` folder for existing quizzes from the same source file
- The version number increments per source+difficulty combination
- First standard quiz from a source: v01. Second: v02, etc.
- Hard quizzes have their own version sequence: first hard quiz is v01, second is v02, etc.

**NAMING CONVENTION:**
- File name format: `[SourceName]_Quiz_v[VERSION].md` or `[SourceName]_Quiz_v[VERSION]_Hard.md`
- Save to the `Quizzes/` folder

**HARD QUIZ RULES (apply only when difficulty is "hard"):**
1. Prioritize scenario-based and "what would you do" questions over simple recall
2. Include tradeoff questions where multiple options have merit
3. Reference real-world decision contexts from the notes

**GRADING NOTE:** After completing the quiz, grade it with `python grade_quiz.py Completed/Quizzes/<file>.md`. Scores 90%+ automatically generate an HTML Certificate of Achievement.

**Here are my notes:**

[PASTE YOUR NOTES HERE]
```
