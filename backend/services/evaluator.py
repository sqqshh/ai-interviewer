"""
Evaluates candidate answers, scores them, and decides
what difficulty the next question should be.
"""

from typing import List
from services.llm_service import chat_json
from models.schemas import Difficulty


async def evaluate_answer(
    question: dict,
    answer: str,
    conversation_history: List[dict],
) -> dict:
    """
    Evaluate a candidate's answer to a question.
    Returns: score (1-10), feedback, needs_followup, follow_up_question
    """

    ideal_points = "\n".join(
        f"  - {p}" for p in question.get("ideal_answer_points", [])
    )

    messages = [
        {
            "role": "system",
            "content": (
                "You are a strict but fair AI/ML interviewer evaluating a candidate. "
                "Be honest and constructive. Always respond with valid JSON only."
            ),
        },
        {
            "role": "user",
            "content": f"""
Evaluate this interview answer.

QUESTION: {question['text']}
CATEGORY: {question['category']}
DIFFICULTY: {question['difficulty']}

IDEAL ANSWER SHOULD COVER:
{ideal_points}

CANDIDATE'S ANSWER:
{answer}

Score and evaluate honestly. Return this JSON:
{{
  "score": <float 1.0 to 10.0>,
  "feedback": "2-3 sentences of specific, constructive feedback mentioning what was good and what was missing",
  "needs_followup": <true if answer was vague/incomplete and a follow-up would help>,
  "follow_up_question": "a targeted follow-up question or null",
  "key_concepts_covered": ["concepts the candidate demonstrated"],
  "key_concepts_missed": ["important concepts not mentioned"]
}}
""",
        },
    ]

    result = await chat_json(messages)
    return result


def adapt_difficulty(
    current_difficulty: Difficulty,
    recent_scores: List[float],
) -> Difficulty:
    """
    Adapt next question difficulty based on recent performance.
    Uses last 2 scores to decide.
    """
    if len(recent_scores) < 2:
        return current_difficulty

    avg = sum(recent_scores[-2:]) / 2

    if avg >= 7.5 and current_difficulty != Difficulty.hard:
        # Doing well → increase difficulty
        if current_difficulty == Difficulty.easy:
            return Difficulty.medium
        return Difficulty.hard

    elif avg <= 4.0 and current_difficulty != Difficulty.easy:
        # Struggling → decrease difficulty
        if current_difficulty == Difficulty.hard:
            return Difficulty.medium
        return Difficulty.easy

    return current_difficulty


async def generate_final_report(
    questions: List[dict],
    answers: List[str],
    scores: List[float],
    evaluations: List[dict],
    candidate_name: str,
    session_id: str,
) -> dict:
    """
    Generate a comprehensive final feedback report.
    """
    # Build Q&A summary for the LLM
    qa_summary = ""
    for i, (q, a, s, e) in enumerate(
        zip(questions, answers, scores, evaluations), 1
    ):
        qa_summary += f"""
Q{i} [{q['category']} | {q['difficulty']}]: {q['text']}
Answer: {a[:300]}...
Score: {s}/10
Feedback: {e.get('feedback', '')}
"""

    messages = [
        {
            "role": "system",
            "content": (
                "You are a senior technical hiring manager writing a candidate evaluation report. "
                "Be honest, specific, and actionable. Always respond with valid JSON only."
            ),
        },
        {
            "role": "user",
            "content": f"""
Write a comprehensive interview evaluation report.

CANDIDATE: {candidate_name or "Candidate"}
OVERALL AVERAGE SCORE: {sum(scores)/len(scores):.1f}/10

INTERVIEW TRANSCRIPT SUMMARY:
{qa_summary}

Return this JSON:
{{
  "strengths": ["3-5 specific strengths demonstrated"],
  "improvement_areas": ["3-5 specific areas to improve"],
  "hire_recommendation": "Strong Yes | Yes | Maybe | No",
  "detailed_feedback": "3-4 paragraph detailed assessment covering technical depth, communication, problem-solving approach",
  "skill_scores": {{
    "ML Theory": <score 1-10>,
    "Coding & Implementation": <score 1-10>,
    "System Design": <score 1-10>,
    "Communication": <score 1-10>,
    "Problem Solving": <score 1-10>
  }}
}}
""",
        },
    ]

    result = await chat_json(messages, max_tokens=2000)
    return result