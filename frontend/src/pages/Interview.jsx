import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/client";
import { Send, Loader2, Brain, ChevronRight, Flag } from "lucide-react";

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
  const [currentQ, setCurrentQ] = useState(null);
  const [interviewDone, setInterviewDone] = useState(false);
  const [scores, setScores] = useState([]);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

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

  const addMessage = (role, content, meta = {}) => {
    setMessages((prev) => [...prev, { role, content, meta, id: Date.now() + Math.random() }]);
  };

  const startInterview = async () => {
    setLoading(true);
    try {
      const res = await api.post("/interview/start", { session_id: sessionId });
      const data = res.data;
      setCurrentQ(data);
      setStarted(true);
      addMessage("system", `Welcome ${candidateName}! I'll be your AI interviewer today. We have ${data.total_questions} questions. Take your time with each answer.`);
      addMessage("assistant", data.question, {
        category: data.category,
        difficulty: data.difficulty,
        questionNumber: 1,
        totalQuestions: data.total_questions,
        topic: data.topic,
      });
    } catch (err) {
      toast.error("Failed to start interview");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!input.trim() || loading || interviewDone) return;

    const answer = input.trim();
    setInput("");
    addMessage("user", answer);
    setLoading(true);

    try {
      const res = await api.post("/interview/answer", {
        session_id: sessionId,
        answer,
      });
      const data = res.data;

      // Show evaluation
      addMessage("evaluation", data.evaluation, {
        score: data.score,
        conceptsCovered: data.concepts_covered || [],
        conceptsMissed: data.concepts_missed || [],
      });

      setScores((prev) => [...prev, data.score]);

      if (data.interview_complete) {
        setInterviewDone(true);
        addMessage("system", "🎉 Interview complete! Great job. Click below to see your full report.");
      } else if (data.next_question) {
        setCurrentQ(data);
        addMessage("assistant", data.next_question, {
          category: data.category,
          difficulty: data.difficulty,
          questionNumber: data.question_number,
          totalQuestions: data.total_questions,
          isFollowup: data.is_followup,
        });
      }
    } catch (err) {
      toast.error("Failed to submit answer. Please try again.");
      setInput(answer); // restore answer
    } finally {
      setLoading(false);
    }
  };

  const endEarly = async () => {
    if (!window.confirm("End interview early and go to report?")) return;
    try {
      await api.post("/interview/end", { session_id: sessionId });
      navigate("/report");
    } catch {
      navigate("/report");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitAnswer();
    }
  };

  const avgScore = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : null;

  return (
    <div style={styles.page}>
      {/* Top Bar */}
      <div style={styles.topBar}>
        <div style={styles.topLeft}>
          <Brain size={24} color="#6366f1" />
          <span style={styles.topTitle}>AI Interview</span>
          {avgScore && (
            <span style={styles.scoreBadge}>Avg Score: {avgScore}/10</span>
          )}
        </div>
        <div style={styles.topRight}>
          <span style={styles.progress}>
            {scores.length}/{totalQuestions} answered
          </span>
          <button style={styles.endBtn} onClick={endEarly}>
            <Flag size={14} /> End & Report
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={styles.progressBarBg}>
        <div style={{ ...styles.progressBarFill, width: `${(scores.length / totalQuestions) * 100}%` }} />
      </div>

      {/* Chat Messages */}
      <div style={styles.chatArea}>
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
        {loading && (
          <div style={styles.typingIndicator}>
            <Loader2 size={16} color="#6366f1" style={{ animation: "spin 1s linear infinite" }} />
            <span>Interviewer is thinking...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      {!interviewDone ? (
        <div style={styles.inputArea}>
          <textarea
            ref={textareaRef}
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
            onClick={submitAnswer}
            disabled={loading || !input.trim()}
          >
            <Send size={20} />
          </button>
        </div>
      ) : (
        <div style={styles.doneArea}>
          <button style={styles.reportBtn} onClick={() => navigate("/report")}>
            View Full Report <ChevronRight size={18} />
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

function MessageBubble({ msg }) {
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
          <div style={bubbleStyles.aiBubble}>{msg.content}</div>
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

const styles = {
  page: { display: "flex", flexDirection: "column", height: "100vh", background: "#0f0f1a" },
  topBar: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 24px", background: "#13131f", borderBottom: "1px solid #2d2d4e" },
  topLeft: { display: "flex", alignItems: "center", gap: 12 },
  topTitle: { fontWeight: 700, fontSize: 18, color: "#e2e8f0" },
  scoreBadge: { background: "#6366f122", color: "#6366f1", padding: "4px 10px", borderRadius: 20, fontSize: 13, fontWeight: 600 },
  topRight: { display: "flex", alignItems: "center", gap: 12 },
  progress: { color: "#64748b", fontSize: 14 },
  endBtn: { display: "flex", alignItems: "center", gap: 6, background: "#1e1e3a", border: "1px solid #2d2d4e", borderRadius: 8, padding: "6px 14px", color: "#94a3b8", fontSize: 13, cursor: "pointer" },
  progressBarBg: { height: 3, background: "#1a1a2e" },
  progressBarFill: { height: "100%", background: "linear-gradient(90deg, #6366f1, #8b5cf6)", transition: "width 0.5s ease" },
  chatArea: { flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: 16 },
  typingIndicator: { display: "flex", alignItems: "center", gap: 8, color: "#64748b", fontSize: 14, padding: "8px 0" },
  inputArea: { padding: "16px 24px", background: "#13131f", borderTop: "1px solid #2d2d4e", display: "flex", gap: 12, alignItems: "flex-end" },
  textarea: { flex: 1, background: "#1a1a2e", border: "1px solid #2d2d4e", borderRadius: 12, padding: "12px 16px", color: "#e2e8f0", fontSize: 15, resize: "none", fontFamily: "inherit", lineHeight: 1.6, outline: "none" },
  sendBtn: { background: "linear-gradient(135deg, #6366f1, #8b5cf6)", border: "none", borderRadius: 12, padding: "12px 16px", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  doneArea: { padding: "20px 24px", background: "#13131f", borderTop: "1px solid #2d2d4e", display: "flex", justifyContent: "center" },
  reportBtn: { display: "flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", border: "none", borderRadius: 12, padding: "14px 32px", color: "white", fontSize: 16, fontWeight: 600, cursor: "pointer" },
};

const bubbleStyles = {
  systemWrap: { textAlign: "center", padding: "4px 0" },
  systemText: { display: "inline-block", background: "#1a1a2e", border: "1px solid #2d2d4e", borderRadius: 20, padding: "6px 16px", fontSize: 13, color: "#64748b" },
  wrap: { display: "flex", gap: 12, alignItems: "flex-start" },
  userWrap: { display: "flex", gap: 12, alignItems: "flex-start", justifyContent: "flex-end" },
  avatarAI: { width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "white", flexShrink: 0 },
  avatarUser: { width: 36, height: 36, borderRadius: "50%", background: "#1e3a5f", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#60a5fa", flexShrink: 0 },
  qMeta: { display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap", alignItems: "center" },
  catBadge: { padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, textTransform: "capitalize" },
  diffBadge: { background: "#1a1a2e", border: "1px solid #2d2d4e", color: "#94a3b8", padding: "2px 10px", borderRadius: 20, fontSize: 12 },
  qNum: { color: "#475569", fontSize: 12 },
  aiBubble: { background: "#13131f", border: "1px solid #2d2d4e", borderRadius: "4px 16px 16px 16px", padding: "14px 18px", fontSize: 15, lineHeight: 1.7, color: "#e2e8f0" },
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