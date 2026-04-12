"""
Quiz Grading Script
Reads a completed quiz markdown file, compares answers to the answer key,
and generates a graded report in Results/.

Usage:
    python grade_quiz.py Completed/Quizzes/<quiz-file>.md
"""

import base64
import random
import re
import sys
import os
from datetime import datetime, timezone


def parse_quiz(file_path: str) -> dict:
    """Parse a completed quiz markdown file."""
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    result = {
        "title": "",
        "date": "",
        "source": "",
        "topic": "",
        "questions": [],
        "user_answers": {},
        "answer_key": {},
        "explanations": {},
    }

    # Extract header info
    title_match = re.search(r"^# Quiz:\s*(.+)$", content, re.MULTILINE)
    if title_match:
        result["title"] = title_match.group(1).strip()

    date_match = re.search(r"\*\*Date:\*\*\s*(.+)$", content, re.MULTILINE)
    if date_match:
        result["date"] = date_match.group(1).strip()

    source_match = re.search(r"\*\*Source:\*\*\s*(.+)$", content, re.MULTILINE)
    if source_match:
        result["source"] = source_match.group(1).strip()

    topic_match = re.search(r"\*\*Topic Focus:\*\*\s*(.+)$", content, re.MULTILINE)
    if topic_match:
        result["topic"] = topic_match.group(1).strip()

    # Extract questions and user answers
    question_pattern = re.compile(
        r"\*\*Q(\d+)\.\*\*\s*(.+?)(?=\n- A\))",
        re.DOTALL,
    )
    answer_pattern = re.compile(
        r"\*\*Your Answer:\*\*\s*_*\s*([A-Da-d])",
        re.MULTILINE,
    )

    questions = question_pattern.findall(content)
    user_answers = answer_pattern.findall(content)

    for q_num, q_text in questions:
        q_num = int(q_num)
        result["questions"].append({"number": q_num, "text": q_text.strip()})

    for i, answer in enumerate(user_answers, start=1):
        result["user_answers"][i] = answer.strip().upper()

    # Extract answer key from table
    key_pattern = re.compile(
        r"\|\s*Q(\d+)\s*\|\s*([A-Da-d])\s*\|\s*(.+?)\s*\|",
        re.MULTILINE,
    )
    for match in key_pattern.finditer(content):
        q_num = int(match.group(1))
        result["answer_key"][q_num] = match.group(2).strip().upper()
        result["explanations"][q_num] = match.group(3).strip()

    return result


def grade_quiz(parsed: dict) -> dict:
    """Grade the quiz and identify topics to review."""
    total = len(parsed["answer_key"])
    correct = 0
    incorrect = []
    unanswered = []

    for q_num in sorted(parsed["answer_key"].keys()):
        expected = parsed["answer_key"][q_num]
        given = parsed["user_answers"].get(q_num)

        if not given or given == "___" or given == "_":
            unanswered.append(q_num)
        elif given == expected:
            correct += 1
        else:
            incorrect.append(
                {
                    "question": q_num,
                    "your_answer": given,
                    "correct_answer": expected,
                    "explanation": parsed["explanations"].get(q_num, ""),
                    "text": next(
                        (
                            q["text"]
                            for q in parsed["questions"]
                            if q["number"] == q_num
                        ),
                        "",
                    ),
                }
            )

    score_pct = (correct / total * 100) if total > 0 else 0

    return {
        "total": total,
        "correct": correct,
        "incorrect": incorrect,
        "unanswered": unanswered,
        "score_pct": score_pct,
    }


