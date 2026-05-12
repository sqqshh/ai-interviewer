from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from services.parser_service import (
    extract_text_from_pdf,
    fetch_github_summary,
    build_candidate_profile,
)
from services.question_gen import generate_question_bank
from core.db_session_manager import create_session
from core.database import get_db

router = APIRouter()


@router.post("/setup")
async def setup_interview(
    resume: UploadFile = File(...),
    job_description: str = Form(...),
    github_username: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
):
    if not resume.filename.endswith(".pdf"):
        raise HTTPException(400, "Only PDF resumes are supported.")

    file_bytes = await resume.read()
    if len(file_bytes) > 5 * 1024 * 1024:
        raise HTTPException(400, "Resume file too large (max 5MB).")

    try:
        resume_text = extract_text_from_pdf(file_bytes)
    except Exception as e:
        raise HTTPException(500, f"Failed to parse PDF: {e}")

    if len(resume_text) < 100:
        raise HTTPException(400, "Could not extract text from PDF.")

    github_summary = ""
    if github_username:
        try:
            github_summary = await fetch_github_summary(github_username.strip())
        except Exception:
            github_summary = ""

    try:
        profile_data = await build_candidate_profile(
            resume_text=resume_text,
            job_description=job_description,
            github_summary=github_summary,
        )
    except Exception as e:
        raise HTTPException(500, f"Failed to analyze resume: {e}")

    candidate_profile = {
        "name": profile_data.get("name"),
        "resume_text": resume_text,
        "github_summary": github_summary,
        "job_description": job_description,
        "skills_detected": profile_data.get("skills_detected", []),
        "projects_detected": profile_data.get("projects_detected", []),
        "experience_level": profile_data.get("experience_level", "mid"),
        "summary": profile_data.get("summary", ""),
    }

    try:
        questions = await generate_question_bank(
            resume_text=resume_text,
            job_description=job_description,
            github_summary=github_summary,
            skills=candidate_profile["skills_detected"],
            projects=candidate_profile["projects_detected"],
            experience_level=candidate_profile["experience_level"],
            num_questions=10,
        )
    except Exception as e:
        raise HTTPException(500, f"Failed to generate questions: {e}")

    if not questions:
        raise HTTPException(500, "No questions generated. Please try again.")

    session_id = await create_session(
        db=db,
        candidate_profile=candidate_profile,
        questions=questions,
    )

    return {
        "session_id": session_id,
        "candidate_name": candidate_profile["name"],
        "skills_detected": candidate_profile["skills_detected"],
        "projects_detected": candidate_profile["projects_detected"],
        "experience_level": candidate_profile["experience_level"],
        "summary": candidate_profile["summary"],
        "total_questions": len(questions),
        "message": "Profile analyzed. Ready to start interview.",
    }