"""
Generates a personalized bank of interview questions
based on the candidate's profile and the job description.
"""

from typing import List
from services.llm_service import chat_json


async def generate_question_bank(
    resume_text: str,
    job_description: str,
    github_summary: str,
    skills: List[str],
    projects: List[str],
    experience_level: str = "mid",
    num_questions: int = 10,
) -> List[dict]:
    """
    Generate a list of personalized interview questions.
    Each question has: text, category, difficulty, ideal_answer_points
    """

    github_section = f"\nGitHub:\n{github_summary}" if github_summary else ""

    messages = [
        {
            "role": "system",
            "content": (
                "You are a senior AI/ML interviewer. "
                "Generate challenging, personalized interview questions. "
                "Always respond with valid JSON only."
            ),
        },
        {
            "role": "user",
            "content": f"""
Create {num_questions} interview questions for an AI/ML role candidate.

CANDIDATE RESUME SUMMARY:
{resume_text[:2000]}
{github_section}

JOB DESCRIPTION:
{job_description[:1500]}

DETECTED SKILLS: {", ".join(skills)}
DETECTED PROJECTS: {", ".join(projects)}
EXPERIENCE LEVEL: {experience_level}

Rules:
- Make questions SPECIFIC to this candidate's background (mention their actual projects/skills)
- Mix categories: conceptual ML theory, coding/implementation, behavioral, system design
- Start with medium difficulty, include some easy and some hard
- For projects listed, ask deep follow-up questions about design decisions

Return a JSON object with this structure:
{{
  "questions": [
    {{
      "id": 1,
      "text": "the interview question",
      "category": "conceptual | coding | behavioral | project_based | system_design",
      "difficulty": "easy | medium | hard",
      "topic": "e.g. Transformers, Gradient Descent, etc.",
      "ideal_answer_points": ["key point 1", "key point 2", "key point 3"]
    }}
  ]
}}
""",
        },
    ]

    result = await chat_json(messages, max_tokens=3000)
    questions = result.get("questions", [])
    return questions