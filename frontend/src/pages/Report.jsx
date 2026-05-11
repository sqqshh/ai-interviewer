import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { Brain, TrendingUp, AlertCircle, CheckCircle, RotateCcw, Loader2 } from "lucide-react";

const RECOMMENDATION_COLORS = {
  "Strong Yes": "#22c55e",
  "Yes": "#84cc16",
  "Maybe": "#f59e0b",
  "No": "#ef4444",
};

export default function Report() {
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const sessionId = sessionStorage.getItem("session_id");

  useEffect(() => {
    if (!sessionId) { navigate("/"); return; }
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      const res = await api.get(`/report/${sessionId}`);
      setReport(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingPage}>
        <Loader2 size={40} color="#6366f1" style={{ animation: "spin 1s linear infinite" }} />
        <p style={{ color: "#94a3b8", marginTop: 16 }}>Generating your report...</p>
        <style>{`@keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }`}</style>
      </div>
    );
  }

  if (!report) {
    return (
      <div style={styles.loadingPage}>
        <p style={{ color: "#ef4444" }}>Failed to load report.</p>
        <button style={styles.retryBtn} onClick={() => navigate("/")}>Start Over</button>
      </div>
    );
  }

  const recColor = RECOMMENDATION_COLORS[report.hire_recommendation] || "#f59e0b";
  const scoreColor = report.overall_score >= 7 ? "#22c55e" : report.overall_score >= 4 ? "#f59e0b" : "#ef4444";

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* Header */}
        <div style={styles.header}>
          <Brain size={36} color="#6366f1" />
          <h1 className="gradient-text" style={styles.title}>Interview Report</h1>
          <p style={styles.subtitle}>{report.candidate_name}</p>
        </div>

        {/* Score + Recommendation */}
        <div style={styles.heroRow}>
          <div style={styles.heroCard}>
            <p style={styles.heroLabel}>Overall Score</p>
            <p style={{ ...styles.heroScore, color: scoreColor }}>{report.overall_score}<span style={styles.heroMax}>/10</span></p>
            <p style={styles.heroSub}>{report.questions_answered} of {report.total_questions} questions</p>
          </div>
          <div style={{ ...styles.heroCard, borderColor: recColor + "44" }}>
            <p style={styles.heroLabel}>Hire Recommendation</p>
            <p style={{ ...styles.heroRec, color: recColor }}>{report.hire_recommendation}</p>
          </div>
        </div>

        {/* Skill Scores */}
        {Object.keys(report.skill_scores).length > 0 && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Skill Breakdown</h2>
            <div style={styles.skillList}>
              {Object.entries(report.skill_scores).map(([skill, score]) => (
                <div key={skill} style={styles.skillRow}>
                  <span style={styles.skillName}>{skill}</span>
                  <div style={styles.skillBarBg}>
                    <div style={{
                      ...styles.skillBarFill,
                      width: `${(score / 10) * 100}%`,
                      background: score >= 7 ? "#22c55e" : score >= 4 ? "#f59e0b" : "#ef4444",
                    }} />
                  </div>
                  <span style={styles.skillScore}>{score}/10</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Strengths & Improvements */}
        <div style={styles.twoCol}>
          <div style={{ ...styles.card, borderColor: "#16653444" }}>
            <div style={styles.cardHeader}>
              <CheckCircle size={18} color="#22c55e" />
              <h2 style={{ ...styles.cardTitle, color: "#22c55e" }}>Strengths</h2>
            </div>
            <ul style={styles.list}>
              {report.strengths.map((s, i) => (
                <li key={i} style={styles.listItem}>
                  <span style={styles.greenDot} />
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div style={{ ...styles.card, borderColor: "#7c2d1244" }}>
            <div style={styles.cardHeader}>
              <AlertCircle size={18} color="#f59e0b" />
              <h2 style={{ ...styles.cardTitle, color: "#f59e0b" }}>Areas to Improve</h2>
            </div>
            <ul style={styles.list}>
              {report.improvement_areas.map((s, i) => (
                <li key={i} style={styles.listItem}>
                  <span style={styles.yellowDot} />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Detailed Feedback */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <TrendingUp size={18} color="#6366f1" />
            <h2 style={styles.cardTitle}>Detailed Feedback</h2>
          </div>
          <p style={styles.feedbackText}>{report.detailed_feedback}</p>
        </div>

        {/* Per Question Breakdown */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Question-by-Question Breakdown</h2>
          <div style={styles.qList}>
            {report.per_question_breakdown.map((q) => {
              const sc = q.score >= 7 ? "#22c55e" : q.score >= 4 ? "#f59e0b" : "#ef4444";
              return (
                <div key={q.question_number} style={styles.qCard}>
                  <div style={styles.qHeader}>
                    <span style={styles.qNum}>Q{q.question_number}</span>
                    <span style={styles.qCat}>{q.category.replace("_", " ")}</span>
                    <span style={styles.qDiff}>{q.difficulty}</span>
                    <span style={{ ...styles.qScore, color: sc }}>Score: {q.score}/10</span>
                  </div>
                  <p style={styles.qText}>{q.question}</p>
                  <p style={styles.qFeedback}>{q.feedback}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Start Over */}
        <button style={styles.restartBtn} onClick={() => { sessionStorage.clear(); navigate("/"); }}>
          <RotateCcw size={16} /> Start New Interview
        </button>

      </div>
      <style>{`@keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}

const styles = {
  loadingPage: { height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0f0f1a" },
  retryBtn: { marginTop: 16, padding: "10px 24px", background: "#6366f1", border: "none", borderRadius: 8, color: "white", cursor: "pointer" },
  page: { minHeight: "100vh", background: "#0f0f1a", padding: "40px 20px" },
  container: { maxWidth: 780, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 },
  header: { textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 },
  title: { fontSize: 32, fontWeight: 700 },
  subtitle: { color: "#94a3b8", fontSize: 16 },
  heroRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  heroCard: { background: "#13131f", border: "1px solid #2d2d4e", borderRadius: 16, padding: 24, textAlign: "center" },
  heroLabel: { color: "#64748b", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 },
  heroScore: { fontSize: 56, fontWeight: 800, lineHeight: 1 },
  heroMax: { fontSize: 24, color: "#475569" },
  heroSub: { color: "#475569", fontSize: 13, marginTop: 6 },
  heroRec: { fontSize: 28, fontWeight: 800, marginTop: 8 },
  card: { background: "#13131f", border: "1px solid #2d2d4e", borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 16 },
  cardTitle: { fontSize: 16, fontWeight: 600, color: "#e2e8f0" },
  cardHeader: { display: "flex", alignItems: "center", gap: 8 },
  skillList: { display: "flex", flexDirection: "column", gap: 12 },
  skillRow: { display: "flex", alignItems: "center", gap: 12 },
  skillName: { width: 180, fontSize: 14, color: "#94a3b8", flexShrink: 0 },
  skillBarBg: { flex: 1, height: 8, background: "#1a1a2e", borderRadius: 4, overflow: "hidden" },
  skillBarFill: { height: "100%", borderRadius: 4, transition: "width 1s ease" },
  skillScore: { width: 40, fontSize: 14, color: "#e2e8f0", fontWeight: 600, textAlign: "right" },
  twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  list: { listStyle: "none", display: "flex", flexDirection: "column", gap: 10 },
  listItem: { display: "flex", alignItems: "flex-start", gap: 8, fontSize: 14, color: "#cbd5e1", lineHeight: 1.5 },
  greenDot: { width: 6, height: 6, borderRadius: "50%", background: "#22c55e", flexShrink: 0, marginTop: 6 },
  yellowDot: { width: 6, height: 6, borderRadius: "50%", background: "#f59e0b", flexShrink: 0, marginTop: 6 },
  feedbackText: { fontSize: 14, lineHeight: 1.8, color: "#cbd5e1" },
  qList: { display: "flex", flexDirection: "column", gap: 12 },
  qCard: { background: "#0f0f1a", border: "1px solid #1e1e3a", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 8 },
  qHeader: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
  qNum: { background: "#6366f122", color: "#6366f1", padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700 },
  qCat: { background: "#1a1a2e", color: "#94a3b8", padding: "2px 10px", borderRadius: 20, fontSize: 12, textTransform: "capitalize" },
  qDiff: { background: "#1a1a2e", color: "#64748b", padding: "2px 10px", borderRadius: 20, fontSize: 12 },
  qScore: { fontWeight: 700, fontSize: 13, marginLeft: "auto" },
  qText: { fontSize: 14, color: "#e2e8f0", fontWeight: 500 },
  qFeedback: { fontSize: 13, color: "#94a3b8", lineHeight: 1.6 },
  restartBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#13131f", border: "1px solid #2d2d4e", borderRadius: 12, padding: "14px 32px", color: "#94a3b8", fontSize: 15, cursor: "pointer", margin: "0 auto" },
};