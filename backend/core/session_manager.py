"""
In-memory session store.
Each interview gets a unique session_id.
Stores all state: questions, answers, scores, history.
"""

import uuid
from typing import Optional
from models.schemas import Difficulty


# Global in-memory store  {session_id: session_dict}
_sessions: dict = {}


def create_session(
    candidate_profile: dict,
    questions: list,
) -> str:
    """Create a new interview session, return its session_id."""
    session_id = str(uuid.uuid4())
    _sessions[session_id] = {
        "session_id": session_id,
        "candidate_profile": candidate_profile,
        "questions": questions,
        "current_index": 0,
        "conversation_history": [],
        "answers": [],
        "scores": [],
        "evaluations": [],
        "difficulty": Difficulty.medium,
        "status": "active",
        "awaiting_followup": False,
        "followup_question": None,
    }
    return session_id


def get_session(session_id: str) -> Optional[dict]:
    """Retrieve a session by ID. Returns None if not found."""
    return _sessions.get(session_id)


def update_session(session_id: str, updates: dict) -> None:
    """Merge updates dict into an existing session."""
    if session_id in _sessions:
        _sessions[session_id].update(updates)


def end_session(session_id: str) -> None:
    """Mark a session as completed."""
    if session_id in _sessions:
        _sessions[session_id]["status"] = "completed"


def delete_session(session_id: str) -> None:
    """Remove a session from memory."""
    _sessions.pop(session_id, None)


def list_sessions() -> list:
    """Return all session IDs (for debugging)."""
    return list(_sessions.keys())