"""
db_session_manager.py
Database-backed session management.
Same interface as the old in-memory session_manager.py.
"""

import uuid
import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from core.models import InterviewSession
from models.schemas import Difficulty


async def create_session(
    db: AsyncSession,
    candidate_profile: dict,
    questions: list,
) -> str:
    session_id = str(uuid.uuid4())

    session = InterviewSession(id=session_id)
    session.set_profile(candidate_profile)
    session.set_questions(questions)
    session.difficulty = Difficulty.medium.value

    db.add(session)
    await db.commit()
    await db.refresh(session)

    return session_id


async def get_session(db: AsyncSession, session_id: str) -> dict | None:
    result = await db.execute(
        select(InterviewSession).where(InterviewSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        return None
    return session.to_dict()


async def update_session(db: AsyncSession, session_id: str, updates: dict):
    result = await db.execute(
        select(InterviewSession).where(InterviewSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        return

    # Map update keys to ORM fields
    field_map = {
        "current_index": "current_index",
        "status": "status",
        "difficulty": "difficulty",
        "awaiting_followup": "awaiting_followup",
        "followup_question": "followup_question",
    }
    json_map = {
        "conversation_history": session.set_history,
        "answers": session.set_answers,
        "scores": session.set_scores,
        "evaluations": session.set_evaluations,
        "questions": session.set_questions,
        "candidate_profile": session.set_profile,
    }

    for key, value in updates.items():
        if key in field_map:
            # Handle Difficulty enum
            if key == "difficulty" and hasattr(value, "value"):
                value = value.value
            setattr(session, field_map[key], value)
        elif key in json_map:
            json_map[key](value)

    await db.commit()


async def end_session(db: AsyncSession, session_id: str):
    await update_session(db, session_id, {"status": "completed"})