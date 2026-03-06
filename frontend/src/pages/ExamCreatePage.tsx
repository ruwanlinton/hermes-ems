import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/layout/Layout";
import { examsApi, type QuestionCreate } from "../api/exams";

type Step = "metadata" | "questions" | "answer-key";

interface MetaForm {
  title: string;
  exam_date: string;
  status: string;
}

interface QRow {
  question_number: number;
  question_type: "type1" | "type2";
}

export function ExamCreatePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("metadata");
  const [examId, setExamId] = useState<string | null>(null);
  const [meta, setMeta] = useState<MetaForm>({ title: "", exam_date: "", status: "draft" });
  const [numType1, setNumType1] = useState(0);
  const [numType2, setNumType2] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleMetaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await examsApi.create({
        title: meta.title,
        exam_date: meta.exam_date || undefined,
        status: meta.status,
      });
      setExamId(res.data.id);
      setStep("questions");
    } catch {
      setError("Failed to create exam.");
    } finally {
      setSaving(false);
    }
  };

  const handleQuestionsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examId) return;
    setSaving(true);
    setError("");
    try {
      const questions: QuestionCreate[] = [];
      for (let i = 1; i <= numType1; i++) {
        questions.push({ question_number: i, question_type: "type1" });
      }
      for (let i = numType1 + 1; i <= numType1 + numType2; i++) {
        questions.push({ question_number: i, question_type: "type2" });
      }
      await examsApi.bulkCreateQuestions(examId, questions);
      await examsApi.update(examId, { total_questions: numType1 + numType2 });
      setStep("answer-key");
    } catch {
      setError("Failed to save questions.");
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = () => {
    if (examId) navigate(`/exams/${examId}`);
  };

  return (
    <Layout>
      <h1 style={styles.h1}>Create Exam</h1>

      <div style={styles.steps}>
        {(["metadata", "questions", "answer-key"] as Step[]).map((s, i) => (
          <div key={s} style={{ ...styles.step, ...(step === s ? styles.activeStep : {}) }}>
            {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
          </div>
        ))}
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {step === "metadata" && (
        <form onSubmit={handleMetaSubmit} style={styles.form}>
          <label style={styles.label}>
            Exam Title *
            <input
              required
              value={meta.title}
              onChange={(e) => setMeta({ ...meta, title: e.target.value })}
              style={styles.input}
              placeholder="e.g. SLMC Licensing Examination 2024"
            />
          </label>
          <label style={styles.label}>
            Exam Date
            <input
              type="date"
              value={meta.exam_date}
              onChange={(e) => setMeta({ ...meta, exam_date: e.target.value })}
              style={styles.input}
            />
          </label>
          <label style={styles.label}>
            Status
            <select
              value={meta.status}
              onChange={(e) => setMeta({ ...meta, status: e.target.value })}
              style={styles.input}
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
            </select>
          </label>
          <button type="submit" disabled={saving} style={styles.btn}>
            {saving ? "Creating..." : "Next: Questions"}
          </button>
        </form>
      )}

      {step === "questions" && (
        <form onSubmit={handleQuestionsSubmit} style={styles.form}>
          <p style={styles.hint}>
            Type 1 = Single best answer (A–E). Type 2 = True/False per sub-option (A–E).
          </p>
          <label style={styles.label}>
            Number of Type 1 Questions
            <input
              type="number"
              min={0}
              max={200}
              value={numType1}
              onChange={(e) => setNumType1(Number(e.target.value))}
              style={styles.input}
            />
          </label>
          <label style={styles.label}>
            Number of Type 2 Questions
            <input
              type="number"
              min={0}
              max={100}
              value={numType2}
              onChange={(e) => setNumType2(Number(e.target.value))}
              style={styles.input}
            />
          </label>
          <p style={{ color: "#718096", fontSize: 13 }}>
            Total: {numType1 + numType2} questions
          </p>
          <button type="submit" disabled={saving || numType1 + numType2 === 0} style={styles.btn}>
            {saving ? "Saving..." : "Next: Answer Key"}
          </button>
        </form>
      )}

      {step === "answer-key" && (
        <div style={styles.form}>
          <p>
            Questions created. You can set the answer key from the exam detail page.
          </p>
          <button onClick={handleFinish} style={styles.btn}>
            Go to Exam Detail
          </button>
        </div>
      )}
    </Layout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  h1: { fontSize: 24, fontWeight: 700, color: "#1a365d", marginBottom: 24 },
  steps: { display: "flex", gap: 16, marginBottom: 32 },
  step: { padding: "8px 16px", borderRadius: 6, background: "#e2e8f0", color: "#718096", fontSize: 13, fontWeight: 600 },
  activeStep: { background: "#2b6cb0", color: "#fff" },
  form: { background: "#fff", borderRadius: 8, padding: 32, maxWidth: 520, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", display: "flex", flexDirection: "column", gap: 16 },
  label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 14, fontWeight: 600, color: "#2d3748" },
  input: { padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 14, fontWeight: 400 },
  btn: {
    padding: "10px 24px",
    background: "#2b6cb0",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    alignSelf: "flex-start",
  },
  error: { background: "#fff5f5", border: "1px solid #fc8181", color: "#c53030", padding: "10px 16px", borderRadius: 6, marginBottom: 16 },
  hint: { color: "#718096", fontSize: 13 },
};
