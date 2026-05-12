# AI Interview Platform

A production-style AI-powered interview platform specialized for **AI/ML roles**. It reads your resume, GitHub profile, and a job description — then conducts a fully personalized, adaptive interview with real-time scoring and feedback. Supports both text and voice interaction.

Built with FastAPI + React + Groq (free LLaMA3-70b + Whisper inference). Deployed on Render + Vercel.

**Live Demo:** [ai-interviewer-dusky-one.vercel.app](https://ai-interviewer-dusky-one.vercel.app)

---

## Features

- **Resume Parsing** — Extracts skills, projects, and experience from your PDF resume
- **GitHub Analysis** — Fetches your public repos to personalize questions
- **Personalized Questions** — 10 questions tailored to YOUR background, not generic ones
- **Adaptive Difficulty** — Gets harder when you do well, easier when you struggle
- **Dynamic Follow-ups** — Asks follow-up questions if your answer is incomplete
- **Real-time Scoring** — Each answer scored 1-10 with concepts covered/missed
- **Voice Mode** — Speak your answers via Groq Whisper STT; questions read aloud via browser TTS
- **Text Mode** — Full text input always available; auto-suggested for coding questions
- **Full Report** — Skill breakdown, strengths, improvement areas, hire recommendation
- **PDF Export** — Download your interview report as a styled dark-theme PDF
- **Persistent Sessions** — PostgreSQL-backed sessions survive server restarts
- **Fully Containerized** — Run everything with a single `docker-compose up`
- **Fast** — Powered by Groq's ultra-fast LLaMA3-70b inference (free tier)

---

## Architecture

```text
┌─────────────────────────────────────────┐
│        Frontend (React + Vite)           │
│  Setup Page → Interview Chat → Report   │
│  Deployed on Vercel                     │
└────────────────┬────────────────────────┘
                 │ HTTP/REST (axios)
┌────────────────▼────────────────────────┐
│           Backend (FastAPI)              │
│  /api/setup        → Parse + Profile    │
│  /api/interview/*  → Q&A + Evaluation   │
│  /api/transcribe   → Whisper STT        │
│  /api/report/{id}  → Final Report       │
│  Deployed on Render                     │
└────────────────┬────────────────────────┘
                 │
       ┌─────────┴──────────┐
       │                    │
┌──────▼───────┐   ┌────────▼────────┐
│  Groq API    │   │  PostgreSQL      │
│  LLaMA3-70b  │   │  (Render DB /   │
│  Whisper v3  │   │   SQLite local) │
└──────────────┘   └─────────────────┘
```

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **LLM** | Groq + LLaMA3-70b-versatile | Free tier, ultra-fast inference |
| **STT** | Groq Whisper large-v3 | Free tier, accurate speech-to-text |
| **TTS** | Browser SpeechSynthesis API | Free, built-in, no extra API needed |
| **Backend** | FastAPI (Python 3.11) | Async, fast, auto Swagger docs |
| **Frontend** | React + Vite | Fast dev, component-based UI |
| **Database** | PostgreSQL (prod) / SQLite (local) | Persistent sessions via SQLAlchemy |
| **ORM** | SQLAlchemy 2.0 (async) | Type-safe, async DB access |
| **PDF Parsing** | pdfplumber | Reliable text extraction |
| **PDF Export** | jsPDF | Client-side dark-themed PDF generation |
| **GitHub Data** | GitHub REST API | No auth needed for public profiles |
| **HTTP Client** | httpx (backend), axios (frontend) | Async-friendly |
| **Containerization** | Docker + docker-compose | One-command full stack setup |
| **Reverse Proxy** | Nginx (in Docker) | Serves React + proxies API calls |
| **Backend Deploy** | Render (free tier) | Auto-deploy from GitHub |
| **Frontend Deploy** | Vercel (free tier) | Auto-deploy from GitHub |
| **Routing** | react-router-dom | Client-side navigation |
| **Notifications** | react-hot-toast | Clean toast alerts |
| **Icons** | lucide-react | Lightweight icon set |

---

## Project Structure

```text
ai-interviewer/
├── docker-compose.yml           # Runs all 3 containers: db + backend + frontend
├── .env                         # Root env for docker-compose (GROQ_API_KEY)
│
├── backend/
│   ├── main.py                  # FastAPI app, CORS, lifespan, router registration
│   ├── Dockerfile               # Python 3.11-slim, installs deps, runs uvicorn
│   ├── requirements.txt
│   ├── .env                     # Local env (GROQ_API_KEY, DATABASE_URL)
│   ├── routers/
│   │   ├── context.py           # POST /api/setup
│   │   ├── interview.py         # POST /api/interview/start|answer|end
│   │   ├── feedback.py          # GET  /api/report/{session_id}
│   │   └── transcribe.py        # POST /api/transcribe (Whisper STT)
│   ├── services/
│   │   ├── llm_service.py       # Groq API wrapper (chat + chat_json)
│   │   ├── parser_service.py    # PDF extraction + GitHub fetching
│   │   ├── question_gen.py      # Personalized question bank generator
│   │   ├── evaluator.py         # Answer scoring + final report generation
│   │   └── transcribe_service.py# Groq Whisper audio transcription
│   ├── models/
│   │   └── schemas.py           # Pydantic data models
│   └── core/
│       ├── database.py          # SQLAlchemy async engine + session factory
│       ├── models.py            # ORM table definitions (InterviewSession)
│       └── db_session_manager.py# DB-backed session CRUD operations
│
└── frontend/
    ├── Dockerfile               # Node 20 builder + nginx:alpine production
    ├── nginx.conf               # Serves React, proxies /api/ to backend
    ├── .env.docker              # VITE_API_URL=/api for Docker builds
    ├── index.html
    ├── package.json
    └── src/
        ├── App.jsx              # Router setup
        ├── main.jsx             # React entry point
        ├── index.css            # Global dark theme styles
        ├── api/
        │   └── client.js        # Axios instance (reads VITE_API_URL)
        ├── hooks/
        │   └── useVoice.js      # MediaRecorder + Whisper + SpeechSynthesis hook
        ├── pages/
        │   ├── Setup.jsx        # Resume upload + JD + GitHub input
        │   ├── Interview.jsx    # Live chat UI with voice/text toggle
        │   └── Report.jsx       # Score + feedback + PDF download
        └── utils/
            └── exportPDF.js     # jsPDF dark-themed report generator
```

---

## Running Locally

### Option A — Docker (recommended, zero setup)

**Prerequisites:** [Docker Desktop](https://www.docker.com/products/docker-desktop/)

```bash
git clone https://github.com/sqqshh/AI-Interviewer.git
cd AI-Interviewer
```

Create a root `.env` file:
```bash
# Windows PowerShell
New-Item .env -ItemType File

# Mac/Linux
touch .env
```

Add your Groq key:
```text
GROQ_API_KEY=your_groq_api_key_here
```

Start everything:
```bash
docker-compose up --build
```

- Frontend → `http://localhost`
- Backend → `http://localhost:8000`
- Swagger → `http://localhost:8000/docs`

Stop:
```bash
docker-compose down
```

---

### Option B — Manual (dev mode with hot reload)

**Prerequisites:**
- Python 3.11+ ([download](https://www.python.org/downloads/release/python-3119/))
- Node.js 20+ ([download](https://nodejs.org/))
- A free Groq API key ([get one here](https://console.groq.com))

#### 1. Clone the repo

```bash
git clone https://github.com/sqqshh/AI-Interviewer.git
cd AI-Interviewer
```

#### 2. Backend setup

```bash
cd backend
```

Create and activate a virtual environment:

```bash
# Windows (PowerShell)
python -m venv venv
venv\Scripts\Activate.ps1

# Mac/Linux
python3 -m venv venv
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create `backend\.env`:

```text
GROQ_API_KEY=your_groq_api_key_here
```

Start the backend (uses SQLite locally — no DB setup needed):

```bash
uvicorn main:app --reload --port 8000
```

Backend → `http://localhost:8000`
Swagger → `http://localhost:8000/docs`

#### 3. Frontend setup

Open a **new terminal**:

```bash
cd frontend
npm install
npm run dev
```

Frontend → `http://localhost:5173`

#### 4. Using the platform

1. Open `http://localhost:5173`
2. Upload your **PDF resume**
3. Enter a **GitHub username** (optional but recommended)
4. Paste the **job description** you're interviewing for
5. Click **Start Interview**
6. Answer by **voice** (click mic) or **text** (toggle to text mode)
7. Click **End & Report** to see your full evaluation
8. Click **Download PDF Report** to save your results

---

## Getting a Free Groq API Key

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up for a free account
3. Click **API Keys** → **Create API Key**
4. Copy the key and paste it in `backend/.env`

Free tier: ~14,400 LLM requests/day + Whisper transcription. More than enough.

---

## Interview Flow

```text
Upload Resume + JD + GitHub
         ↓
   LLM analyzes profile,
   extracts skills & projects
         ↓
   Generates 10 personalized
   questions (mixed categories)
         ↓
   ┌─── Interview Loop ──────────────┐
   │  Ask question (spoken aloud)    │
   │  Candidate answers:             │
   │    Voice → Whisper → text   │
   │    Text → direct submit    │
   │  LLM evaluates 1-10            │
   │  Score < 4 → easier next       │
   │  Score > 7 → harder next       │
   │  Weak answer → follow-up asked │
   └─────────────────────────────────┘
         ↓
   Final Report:
   - Overall score
   - Skill breakdown (5 dimensions)
   - Strengths & improvement areas
   - Hire recommendation
   - Per-question feedback
   - Downloadable as PDF
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/setup` | Upload resume, JD, GitHub → create session |
| `POST` | `/api/interview/start` | Get first question |
| `POST` | `/api/interview/answer` | Submit answer → evaluation + next question |
| `POST` | `/api/interview/end` | End interview early |
| `GET`  | `/api/report/{session_id}` | Get full feedback report |
| `POST` | `/api/transcribe` | Upload audio → Whisper transcript |

Full interactive docs: `http://localhost:8000/docs`
Production docs: `https://ai-interviewer-backend-apm4.onrender.com/docs`

---

## Roadmap

- [x] Voice mode (Whisper STT + browser TTS)
- [x] Export report as PDF
- [x] PostgreSQL session persistence
- [x] Docker + docker-compose
- [x] Deploy to Render + Vercel
- [ ] Multi-role support (Data Scientist, MLOps, Research)
- [ ] Company-specific interview styles

---

## Acknowledgements

- [Groq](https://groq.com) for free ultra-fast LLM + Whisper inference
- [Meta LLaMA3](https://ai.meta.com/llama/) for the underlying model
- [OpenAI Whisper](https://openai.com/research/whisper) for the speech recognition model
- [FastAPI](https://fastapi.tiangolo.com/) for the excellent Python web framework
- [Render](https://render.com) for free backend + PostgreSQL hosting
- [Vercel](https://vercel.com) for free frontend hosting