def generate_report(parsed: dict, graded: dict, output_path: str) -> None:
    """Generate and save a graded report."""
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    score = graded["score_pct"]

    if score >= 90:
        performance = "Excellent - strong command of the material"
    elif score >= 75:
        performance = "Good - solid understanding with minor gaps"
    elif score >= 60:
        performance = "Fair - several areas need review"
    else:
        performance = "Needs Improvement - significant review recommended"

    lines = []
    lines.append(f"# Graded Quiz Results: {parsed['title']}")
    lines.append("")
    lines.append(f"**Graded:** {now}")
    lines.append(f"**Source:** {parsed['source']}")
    lines.append(f"**Topic Focus:** {parsed['topic']}")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## Score Summary")
    lines.append("")
    lines.append("| Metric | Value |")
    lines.append("|--------|-------|")
    lines.append(f"| Total Questions | {graded['total']} |")
    lines.append(f"| Correct | {graded['correct']} |")
    lines.append(f"| Incorrect | {len(graded['incorrect'])} |")
    lines.append(f"| Unanswered | {len(graded['unanswered'])} |")
    lines.append(f"| **Score** | **{score:.0f}%** |")
    lines.append(f"| Performance | {performance} |")
    lines.append("")

    if graded["incorrect"]:
        lines.append("---")
        lines.append("")
        lines.append("## Questions to Review")
        lines.append("")
        lines.append(
            "These are the questions you got wrong. Review the explanations "
            "and revisit the source material."
        )
        lines.append("")

        for item in graded["incorrect"]:
            lines.append(f"### Q{item['question']}. {item['text']}")
            lines.append("")
            lines.append(f"- **Your Answer:** {item['your_answer']}")
            lines.append(f"- **Correct Answer:** {item['correct_answer']}")
            lines.append(f"- **Explanation:** {item['explanation']}")
            lines.append("")

    if graded["unanswered"]:
        lines.append("---")
        lines.append("")
        lines.append("## Unanswered Questions")
        lines.append("")
        lines.append(
            f"You left {len(graded['unanswered'])} question(s) unanswered: "
            + ", ".join(f"Q{q}" for q in graded["unanswered"])
        )
        lines.append("")

    lines.append("---")
    lines.append("")
    lines.append("## Study Recommendations")
    lines.append("")

    if score >= 90:
        lines.append(
            "Great job! Consider moving on to more advanced topics or retaking "
            "with a narrower focus on the questions you missed."
        )
    elif score >= 75:
        lines.append(
            "Review the incorrect questions above. Focus on understanding "
            "the *why* behind each correct answer."
        )
    elif score >= 60:
        lines.append(
            "Re-read the relevant sections of your notes, focusing on the "
            "topics from the missed questions. Consider retaking this quiz "
            "after review."
        )
    else:
        lines.append(
            "A thorough review of the source material is recommended before "
            "retaking this quiz. Consider breaking the topic into smaller "
            "sections and quizzing on each individually."
        )

    lines.append("")
    lines.append("---")
    lines.append(f"*Generated: {now}*")
    lines.append("")

    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


ENCOURAGING_MESSAGES = [
    "You're crushing it! Your dedication to learning is truly inspiring.",
    "Outstanding work! Knowledge like this is what sets great professionals apart.",
    "Brilliant performance! You've proven you really understand this material.",
    "Wow - you nailed it! Keep this momentum going and there's no limit to what you can achieve.",
    "Exceptional results! Your hard work and focus are clearly paying off.",
    "You should be proud - this kind of mastery takes real effort and you've earned it!",
]


