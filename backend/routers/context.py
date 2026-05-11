"""
POST /api/setup
Accepts resume PDF + job description + optional GitHub username.
Parses everything, builds candidate profile, generates question bank,
creates interview session. Returns session_id.
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional

from services.parser_service import (
    extract_text_from_pdf,
    fetch_github_summary,
    build_candidate_profile,
)
from services.question_gen import generate_question_bank
from core.session_manager import create_session

router = APIRouter()


@router.post("/setup")
async def setup_interview(
    resume: UploadFile = File(...),
    job_description: str = Form(...),
    github_username: Optional[str] = Form(None),
):
    # 1. Read and validate the uploaded file
    if not resume.filename.endswith(".pdf"):
        raise HTTPException(400, "Only PDF resumes are supported.")

    file_bytes = await resume.read()
    if len(file_bytes) > 5 * 1024 * 1024:  # 5 MB limit
        raise HTTPException(400, "Resume file too large (max 5MB).")

    # 2. Extract text from PDF
    try:
        resume_text = extract_text_from_pdf(file_bytes)
    except Exception as e:
        raise HTTPException(500, f"Failed to parse PDF: {e}")

    if len(resume_text) < 100:
        raise HTTPException(400, "Could not extract text from PDF. Is it a scanned image?")

    # 3. Fetch GitHub summary (optional)
    github_summary = ""
    if github_username:
        try:
            github_summary = await fetch_github_summary(github_username.strip())
        except Exception:
            github_summary = ""  # non-fatal, continue without it

    # 4. Build structured candidate profile via LLM
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

    # 5. Generate personalized question bank
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
        raise HTTPException(500, "No questions were generated. Please try again.")

    # 6. Create session
    session_id = create_session(
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
        "message": "Profile analyzed successfully. Ready to start interview.",
    }