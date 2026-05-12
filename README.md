# AI Interview Platform

A production-style AI-powered interview platform specialized for **AI/ML roles**. It reads your resume, GitHub profile, and a job description — then conducts a fully personalized, adaptive interview with real-time scoring and feedback.

Built with FastAPI + React + Groq (free LLaMA3-70b inference).

---

## Features

- **Resume Parsing** — Extracts skills, projects, and experience from your PDF resume
- **GitHub Analysis** — Fetches your public repos to personalize questions
- **Personalized Questions** — 10 questions tailored to YOUR background, not generic ones
- **Adaptive Difficulty** — Gets harder when you do well, easier when you struggle
- **Dynamic Follow-ups** — Asks follow-up questions if your answer is incomplete
- **Real-time Scoring** — Each answer scored 1-10 with concepts covered/missed
- **Full Report** — Skill breakdown, strengths, improvement areas, hire recommendation
- **Fast** — Powered by Groq's ultra-fast LLaMA3-70b inference (free tier)

---

## Architecture

```text
┌─────────────────────────────────────────┐
│           Frontend (React + Vite)        │
│  Setup Page → Interview Chat → Report   │
└────────────────┬────────────────────────┘
│ HTTP/REST (axios)
┌────────────────▼────────────────────────┐
│           Backend (FastAPI)              │
│  /api/setup        → Parse + Profile    │
│  /api/interview/*  → Q&A + Evaluation   │
│  /api/report/{id}  → Final Report       │
└────────────────┬────────────────────────┘
│
┌────────────────▼────────────────────────┐
│         Groq API (Free Tier)             │
│      LLaMA3-70b-versatile model         │
└─────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **LLM** | Groq + LLaMA3-70b | Free tier, ultra-fast inference |
| **Backend** | FastAPI (Python) | Async, fast, auto Swagger docs |
| **Frontend** | React + Vite | Fast dev, component-based UI |
| **PDF Parsing** | pdfplumber | Reliable text extraction |
| **GitHub Data** | GitHub REST API | No auth needed for public profiles |
| **HTTP Client** | httpx (backend), axios (frontend) | Async-friendly |
| **Session Store** | In-memory (Python dict) | Simple, no DB needed for now |
| **Routing** | react-router-dom | Client-side navigation |
| **Notifications** | react-hot-toast | Clean toast alerts |
| **Icons** | lucide-react | Lightweight icon set |

---

## Project Structure

```text
ai-interviewer/
├── backend/
│   ├── main.py                  # FastAPI app, CORS, router registration
│   ├── routers/
│   │   ├── context.py           # POST /api/setup
│   │   ├── interview.py         # POST /api/interview/start|answer|end
│   │   └── feedback.py          # GET  /api/report/{session_id}
│   ├── services/
│   │   ├── llm_service.py       # Groq API wrapper (chat + chat_json)
│   │   ├── parser_service.py    # PDF extraction + GitHub fetching
│   │   ├── question_gen.py      # Personalized question bank generator
│   │   └── evaluator.py         # Answer scoring + report generation
│   ├── models/
│   │   └── schemas.py           # Pydantic data models
│   ├── core/
│   │   └── session_manager.py   # In-memory interview session store
│   ├── requirements.txt
│   └── .env                     # ← your GROQ_API_KEY goes here (not committed)
└── frontend/
├── src/
│   ├── pages/
│   │   ├── Setup.jsx        # Resume upload + JD + GitHub input
│   │   ├── Interview.jsx    # Live chat interview interface
│   │   └── Report.jsx       # Final score + feedback report
│   ├── api/
│   │   └── client.js        # Axios instance pointing to backend
│   ├── App.jsx              # Router setup
│   ├── main.jsx             # React entry point
│   └── index.css            # Global dark theme styles
├── index.html
└── package.json
```

---

## Running Locally

### Prerequisites

- Python 3.11+ ([download](https://www.python.org/downloads/release/python-3119/))
- Node.js 18+ ([download](https://nodejs.org/))
- A free Groq API key ([get one here](https://console.groq.com))

---

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/ai-interviewer.git
cd ai-interviewer
```

---

### 2. Backend Setup

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

Create your `.env` file:

```bash
# Windows PowerShell
New-Item .env -ItemType File

# Mac/Linux
touch .env
```

Add your Groq API key inside `.env`:

```text
GROQ_API_KEY=your_groq_api_key_here
```

Start the backend:

```bash
uvicorn main:app --reload --port 8000
```

Backend runs at `http://localhost:8000`
Swagger docs at `http://localhost:8000/docs`

---

### 3. Frontend Setup

Open a **new terminal**, go to the frontend folder:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`

---

### 4. Using the Platform

1. Open `http://localhost:5173`
2. Upload your **PDF resume**
3. Enter a **GitHub username** (optional but recommended)
4. Paste the **job description** you're interviewing for
5. Click **Start Interview**
6. Answer each question in the chat (Enter to send)
7. Click **End & Report** when done to see your full evaluation

---

## Getting a Free Groq API Key

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up for a free account
3. Click **API Keys** → **Create API Key**
4. Copy the key and paste it in `backend/.env`

Free tier includes ~14,400 requests/day which is more than enough.

---

## Interview Flow

```text
Upload Resume + JD + GitHub
↓
LLM analyzes profile
extracts skills & projects
↓
Generates 10 personalized
questions (mixed categories)
↓
┌─── Interview Loop ───┐
│  Ask question        │
│  Candidate answers   │
│  LLM evaluates 1-10  │
│  Score < 4 → easier  │
│  Score > 7 → harder  │
│  Weak answer →       │
│    follow-up asked   │
└──────────────────────┘
↓
Final Report:

Overall score
Skill breakdown
Strengths & gaps
Hire recommendation
Per-question feedback
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/setup` | Upload resume, JD, GitHub → create session |
| `POST` | `/api/interview/start` | Get first question |
| `POST` | `/api/interview/answer` | Submit answer → get evaluation + next question |
| `POST` | `/api/interview/end` | End interview early |
| `GET` | `/api/report/{session_id}` | Get full feedback report |

Full interactive docs available at `http://localhost:8000/docs`

---

## Roadmap

- [x] Voice mode (Whisper STT + browser TTS)
- [ ] Export report as PDF
- [ ] PostgreSQL session persistence
- [ ] Docker + docker-compose
- [ ] Deploy to Render + Vercel
- [ ] Multi-role support (Data Scientist, MLOps, Research)
- [ ] Company-specific interview styles

---

## Acknowledgements

- [Groq](https://groq.com) for free ultra-fast LLM inference
- [Meta LLaMA3](https://ai.meta.com/llama/) for the underlying model
- [FastAPI](https://fastapi.tiangolo.com/) for the excellent Python web framework