def generate_certificate(parsed: dict, graded: dict, output_path: str) -> str:
    """Generate an HTML certificate for scores >= 90%."""
    now = datetime.now(timezone.utc).strftime("%B %d, %Y")
    message = random.choice(ENCOURAGING_MESSAGES)
    score = graded["score_pct"]
    title = parsed["title"] or "Study Quiz"
    topic = parsed["topic"]
    if not topic or topic.lower() in ("all", "general", "everything"):
        topic = title

    # Load a random Shelby image as base64
    script_dir = os.path.dirname(os.path.abspath(__file__))
    shelby_choice = random.choice(["SuccessShelby.png", "LearningShelby.png"])
    image_path = os.path.join(script_dir, "Resources", shelby_choice)
    shelby_html = ""
    if os.path.exists(image_path):
        ext = os.path.splitext(image_path)[1].lower()
        mime = "image/png" if ext == ".png" else "image/jpeg"
        with open(image_path, "rb") as img_file:
            img_b64 = base64.b64encode(img_file.read()).decode("utf-8")
        shelby_html = f'<img src="data:{mime};base64,{img_b64}" alt="Shelby" class="shelby-img">'
    else:
        # Fallback to any image in Resources/
        resources_dir = os.path.join(script_dir, "Resources")
        if os.path.isdir(resources_dir):
            for fname in os.listdir(resources_dir):
                if fname.lower().endswith((".png", ".jpg", ".jpeg")):
                    fallback = os.path.join(resources_dir, fname)
                    ext = os.path.splitext(fallback)[1].lower()
                    mime = "image/png" if ext == ".png" else "image/jpeg"
                    with open(fallback, "rb") as img_file:
                        img_b64 = base64.b64encode(img_file.read()).decode("utf-8")
                    shelby_html = f'<img src="data:{mime};base64,{img_b64}" alt="Shelby" class="shelby-img">'
                    break
        if not shelby_html:
            shelby_html = '<div class="trophy">🏆</div>'

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Certificate of Achievement</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;500&display=swap');

        * {{ margin: 0; padding: 0; box-sizing: border-box; }}

        body {{
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #0a1628 0%, #1a365d 100%);
            font-family: 'Inter', sans-serif;
            padding: 2rem;
        }}

        .certificate {{
            background: #fffdf7;
            border: 3px solid #c9a84c;
            border-radius: 12px;
            padding: 3rem;
            max-width: 700px;
            width: 100%;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3),
                        inset 0 0 0 6px #fffdf7,
                        inset 0 0 0 8px #c9a84c;
            position: relative;
        }}

        .certificate::before {{
            content: '';
            position: absolute;
            top: 12px; left: 12px; right: 12px; bottom: 12px;
            border: 1px solid #e8d5a3;
            border-radius: 6px;
            pointer-events: none;
        }}

        .header {{
            font-family: 'Playfair Display', serif;
            font-size: 2.2rem;
            color: #2c1810;
            margin-bottom: 0.3rem;
            letter-spacing: 2px;
        }}

        .subheader {{
            font-size: 0.9rem;
            color: #8b7355;
            text-transform: uppercase;
            letter-spacing: 3px;
            margin-bottom: 2rem;
        }}

        .shelby-img {{
            width: 180px;
            height: 180px;
            object-fit: cover;
            border-radius: 50%;
            border: 4px solid #c9a84c;
            margin-bottom: 1.5rem;
            box-shadow: 0 4px 15px rgba(0,0,0,0.15);
        }}

        .trophy {{
            font-size: 5rem;
            margin-bottom: 1.5rem;
            filter: drop-shadow(0 4px 8px rgba(0,0,0,0.15));
        }}

        .quiz-name {{
            font-size: 1.1rem;
            color: #5a4a3a;
            margin-bottom: 0.3rem;
        }}

        .score {{
            font-size: 2.5rem;
            font-weight: 700;
            color: #c9a84c;
            margin: 1rem 0;
        }}

        .message {{
            font-size: 1rem;
            color: #5a4a3a;
            font-style: italic;
            margin: 1.5rem 2rem;
            line-height: 1.6;
        }}

        .date {{
            font-size: 0.85rem;
            color: #8b7355;
            margin-top: 2rem;
        }}

        .footer {{
            margin-top: 1rem;
            font-size: 0.75rem;
            color: #b8a88a;
        }}
    </style>
</head>
<body>
    <div class="certificate">
        <div class="header">Certificate of Achievement</div>
        <div class="subheader">Study Topics</div>
        {shelby_html}
        <div class="quiz-name">Excellence demonstrated in</div>
        <div class="quiz-name"><strong>{topic}</strong></div>
        <div class="score">{score:.0f}%</div>
        <div class="message">"{message}"</div>
        <div class="date">{now}</div>
        <div class="footer">Awarded by your AI Study System</div>
    </div>
</body>
</html>"""

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html)

    return output_path


def main():
    if len(sys.argv) != 2:
        print("Usage: python grade_quiz.py <path-to-completed-quiz.md>")
        sys.exit(1)

    input_path = sys.argv[1]
    if not os.path.exists(input_path):
        print(f"Error: File not found: {input_path}")
        sys.exit(1)

    # Determine output path
    script_dir = os.path.dirname(os.path.abspath(__file__))
    results_dir = os.path.join(script_dir, "Results")
    os.makedirs(results_dir, exist_ok=True)

    base_name = os.path.splitext(os.path.basename(input_path))[0]
    output_path = os.path.join(results_dir, f"{base_name}_Results.md")

    # Parse, grade, report
    parsed = parse_quiz(input_path)

    if not parsed["answer_key"]:
        print("Error: Could not find an answer key in the quiz file.")
        print("Make sure the quiz has an Answer Key table with | Q# | Letter | Explanation | format.")
        sys.exit(1)

    graded = grade_quiz(parsed)
    generate_report(parsed, graded, output_path)

    # Generate certificate if score >= 90%
    cert_path = None
    if graded["score_pct"] >= 90:
        cert_filename = f"{base_name}_Certificate.html"
        cert_path = os.path.join(results_dir, cert_filename)
        generate_certificate(parsed, graded, cert_path)

    # Print summary to console
    print(f"\nQuiz: {parsed['title']}")
    print(f"Score: {graded['correct']}/{graded['total']} ({graded['score_pct']:.0f}%)")
    if graded["incorrect"]:
        print(f"Missed: {len(graded['incorrect'])} question(s)")
    if graded["unanswered"]:
        print(f"Unanswered: {len(graded['unanswered'])} question(s)")
    print(f"\nFull report saved to: {output_path}")
    if cert_path:
        print(f"🏆 Certificate saved to: {cert_path}")


if __name__ == "__main__":
    main()
