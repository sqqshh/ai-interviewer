"""
models.py
SQLAlchemy ORM table definitions.
"""

import json
from datetime import datetime
from sqlalchemy import String, Float, Integer, Text, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column
from core.database import Base


class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    status: Mapped[str] = mapped_column(String(20), default="active")
    difficulty: Mapped[str] = mapped_column(String(10), default="medium")
    current_index: Mapped[int] = mapped_column(Integer, default=0)
    awaiting_followup: Mapped[bool] = mapped_column(default=False)
    followup_question: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Store complex objects as JSON text
    candidate_profile: Mapped[str] = mapped_column(Text, default="{}")
    questions: Mapped[str] = mapped_column(Text, default="[]")
    conversation_history: Mapped[str] = mapped_column(Text, default="[]")
    answers: Mapped[str] = mapped_column(Text, default="[]")
    scores: Mapped[str] = mapped_column(Text, default="[]")
    evaluations: Mapped[str] = mapped_column(Text, default="[]")

    # ── Helpers to work with JSON fields ──────────────────────

    def get_profile(self) -> dict:
        return json.loads(self.candidate_profile or "{}")

    def set_profile(self, data: dict):
        self.candidate_profile = json.dumps(data)

    def get_questions(self) -> list:
        return json.loads(self.questions or "[]")

    def set_questions(self, data: list):
        self.questions = json.dumps(data)

    def get_history(self) -> list:
        return json.loads(self.conversation_history or "[]")

    def set_history(self, data: list):
        self.conversation_history = json.dumps(data)

    def get_answers(self) -> list:
        return json.loads(self.answers or "[]")

    def set_answers(self, data: list):
        self.answers = json.dumps(data)

    def get_scores(self) -> list:
        return json.loads(self.scores or "[]")

    def set_scores(self, data: list):
        self.scores = json.dumps(data)

    def get_evaluations(self) -> list:
        return json.loads(self.evaluations or "[]")

    def set_evaluations(self, data: list):
        self.evaluations = json.dumps(data)

    def to_dict(self) -> dict:
        """Convert to the same dict format session_manager used."""
        return {
            "session_id": self.id,
            "status": self.status,
            "difficulty": self.difficulty,
            "current_index": self.current_index,
            "awaiting_followup": self.awaiting_followup,
            "followup_question": self.followup_question,
            "candidate_profile": self.get_profile(),
            "questions": self.get_questions(),
            "conversation_history": self.get_history(),
            "answers": self.get_answers(),
            "scores": self.get_scores(),
            "evaluations": self.get_evaluations(),
        }