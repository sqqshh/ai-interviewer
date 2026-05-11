import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/client";
import { Upload, GitBranch, FileText, Loader2, Brain } from "lucide-react";

export default function Setup() {
  const navigate = useNavigate();
  const [resume, setResume] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [githubUsername, setGithubUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFileChange = (file) => {
    if (file && file.type === "application/pdf") {
      setResume(file);
    } else {
      toast.error("Please upload a PDF file");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFileChange(file);
  };

  const handleSubmit = async () => {
    if (!resume) return toast.error("Please upload your resume");
    if (!jobDescription.trim()) return toast.error("Please enter the job description");

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("resume", resume);
      formData.append("job_description", jobDescription);
      if (githubUsername.trim()) {
        formData.append("github_username", githubUsername.trim());
      }

      const res = await api.post("/setup", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const data = res.data;
      toast.success(`Profile analyzed! Found ${data.skills_detected.length} skills.`);

      // Store session info for next pages
      sessionStorage.setItem("session_id", data.session_id);
      sessionStorage.setItem("candidate_name", data.candidate_name || "Candidate");
      sessionStorage.setItem("total_questions", data.total_questions);
      sessionStorage.setItem("skills", JSON.stringify(data.skills_detected));

      navigate("/interview");
    } catch (err) {
      const msg = err.response?.data?.detail || "Setup failed. Please try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* Header */}
        <div style={styles.header}>
          <Brain size={40} color="#6366f1" />
          <h1 style={styles.title} className="gradient-text">AI Interview Platform</h1>
          <p style={styles.subtitle}>
            Upload your resume and job description to get a personalized AI/ML interview
          </p>
        </div>

        {/* Resume Upload */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <FileText size={20} color="#6366f1" />
            <h2 style={styles.cardTitle}>Resume (PDF)</h2>
          </div>
          <div
            style={{
              ...styles.dropzone,
              borderColor: dragOver ? "#6366f1" : resume ? "#22c55e" : "#2d2d4e",
              background: dragOver ? "#1a1a3e" : "#13131f",
            }}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => document.getElementById("resumeInput").click()}
          >
            <input
              id="resumeInput"
              type="file"
              accept=".pdf"
              style={{ display: "none" }}
              onChange={(e) => handleFileChange(e.target.files[0])}
            />
            <Upload size={32} color={resume ? "#22c55e" : "#6366f1"} />
            {resume ? (
              <p style={{ color: "#22c55e", marginTop: 8 }}>✓ {resume.name}</p>
            ) : (
              <>
                <p style={styles.dropText}>Drop your PDF here or click to browse</p>
                <p style={styles.dropHint}>Max 5MB</p>
              </>
            )}
          </div>
        </div>

        {/* GitHub Username */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <GitBranch size={20} color="#6366f1" />
            <h2 style={styles.cardTitle}>GitHub Username <span style={styles.optional}>(optional)</span></h2>
          </div>
          <input
            style={styles.input}
            type="text"
            placeholder="e.g. torvalds"
            value={githubUsername}
            onChange={(e) => setGithubUsername(e.target.value)}
          />
          <p style={styles.hint}>We'll analyze your public repos to personalize questions</p>
        </div>

        {/* Job Description */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <FileText size={20} color="#6366f1" />
            <h2 style={styles.cardTitle}>Job Description</h2>
          </div>
          <textarea
            style={styles.textarea}
            placeholder="Paste the full job description here..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={8}
          />
        </div>

        {/* Submit */}
        <button
          style={{
            ...styles.button,
            opacity: loading ? 0.7 : 1,
            cursor: loading ? "not-allowed" : "pointer",
          }}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
              <span>Analyzing your profile...</span>
            </>
          ) : (
            <span>Start Interview →</span>
          )}
        </button>

        {loading && (
          <p style={styles.loadingNote}>
            This takes ~30 seconds — we're reading your resume, fetching GitHub, and generating personalized questions...
          </p>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#0f0f1a",
    padding: "40px 20px",
    display: "flex",
    justifyContent: "center",
  },
  container: {
    width: "100%",
    maxWidth: 680,
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  header: {
    textAlign: "center",
    padding: "20px 0",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontSize: 36,
    fontWeight: 700,
    letterSpacing: "-0.5px",
  },
  subtitle: {
    color: "#94a3b8",
    fontSize: 16,
    maxWidth: 480,
    lineHeight: 1.6,
    textAlign: "center",
  },
  card: {
    background: "#13131f",
    border: "1px solid #2d2d4e",
    borderRadius: 16,
    padding: 24,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: "#e2e8f0",
  },
  optional: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: 400,
  },
  dropzone: {
    border: "2px dashed",
    borderRadius: 12,
    padding: "32px 20px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  dropText: {
    color: "#94a3b8",
    fontSize: 15,
    marginTop: 4,
  },
  dropHint: {
    color: "#475569",
    fontSize: 13,
  },
  input: {
    background: "#1a1a2e",
    border: "1px solid #2d2d4e",
    borderRadius: 10,
    padding: "12px 16px",
    color: "#e2e8f0",
    fontSize: 15,
    outline: "none",
    width: "100%",
  },
  textarea: {
    background: "#1a1a2e",
    border: "1px solid #2d2d4e",
    borderRadius: 10,
    padding: "12px 16px",
    color: "#e2e8f0",
    fontSize: 15,
    outline: "none",
    width: "100%",
    resize: "vertical",
    fontFamily: "inherit",
    lineHeight: 1.6,
  },
  hint: {
    color: "#475569",
    fontSize: 13,
  },
  button: {
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    border: "none",
    borderRadius: 12,
    padding: "16px 32px",
    color: "white",
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    transition: "opacity 0.2s",
  },
  loadingNote: {
    textAlign: "center",
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.6,
  },
};