from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import context, interview, feedback, transcribe

app = FastAPI(
    title="AI Interview Platform",
    description="Personalized AI/ML interview system powered by Groq LLaMA3 + Whisper",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(context.router, prefix="/api", tags=["Setup"])
app.include_router(interview.router, prefix="/api/interview", tags=["Interview"])
app.include_router(feedback.router, prefix="/api", tags=["Report"])
app.include_router(transcribe.router, prefix="/api", tags=["Voice"])


@app.get("/")
def root():
    return {"status": "AI Interview Platform is running 🎙️"}


@app.get("/health")
def health():
    return {"status": "ok"}