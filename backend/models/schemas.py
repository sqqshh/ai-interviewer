from pydantic import BaseModel
from typing import Optional, List
from enum import Enum


class Difficulty(str, Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"


class QuestionCategory(str, Enum):
    conceptual = "conceptual"
    coding = "coding"
    behavioral = "behavioral"
    project_based = "project_based"
    system_design = "system_design"


class CandidateProfile(BaseModel):
    name: Optional[str]
    resume_text: str
    github_summary: Optional[str]
    job_description: str
    skills_detected: List[str] = []
    projects_detected: List[str] = []

    class Config:
        use_enum_values = True


class StartInterviewResponse(BaseModel):
    session_id: str
    first_question: str
    question_number: int
    total_questions: int
    category: str
    difficulty: str
    message: str


class AnswerRequest(BaseModel):
    session_id: str
    answer: str


class AnswerResponse(BaseModel):
    evaluation: str
    score: float
    next_question: Optional[str]
    question_number: Optional[int]
    total_questions: Optional[int]
    category: Optional[str]
    difficulty: str
    interview_complete: bool
    follow_up: Optional[str]


class FeedbackReport(BaseModel):
    session_id: str
    candidate_name: Optional[str]
    overall_score: float
    total_questions: int
    questions_answered: int
    per_question_breakdown: List[dict]
    strengths: List[str]
    improvement_areas: List[str]
    hire_recommendation: str
    detailed_feedback: str
    skill_scores: dict