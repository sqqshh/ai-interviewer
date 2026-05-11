"""
POST /api/interview/start   → returns first question
POST /api/interview/answer  → evaluate answer, return next question
POST /api/interview/end     → force-end and go to report
"""

from fastapi import APIRouter, HTTPException
from models.schemas import AnswerRequest, Difficulty
from services.evaluator import evaluate_answer, adapt_difficulty
from core.session_manager import get_session, update_session, end_session

router = APIRouter()


@router.post("/start")
async def start_interview(payload: dict):
    session_id = payload.get("session_id")
    session = get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found. Please run /api/setup first.")
    if session["status"] != "active":
        raise HTTPException(400, "Interview already completed.")

    first_q = session["questions"][0]

    # Add to conversation history
    history = session["conversation_history"]
    history.append({
        "role": "assistant",
        "content": f"Question 1: {first_q['text']}"
    })
    update_session(session_id, {"conversation_history": history})

    return {
        "session_id": session_id,
        "question_number": 1,
        "total_questions": len(session["questions"]),
        "question": first_q["text"],
        "category": first_q["category"],
        "difficulty": first_q["difficulty"],
        "topic": first_q.get("topic", ""),
        "message": f"Welcome! I'll be interviewing you today. Let's begin.",
    }


@router.post("/answer")
async def submit_answer(payload: AnswerRequest):
    session = get_session(payload.session_id)
    if not session:
        raise HTTPException(404, "Session not found.")
    if session["status"] != "active":
        raise HTTPException(400, "Interview already completed.")

    current_index = session["current_index"]
    questions = session["questions"]

    # Which question are we answering?
    if session["awaiting_followup"]:
        current_q = {
            "text": session["followup_question"],
            "category": questions[current_index]["category"],
            "difficulty": questions[current_index]["difficulty"],
            "ideal_answer_points": [],
        }
    else:
        current_q = questions[current_index]

    # Add candidate answer to history
    history = session["conversation_history"]
    history.append({"role": "user", "content": payload.answer})

    # Evaluate the answer
    evaluation = await evaluate_answer(
        question=current_q,
        answer=payload.answer,
        conversation_history=history,
    )

    score = float(evaluation.get("score", 5.0))
    feedback = evaluation.get("feedback", "")

    # Store results
    answers = session["answers"]
    scores = session["scores"]
    evaluations = session["evaluations"]

    answers.append(payload.answer)
    scores.append(score)
    evaluations.append(evaluation)

    # Add evaluation to history
    history.append({"role": "assistant", "content": f"Feedback: {feedback}"})

    # Adapt difficulty
    new_difficulty = adapt_difficulty(session["difficulty"], scores)

    # Decide: follow-up or next question?
    needs_followup = evaluation.get("needs_followup", False) and not session["awaiting_followup"]
    followup_q = evaluation.get("follow_up_question")

    # Move to next main question (skip followup if already did one)
    if session["awaiting_followup"]:
        next_index = current_index + 1
        awaiting_followup = False
        followup_question = None
    elif needs_followup and followup_q:
        next_index = current_index  # stay on same index
        awaiting_followup = True
        followup_question = followup_q
    else:
        next_index = current_index + 1
        awaiting_followup = False
        followup_question = None

    # Check if interview is done
    interview_complete = next_index >= len(questions)

    # Build next question data
    next_q_text = None
    next_category = None
    next_difficulty_str = new_difficulty.value

    if awaiting_followup:
        next_q_text = followup_q
        next_category = current_q["category"]
    elif not interview_complete:
        next_q = questions[next_index]
        next_q_text = next_q["text"]
        next_category = next_q["category"]
        next_difficulty_str = next_q.get("difficulty", new_difficulty.value)

    # Add next question to history
    if next_q_text:
        history.append({"role": "assistant", "content": next_q_text})

    # Persist updates
    update_session(payload.session_id, {
        "current_index": next_index,
        "conversation_history": history,
        "answers": answers,
        "scores": scores,
        "evaluations": evaluations,
        "difficulty": new_difficulty,
        "awaiting_followup": awaiting_followup,
        "followup_question": followup_question,
        "status": "completed" if interview_complete else "active",
    })

    return {
        "evaluation": feedback,
        "score": score,
        "concepts_covered": evaluation.get("key_concepts_covered", []),
        "concepts_missed": evaluation.get("key_concepts_missed", []),
        "next_question": next_q_text,
        "question_number": next_index + 1 if not interview_complete else None,
        "total_questions": len(questions),
        "category": next_category,
        "difficulty": next_difficulty_str,
        "interview_complete": interview_complete,
        "is_followup": awaiting_followup,
    }


@router.post("/end")
async def end_interview(payload: dict):
    session_id = payload.get("session_id")
    session = get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found.")

    end_session(session_id)
    return {
        "message": "Interview ended. Generating your report...",
        "session_id": session_id,
        "questions_answered": len(session["scores"]),
    }