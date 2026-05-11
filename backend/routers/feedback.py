"""
GET /api/report/{session_id}
Generates and returns the full interview feedback report.
"""

from fastapi import APIRouter, HTTPException
from services.evaluator import generate_final_report
from core.session_manager import get_session

router = APIRouter()


@router.get("/report/{session_id}")
async def get_report(session_id: str):
    session = get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found.")

    scores = session["scores"]
    if not scores:
        raise HTTPException(400, "No answers recorded yet.")

    questions_answered = session["questions"][:len(scores)]
    candidate_name = session["candidate_profile"].get("name", "Candidate")

    # Generate LLM report
    report_data = await generate_final_report(
        questions=questions_answered,
        answers=session["answers"],
        scores=scores,
        evaluations=session["evaluations"],
        candidate_name=candidate_name,
        session_id=session_id,
    )

    overall_score = round(sum(scores) / len(scores), 1)

    # Per-question breakdown
    breakdown = []
    for i, (q, a, s, e) in enumerate(
        zip(questions_answered, session["answers"], scores, session["evaluations"]), 1
    ):
        breakdown.append({
            "question_number": i,
            "question": q["text"],
            "category": q["category"],
            "difficulty": q["difficulty"],
            "answer_preview": a[:200] + "..." if len(a) > 200 else a,
            "score": s,
            "feedback": e.get("feedback", ""),
            "concepts_covered": e.get("key_concepts_covered", []),
            "concepts_missed": e.get("key_concepts_missed", []),
        })

    return {
        "session_id": session_id,
        "candidate_name": candidate_name,
        "overall_score": overall_score,
        "total_questions": len(session["questions"]),
        "questions_answered": len(scores),
        "per_question_breakdown": breakdown,
        "strengths": report_data.get("strengths", []),
        "improvement_areas": report_data.get("improvement_areas", []),
        "hire_recommendation": report_data.get("hire_recommendation", "Maybe"),
        "detailed_feedback": report_data.get("detailed_feedback", ""),
        "skill_scores": report_data.get("skill_scores", {}),
    }