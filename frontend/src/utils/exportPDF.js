import jsPDF from "jspdf";

/**
 * Generates a styled PDF report from interview data.
 * Pure jsPDF — no html2canvas, no DOM dependency.
 * Works reliably across all browsers.
 */
export async function exportReportPDF(report) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const W = 210; // A4 width mm
  const MARGIN = 20;
  const COL = W - MARGIN * 2;
  let y = 0; // current y cursor

  // ── Color palette ──────────────────────────────────────────
  const PURPLE     = [99,  102, 241];
  const DARK_BG    = [15,  15,  26];
  const CARD_BG    = [19,  19,  31];
  const TEXT_MAIN  = [226, 232, 240];
  const TEXT_MUTED = [100, 116, 139];
  const GREEN      = [34,  197, 94];
  const YELLOW     = [245, 158, 11];
  const RED        = [239, 68,  68];
  const BORDER     = [45,  45,  78];

  // ── Helpers ────────────────────────────────────────────────

  const setFont = (style = "normal", size = 11) => {
    doc.setFontSize(size);
    doc.setFont("helvetica", style);
  };

  const setColor = (rgb) => doc.setTextColor(...rgb);

  const fillRect = (x, fy, w, h, rgb) => {
    doc.setFillColor(...rgb);
    doc.rect(x, fy, w, h, "F");
  };

  const drawRect = (x, fy, w, h, rgb) => {
    doc.setDrawColor(...rgb);
    doc.rect(x, fy, w, h, "S");
  };

  const addPage = () => {
    doc.addPage();
    // dark background on every page
    fillRect(0, 0, W, 297, DARK_BG);
    y = MARGIN;
  };

  const checkPageBreak = (needed = 20) => {
    if (y + needed > 277) addPage();
  };

  const wrappedText = (text, x, startY, maxW, lineH = 6) => {
    const lines = doc.splitTextToSize(String(text), maxW);
    lines.forEach((line) => {
      checkPageBreak(lineH + 2);
      doc.text(line, x, y);
      y += lineH;
    });
    return y;
  };

  const scoreColor = (s) =>
    s >= 7 ? GREEN : s >= 4 ? YELLOW : RED;

  const recColor = (rec) => {
    const map = {
      "Strong Yes": GREEN,
      "Yes": [132, 204, 22],
      "Maybe": YELLOW,
      "No": RED,
    };
    return map[rec] || YELLOW;
  };

  // ══════════════════════════════════════════════════════════
  // PAGE 1 — Cover
  // ══════════════════════════════════════════════════════════

  // Full dark background
  fillRect(0, 0, W, 297, DARK_BG);
  y = 0;

  // Purple header band
  fillRect(0, 0, W, 55, [30, 27, 75]);

  // Title
  setFont("bold", 24);
  setColor([255, 255, 255]);
  doc.text("AI Interview Report", W / 2, 24, { align: "center" });

  setFont("normal", 11);
  setColor([165, 180, 252]);
  doc.text("Powered by Groq LLaMA3 · AI Interview Platform", W / 2, 34, { align: "center" });

  // Date
  setFont("normal", 9);
  setColor(TEXT_MUTED);
  doc.text(
    `Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
    W / 2, 43, { align: "center" }
  );

  y = 68;

  // Candidate name
  setFont("bold", 18);
  setColor(TEXT_MAIN);
  doc.text(report.candidate_name || "Candidate", W / 2, y, { align: "center" });
  y += 10;

  // ── Score + Recommendation cards ──────────────────────────
  const cardY = y;
  const cardH = 36;
  const cardW = (COL - 8) / 2;

  // Score card
  fillRect(MARGIN, cardY, cardW, cardH, CARD_BG);
  drawRect(MARGIN, cardY, cardW, cardH, BORDER);

  setFont("normal", 8);
  setColor(TEXT_MUTED);
  doc.text("OVERALL SCORE", MARGIN + cardW / 2, cardY + 8, { align: "center" });

  setFont("bold", 26);
  setColor(scoreColor(report.overall_score));
  doc.text(`${report.overall_score}`, MARGIN + cardW / 2, cardY + 23, { align: "center" });

  setFont("normal", 8);
  setColor(TEXT_MUTED);
  doc.text("/ 10", MARGIN + cardW / 2 + 8, cardY + 23);

  setFont("normal", 8);
  setColor(TEXT_MUTED);
  doc.text(
    `${report.questions_answered} of ${report.total_questions} questions`,
    MARGIN + cardW / 2, cardY + 31, { align: "center" }
  );

  // Recommendation card
  const recX = MARGIN + cardW + 8;
  fillRect(recX, cardY, cardW, cardH, CARD_BG);
  drawRect(recX, cardY, cardW, cardH, BORDER);

  setFont("normal", 8);
  setColor(TEXT_MUTED);
  doc.text("HIRE RECOMMENDATION", recX + cardW / 2, cardY + 8, { align: "center" });

  setFont("bold", 16);
  setColor(recColor(report.hire_recommendation));
  doc.text(report.hire_recommendation || "Maybe", recX + cardW / 2, cardY + 23, { align: "center" });

  y = cardY + cardH + 12;

  // ── Skill Scores ───────────────────────────────────────────
  if (report.skill_scores && Object.keys(report.skill_scores).length > 0) {
    checkPageBreak(10);
    setFont("bold", 12);
    setColor(TEXT_MAIN);
    doc.text("Skill Breakdown", MARGIN, y);
    y += 8;

    Object.entries(report.skill_scores).forEach(([skill, score]) => {
      checkPageBreak(12);
      const barW = COL - 60;
      const barH = 5;
      const barX = MARGIN + 52;

      setFont("normal", 9);
      setColor(TEXT_MUTED);
      doc.text(skill, MARGIN, y);

      // Bar background
      fillRect(barX, y - 4, barW, barH, [30, 30, 50]);
      // Bar fill
      fillRect(barX, y - 4, (score / 10) * barW, barH, scoreColor(score));

      // Score label
      setFont("bold", 9);
      setColor(scoreColor(score));
      doc.text(`${score}/10`, MARGIN + COL - 2, y, { align: "right" });

      y += 10;
    });
    y += 4;
  }

  // ══════════════════════════════════════════════════════════
  // PAGE 2 — Strengths, Improvements, Detailed Feedback
  // ══════════════════════════════════════════════════════════
  addPage();

  // ── Strengths ──────────────────────────────────────────────
  checkPageBreak(12);
  setFont("bold", 13);
  setColor([74, 222, 128]); // green
  doc.text("✓  Strengths", MARGIN, y);
  y += 8;

  (report.strengths || []).forEach((s) => {
    checkPageBreak(10);
    fillRect(MARGIN, y - 4, COL, 8, [15, 30, 20]);
    drawRect(MARGIN, y - 4, COL, 8, [22, 101, 52]);
    setFont("normal", 9);
    setColor([134, 239, 172]);
    wrappedText(`• ${s}`, MARGIN + 4, y, COL - 8, 6);
    y += 2;
  });

  y += 6;

  // ── Areas to Improve ───────────────────────────────────────
  checkPageBreak(12);
  setFont("bold", 13);
  setColor(YELLOW);
  doc.text("⚠  Areas to Improve", MARGIN, y);
  y += 8;

  (report.improvement_areas || []).forEach((s) => {
    checkPageBreak(10);
    fillRect(MARGIN, y - 4, COL, 8, [25, 20, 10]);
    drawRect(MARGIN, y - 4, COL, 8, [120, 80, 10]);
    setFont("normal", 9);
    setColor([253, 224, 71]);
    wrappedText(`• ${s}`, MARGIN + 4, y, COL - 8, 6);
    y += 2;
  });

  y += 8;

  // ── Detailed Feedback ──────────────────────────────────────
  checkPageBreak(16);
  setFont("bold", 13);
  setColor([165, 180, 252]);
  doc.text("Detailed Feedback", MARGIN, y);
  y += 8;

  fillRect(MARGIN, y - 4, COL, 6, CARD_BG);
  setFont("normal", 9);
  setColor(TEXT_MUTED);
  wrappedText(report.detailed_feedback || "", MARGIN + 2, y, COL - 4, 6);
  y += 6;

  // ══════════════════════════════════════════════════════════
  // PAGE(S) — Per Question Breakdown
  // ══════════════════════════════════════════════════════════
  addPage();

  setFont("bold", 14);
  setColor(TEXT_MAIN);
  doc.text("Question-by-Question Breakdown", MARGIN, y);
  y += 10;

  (report.per_question_breakdown || []).forEach((q, i) => {
    checkPageBreak(50);

    const qCardH = 10;

    // Question header bar
    fillRect(MARGIN, y, COL, qCardH, [30, 27, 75]);
    drawRect(MARGIN, y, COL, qCardH, BORDER);

    // Q number badge
    setFont("bold", 9);
    setColor([165, 180, 252]);
    doc.text(`Q${q.question_number}`, MARGIN + 3, y + 7);

    // Category
    setFont("normal", 8);
    setColor(TEXT_MUTED);
    doc.text(
      `${(q.category || "").replace("_", " ")}  ·  ${q.difficulty || ""}`,
      MARGIN + 16, y + 7
    );

    // Score (right aligned)
    const sc = scoreColor(q.score);
    setFont("bold", 10);
    setColor(sc);
    doc.text(`${q.score}/10`, MARGIN + COL - 3, y + 7, { align: "right" });

    y += qCardH + 3;

    // Question text
    setFont("bold", 9);
    setColor(TEXT_MAIN);
    wrappedText(q.question, MARGIN + 2, y, COL - 4, 5);
    y += 2;

    // Feedback
    setFont("normal", 8);
    setColor(TEXT_MUTED);
    wrappedText(q.feedback || "", MARGIN + 2, y, COL - 4, 5);

    y += 6;

    // Concepts covered
    if (q.concepts_covered?.length > 0) {
      checkPageBreak(8);
      setFont("bold", 8);
      setColor([74, 222, 128]);
      doc.text("Covered: ", MARGIN + 2, y);
      setFont("normal", 8);
      setColor([134, 239, 172]);
      const covered = q.concepts_covered.join("  ·  ");
      doc.text(covered, MARGIN + 22, y);
      y += 6;
    }

    // Concepts missed
    if (q.concepts_missed?.length > 0) {
      checkPageBreak(8);
      setFont("bold", 8);
      setColor([248, 113, 113]);
      doc.text("Missed: ", MARGIN + 2, y);
      setFont("normal", 8);
      setColor([252, 165, 165]);
      const missed = q.concepts_missed.join("  ·  ");
      doc.text(missed, MARGIN + 20, y);
      y += 6;
    }

    y += 4;
  });

  // ── Footer on last page ────────────────────────────────────
  checkPageBreak(12);
  y = 282;
  fillRect(0, y - 4, W, 15, [30, 27, 75]);
  setFont("normal", 8);
  setColor([165, 180, 252]);
  doc.text("AI Interview Platform  ·  github.com/sqqshh/AI-Interviewer", W / 2, y + 4, { align: "center" });

  // ── Save ───────────────────────────────────────────────────
  const filename = `interview-report-${(report.candidate_name || "candidate")
    .toLowerCase()
    .replace(/\s+/g, "-")}-${Date.now()}.pdf`;

  doc.save(filename);
}