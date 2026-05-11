"""
Handles:
  - PDF resume text extraction
  - GitHub public profile + repo fetching
  - Building structured CandidateProfile using LLM
"""

import httpx
import pdfplumber
import io
from typing import Optional

from services.llm_service import chat_json


# ── PDF Resume Parser ────────────────────────────────────────────

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract all text from a PDF file given its raw bytes."""
    text = ""
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text.strip()


# ── GitHub Fetcher ───────────────────────────────────────────────

async def fetch_github_summary(username: str) -> str:
    """
    Fetch public GitHub profile + top repos for a username.
    No API key needed for public profiles (60 req/hour limit).
    """
    if not username:
        return ""

    headers = {"Accept": "application/vnd.github+json"}
    base = "https://api.github.com"

    async with httpx.AsyncClient(timeout=15) as client:
        # Get profile
        profile_resp = await client.get(f"{base}/users/{username}", headers=headers)
        if profile_resp.status_code != 200:
            return f"GitHub user '{username}' not found or inaccessible."
        profile = profile_resp.json()

        # Get top 6 repos sorted by stars
        repos_resp = await client.get(
            f"{base}/users/{username}/repos",
            headers=headers,
            params={"sort": "stars", "per_page": 6},
        )
        repos = repos_resp.json() if repos_resp.status_code == 200 else []

    # Build a readable summary string
    bio = profile.get("bio") or "No bio"
    summary_lines = [
        f"GitHub Username: {username}",
        f"Name: {profile.get('name', 'N/A')}",
        f"Bio: {bio}",
        f"Public Repos: {profile.get('public_repos', 0)}",
        f"Followers: {profile.get('followers', 0)}",
        "",
        "Top Repositories:",
    ]

    for repo in repos:
        if isinstance(repo, dict):
            lang = repo.get("language") or "Unknown"
            stars = repo.get("stargazers_count", 0)
            desc = repo.get("description") or "No description"
            summary_lines.append(
                f"  - {repo['name']} [{lang}] ⭐{stars}: {desc}"
            )

    return "\n".join(summary_lines)


# ── Candidate Profile Builder ────────────────────────────────────

async def build_candidate_profile(
    resume_text: str,
    job_description: str,
    github_summary: Optional[str] = None,
) -> dict:
    """
    Use LLM to extract structured info from raw resume text.
    Returns a dict with: name, skills_detected, projects_detected.
    """
    github_section = (
        f"\n\nGitHub Profile:\n{github_summary}" if github_summary else ""
    )

    messages = [
        {
            "role": "system",
            "content": (
                "You are a technical recruiter assistant. "
                "Extract structured information from the candidate's resume. "
                "Always respond with valid JSON only."
            ),
        },
        {
            "role": "user",
            "content": f"""
Analyze this resume and extract structured information.

RESUME:
{resume_text}
{github_section}

JOB DESCRIPTION:
{job_description}

Return a JSON object with exactly these fields:
{{
  "name": "candidate full name or null",
  "skills_detected": ["list", "of", "technical", "skills"],
  "projects_detected": ["list", "of", "project names or descriptions"],
  "experience_level": "fresher | junior | mid | senior",
  "summary": "2-3 sentence summary of the candidate"
}}
""",
        },
    ]

    result = await chat_json(messages)
    return result