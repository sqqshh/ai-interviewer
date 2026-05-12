import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/client";
import useVoice from "../hooks/useVoice";
import {
  Send, Loader2, Brain, ChevronRight, Flag,
  Mic, MicOff, Volume2, VolumeX, Code, MessageSquare
} from "lucide-react";

const CATEGORY_COLORS = {
  conceptual: "#6366f1",
  coding: "#06b6d4",
  behavioral: "#f59e0b",
  project_based: "#22c55e",
  system_design: "#ec4899",
};

export default function Interview() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [interviewDone, setInterviewDone] = useState(false);
  const [scores, setScores] = useState([]);
  const [inputMode, setInputMode] = useState("voice"); // "voice" | "text"
  const [autoSpeak, setAutoSpeak] = useState(true);
  const bottomRef = useRef(null);

  const {
    isRecording, startRecording, stopAndTranscribe,
    isTranscribing, isSpeaking, speak, stopSpeaking,
    voiceError, setVoiceError,
  } = useVoice();

  const sessionId = sessionStorage.getItem("session_id");
  const candidateName = sessionStorage.getItem("candidate_name") || "Candidate";
  const totalQuestions = parseInt(sessionStorage.getItem("total_questions") || "10");

  useEffect(() => {
    if (!sessionId) { navigate("/"); return; }
    startInterview();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Show voice errors as toasts
  useEffect(() => {
    if (voiceError) {
      toast.error(voiceError);
      setVoiceError(null);
    }
  }, [voiceError]);

  const addMessage = (role, content, meta = {}) => {
    setMessages((prev) => [...prev, { role, content, meta, id: Date.now() + Math.random() }]);
  };

  const startInterview = async () => {
    setLoading(true);
    try {
      const res = await api.post("/interview/start", { session_id: sessionId });
      const data = res.data;
      setStarted(true);

      const welcomeMsg = `Welcome ${candidateName}! I'll be your AI interviewer today. We have ${data.total_questions} questions. You can answer by voice or text — use the toggle below.`;
      addMessage("system", welcomeMsg);
      addMessage("assistant", data.question, {
        category: data.category,
        difficulty: data.difficulty,
        questionNumber: 1,
        totalQuestions: data.total_questions,
        topic: data.topic,
      });

      // Auto-speak the first question
      if (autoSpeak) {
        setTimeout(() => speak(data.question), 500);
      }
    } catch (err) {
      toast.error("Failed to start interview");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (answerText) => {
    const answer = answerText?.trim() || input.trim();
    if (!answer || loading || interviewDone) return;

    setInput("");
    addMessage("user", answer);
    setLoading(true);
    stopSpeaking();

    try {
      const res = await api.post("/interview/answer", {
        session_id: sessionId,
        answer,
      });
      const data = res.data;

      addMessage("evaluation", data.evaluation, {
        score: data.score,
        conceptsCovered: data.concepts_covered || [],
        conceptsMissed: data.concepts_missed || [],
      });

      setScores((prev) => [...prev, data.score]);

      if (data.interview_complete) {
        setInterviewDone(true);
        const doneMsg = "Great job completing the interview! Click below to see your full report.";
        addMessage("system", doneMsg);
        if (autoSpeak) speak(doneMsg);
      } else if (data.next_question) {
        addMessage("assistant", data.next_question, {
          category: data.category,
          difficulty: data.difficulty,
          questionNumber: data.question_number,
          totalQuestions: data.total_questions,
          isFollowup: data.is_followup,
        });
        // Auto-speak next question after a short delay
        if (autoSpeak) {
          setTimeout(() => speak(data.next_question), 400);
        }
      }
    } catch (err) {
      toast.error("Failed to submit answer. Please try again.");
      setInput(answer);
    } finally {
      setLoading(false);
    }
  };

  // Handle mic button click
  const handleMicClick = async () => {
    if (isRecording) {
      // Stop and transcribe
      stopSpeaking();
      const transcript = await stopAndTranscribe();
      if (transcript) {
        setInput(transcript);
        // Auto-submit after transcription
        await submitAnswer(transcript);
      }
    } else {
      startRecording();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitAnswer();
    }
  };

  const endEarly = async () => {
    if (!window.confirm("End interview early and go to report?")) return;
    stopSpeaking();
    try {
      await api.post("/interview/end", { session_id: sessionId });
    } catch {}
    navigate("/report");
  };

  const avgScore = scores.length
    ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
    : null;

  const isCodingQuestion = messages
    .filter((m) => m.role === "assistant")
    .at(-1)?.meta?.category === "coding";

  return (
    <div style={styles.page}>
      {/* Top Bar */}
      <div style={styles.topBar}>
        <div style={styles.topLeft}>
          <Brain size={24} color="#6366f1" />
          <span style={styles.topTitle}>AI Interview</span>
          {avgScore && (
            <span style={styles.scoreBadge}>Avg: {avgScore}/10</span>
          )}
        </div>
        <div style={styles.topRight}>
          {/* Auto-speak toggle */}
          <button
            style={{ ...styles.iconBtn, color: autoSpeak ? "#6366f1" : "#475569" }}
            onClick={() => { autoSpeak ? stopSpeaking() : null; setAutoSpeak(!autoSpeak); }}
            title={autoSpeak ? "Mute AI voice" : "Enable AI voice"}
          >
            {autoSpeak ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span style={styles.iconBtnLabel}>{autoSpeak ? "Voice On" : "Voice Off"}</span>
          </button>
          <span style={styles.progress}>{scores.length}/{totalQuestions}</span>
          <button style={styles.endBtn} onClick={endEarly}>
            <Flag size={14} /> End & Report
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={styles.progressBarBg}>
        <div style={{
          ...styles.progressBarFill,
          width: `${(scores.length / totalQuestions) * 100}%`
        }} />
      </div>

      {/* Chat Messages */}
      <div style={styles.chatArea}>
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            onSpeak={speak}
            isSpeaking={isSpeaking}
            stopSpeaking={stopSpeaking}
          />
        ))}
        {(loading || isTranscribing) && (
          <div style={styles.typingIndicator}>
            <Loader2 size={16} color="#6366f1" style={{ animation: "spin 1s linear infinite" }} />
            <span>{isTranscribing ? "Transcribing your answer..." : "Interviewer is thinking..."}</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      {!interviewDone ? (
        <div style={styles.inputArea}>

          {/* Mode Toggle */}
          <div style={styles.modeToggle}>
            <button
              style={{
                ...styles.modeBtn,
                background: inputMode === "voice" ? "#6366f122" : "transparent",
                color: inputMode === "voice" ? "#6366f1" : "#475569",
                borderColor: inputMode === "voice" ? "#6366f144" : "transparent",
              }}
              onClick={() => setInputMode("voice")}
            >
              <Mic size={14} /> Voice
            </button>
            <button
              style={{
                ...styles.modeBtn,
                background: inputMode === "text" ? "#6366f122" : "transparent",
                color: inputMode === "text" ? "#6366f1" : "#475569",
                borderColor: inputMode === "text" ? "#6366f144" : "transparent",
              }}
              onClick={() => setInputMode("text")}
            >
              <Code size={14} /> Text
            </button>
          </div>

          {/* Auto-switch to text for coding questions */}
          {isCodingQuestion && inputMode === "voice" && (
            <div style={styles.codingHint}>
              💡 Coding question detected —
              <button style={styles.switchLink} onClick={() => setInputMode("text")}>
                switch to text input
              </button>
            </div>
          )}

          {inputMode === "voice" ? (
            /* Voice Input */
            <div style={styles.voiceRow}>
              {/* Transcribed text preview */}
              {input && (
                <div style={styles.transcriptPreview}>
                  <span style={styles.transcriptLabel}>Transcribed:</span>
                  <span style={styles.transcriptText}>{input}</span>
                  <button style={styles.clearBtn} onClick={() => setInput("")}>✕</button>
                </div>
              )}

              <div style={styles.voiceControls}>
                {/* Mic button */}
                <button
                  style={{
                    ...styles.micBtn,
                    background: isRecording
                      ? "linear-gradient(135deg, #ef4444, #dc2626)"
                      : isTranscribing
                      ? "#1a1a2e"
                      : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    transform: isRecording ? "scale(1.1)" : "scale(1)",
                    boxShadow: isRecording ? "0 0 0 8px #ef444422" : "none",
                  }}
                  onClick={handleMicClick}
                  disabled={loading || isTranscribing || !started}
                >
                  {isTranscribing ? (
                    <Loader2 size={28} style={{ animation: "spin 1s linear infinite" }} />
                  ) : isRecording ? (
                    <MicOff size={28} />
                  ) : (
                    <Mic size={28} />
                  )}
                </button>

                <div style={styles.micHint}>
                  {isRecording
                    ? "🔴 Recording... tap to stop & send"
                    : isTranscribing
                    ? "Converting speech to text..."
                    : input
                    ? "Tap mic to re-record, or send below"
                    : "Tap mic to start speaking"}
                </div>

                {/* Send transcribed text */}
                {input && !isRecording && (
                  <button
                    style={styles.sendVoiceBtn}
                    onClick={() => submitAnswer()}
                    disabled={loading}
                  >
                    <Send size={16} /> Send Answer
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Text Input */
            <div style={styles.textRow}>
              <textarea
                style={styles.textarea}
                placeholder="Type your answer... (Enter to send, Shift+Enter for new line)"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={3}
                disabled={loading || !started}
              />
              <button
                style={{
                  ...styles.sendBtn,
                  opacity: loading || !input.trim() ? 0.5 : 1,
                  cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                }}
                onClick={() => submitAnswer()}
                disabled={loading || !input.trim()}
              >
                <Send size={20} />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={styles.doneArea}>
          <button style={styles.reportBtn} onClick={() => navigate("/report")}>
            View Full Report <ChevronRight size={18} />
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
      `}</style>
    </div>
  );
}

// ── Message Bubble Component ──────────────────────────────────────

function MessageBubble({ msg, onSpeak, isSpeaking, stopSpeaking }) {
  if (msg.role === "system") {
    return (
      <div style={bubbleStyles.systemWrap}>
        <p style={bubbleStyles.systemText}>{msg.content}</p>
      </div>
    );
  }

  if (msg.role === "assistant") {
    const cat = msg.meta?.category || "conceptual";
    const color = CATEGORY_COLORS[cat] || "#6366f1";
    return (
      <div style={{ ...bubbleStyles.wrap, animation: "fadeIn 0.3s ease" }}>
        <div style={bubbleStyles.avatarAI}>AI</div>
        <div style={{ maxWidth: "75%" }}>
          {msg.meta?.questionNumber && (
            <div style={bubbleStyles.qMeta}>
              <span style={{ ...bubbleStyles.catBadge, background: color + "22", color }}>
                {msg.meta.isFollowup ? "↩ Follow-up" : cat.replace("_", " ")}
              </span>
              <span style={bubbleStyles.diffBadge}>{msg.meta.difficulty}</span>
              <span style={bubbleStyles.qNum}>Q{msg.meta.questionNumber}/{msg.meta.totalQuestions}</span>
            </div>
          )}
          <div style={bubbleStyles.aiBubble}>
            {msg.content}
            {/* Replay speak button */}
            <button
              style={bubbleStyles.speakBtn}
              onClick={() => isSpeaking ? stopSpeaking() : onSpeak(msg.content)}
              title="Read aloud"
            >
              {isSpeaking ? <VolumeX size={13} /> : <Volume2 size={13} />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (msg.role === "user") {
    return (
      <div style={{ ...bubbleStyles.userWrap, animation: "fadeIn 0.3s ease" }}>
        <div style={bubbleStyles.userBubble}>{msg.content}</div>
        <div style={bubbleStyles.avatarUser}>You</div>
      </div>
    );
  }

  if (msg.role === "evaluation") {
    const score = msg.meta?.score || 0;
    const color = score >= 7 ? "#22c55e" : score >= 4 ? "#f59e0b" : "#ef4444";
    return (
      <div style={{ ...bubbleStyles.evalWrap, animation: "fadeIn 0.3s ease" }}>
        <div style={bubbleStyles.evalCard}>
          <div style={bubbleStyles.evalHeader}>
            <span style={bubbleStyles.evalLabel}>Evaluation</span>
            <span style={{ ...bubbleStyles.scoreChip, background: color + "22", color, borderColor: color + "44" }}>
              {score}/10
            </span>
          </div>
          <p style={bubbleStyles.evalText}>{msg.content}</p>
          {msg.meta?.conceptsCovered?.length > 0 && (
            <div style={bubbleStyles.conceptRow}>
              <span style={bubbleStyles.coveredLabel}>✓ Covered:</span>
              {msg.meta.conceptsCovered.map((c, i) => (
                <span key={i} style={bubbleStyles.coveredChip}>{c}</span>
              ))}
            </div>
          )}
          {msg.meta?.conceptsMissed?.length > 0 && (
            <div style={bubbleStyles.conceptRow}>
              <span style={bubbleStyles.missedLabel}>✗ Missed:</span>
              {msg.meta.conceptsMissed.map((c, i) => (
                <span key={i} style={bubbleStyles.missedChip}>{c}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
}

// ── Styles ────────────────────────────────────────────────────────

const styles = {
  page: { display: "flex", flexDirection: "column", height: "100vh", background: "#0f0f1a" },
  topBar: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 24px", background: "#13131f", borderBottom: "1px solid #2d2d4e" },
  topLeft: { display: "flex", alignItems: "center", gap: 12 },
  topTitle: { fontWeight: 700, fontSize: 18, color: "#e2e8f0" },
  scoreBadge: { background: "#6366f122", color: "#6366f1", padding: "4px 10px", borderRadius: 20, fontSize: 13, fontWeight: 600 },
  topRight: { display: "flex", alignItems: "center", gap: 12 },
  iconBtn: { display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "none", cursor: "pointer", fontSize: 13, padding: "6px 10px", borderRadius: 8 },
  iconBtnLabel: { fontSize: 13 },
  progress: { color: "#64748b", fontSize: 14 },
  endBtn: { display: "flex", alignItems: "center", gap: 6, background: "#1e1e3a", border: "1px solid #2d2d4e", borderRadius: 8, padding: "6px 14px", color: "#94a3b8", fontSize: 13, cursor: "pointer" },
  progressBarBg: { height: 3, background: "#1a1a2e" },
  progressBarFill: { height: "100%", background: "linear-gradient(90deg, #6366f1, #8b5cf6)", transition: "width 0.5s ease" },
  chatArea: { flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: 16 },
  typingIndicator: { display: "flex", alignItems: "center", gap: 8, color: "#64748b", fontSize: 14 },
  inputArea: { background: "#13131f", borderTop: "1px solid #2d2d4e", padding: "12px 24px", display: "flex", flexDirection: "column", gap: 10 },
  modeToggle: { display: "flex", gap: 4, alignSelf: "flex-start", background: "#0f0f1a", borderRadius: 10, padding: 4 },
  modeBtn: { display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, border: "1px solid", cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "all 0.2s" },
  codingHint: { fontSize: 13, color: "#f59e0b", background: "#451a0322", border: "1px solid #f59e0b33", borderRadius: 8, padding: "8px 12px" },
  switchLink: { background: "none", border: "none", color: "#f59e0b", textDecoration: "underline", cursor: "pointer", fontSize: 13, marginLeft: 4 },
  voiceRow: { display: "flex", flexDirection: "column", gap: 10 },
  voiceControls: { display: "flex", alignItems: "center", gap: 16, padding: "8px 0" },
  micBtn: { width: 68, height: 68, borderRadius: "50%", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "white", transition: "all 0.2s", flexShrink: 0 },
  micHint: { color: "#64748b", fontSize: 14, flex: 1 },
  sendVoiceBtn: { display: "flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", border: "none", borderRadius: 10, padding: "10px 20px", color: "white", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  transcriptPreview: { display: "flex", alignItems: "flex-start", gap: 8, background: "#1a1a2e", border: "1px solid #2d2d4e", borderRadius: 10, padding: "10px 14px", fontSize: 14 },
  transcriptLabel: { color: "#6366f1", fontWeight: 600, flexShrink: 0, fontSize: 12 },
  transcriptText: { color: "#e2e8f0", flex: 1, lineHeight: 1.5 },
  clearBtn: { background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 14, flexShrink: 0 },
  textRow: { display: "flex", gap: 12, alignItems: "flex-end" },
  textarea: { flex: 1, background: "#1a1a2e", border: "1px solid #2d2d4e", borderRadius: 12, padding: "12px 16px", color: "#e2e8f0", fontSize: 15, resize: "none", fontFamily: "inherit", lineHeight: 1.6, outline: "none" },
  sendBtn: { background: "linear-gradient(135deg, #6366f1, #8b5cf6)", border: "none", borderRadius: 12, padding: "12px 16px", color: "white", cursor: "pointer", display: "flex", alignItems: "center" },
  doneArea: { padding: "20px 24px", background: "#13131f", borderTop: "1px solid #2d2d4e", display: "flex", justifyContent: "center" },
  reportBtn: { display: "flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", border: "none", borderRadius: 12, padding: "14px 32px", color: "white", fontSize: 16, fontWeight: 600, cursor: "pointer" },
};

const bubbleStyles = {
  systemWrap: { textAlign: "center" },
  systemText: { display: "inline-block", background: "#1a1a2e", border: "1px solid #2d2d4e", borderRadius: 20, padding: "6px 16px", fontSize: 13, color: "#64748b" },
  wrap: { display: "flex", gap: 12, alignItems: "flex-start" },
  userWrap: { display: "flex", gap: 12, alignItems: "flex-start", justifyContent: "flex-end" },
  avatarAI: { width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "white", flexShrink: 0 },
  avatarUser: { width: 36, height: 36, borderRadius: "50%", background: "#1e3a5f", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#60a5fa", flexShrink: 0 },
  qMeta: { display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap", alignItems: "center" },
  catBadge: { padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, textTransform: "capitalize" },
  diffBadge: { background: "#1a1a2e", border: "1px solid #2d2d4e", color: "#94a3b8", padding: "2px 10px", borderRadius: 20, fontSize: 12 },
  qNum: { color: "#475569", fontSize: 12 },
  aiBubble: { background: "#13131f", border: "1px solid #2d2d4e", borderRadius: "4px 16px 16px 16px", padding: "14px 18px", fontSize: 15, lineHeight: 1.7, color: "#e2e8f0", position: "relative" },
  speakBtn: { position: "absolute", top: 8, right: 10, background: "none", border: "none", cursor: "pointer", color: "#475569", padding: 2, display: "flex", alignItems: "center" },
  userBubble: { background: "#1e3a5f", border: "1px solid #1e40af33", borderRadius: "16px 4px 16px 16px", padding: "14px 18px", fontSize: 15, lineHeight: 1.7, color: "#e2e8f0", maxWidth: "75%" },
  evalWrap: { paddingLeft: 48 },
  evalCard: { background: "#0f1f0f", border: "1px solid #166534", borderRadius: 12, padding: "14px 18px", display: "flex", flexDirection: "column", gap: 10 },
  evalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  evalLabel: { fontSize: 12, fontWeight: 700, color: "#4ade80", textTransform: "uppercase", letterSpacing: 1 },
  scoreChip: { padding: "3px 12px", borderRadius: 20, fontSize: 14, fontWeight: 700, border: "1px solid" },
  evalText: { fontSize: 14, lineHeight: 1.7, color: "#cbd5e1" },
  conceptRow: { display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" },
  coveredLabel: { fontSize: 12, color: "#4ade80", fontWeight: 600 },
  missedLabel: { fontSize: 12, color: "#f87171", fontWeight: 600 },
  coveredChip: { background: "#14532d", color: "#4ade80", padding: "2px 8px", borderRadius: 20, fontSize: 12 },
  missedChip: { background: "#450a0a", color: "#f87171", padding: "2px 8px", borderRadius: 20, fontSize: 12 },
};