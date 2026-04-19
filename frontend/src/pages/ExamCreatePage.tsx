import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/layout/Layout";
import { examsApi, type QuestionCreate } from "../api/exams";
import { loadSettings } from "../settings";

type Step = "metadata" | "questions" | "answer-key";

interface MetaForm {
  title: string;
  name: string;
  status: string;
}

export function ExamCreatePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("metadata");
  const [examId, setExamId] = useState<string | null>(null);
  const [meta, setMeta] = useState<MetaForm>({ title: "", name: "", status: "draft" });
  const defaultPassMark = loadSettings().defaultPassMark;
  const [questionType, setQuestionType] = useState<"type1" | "type2">("type1");
  const [questionCount, setQuestionCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleMetaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await examsApi.create({
        title: meta.title,
        name: meta.name,
        exam_date: new Date().toISOString().slice(0, 10),
        status: meta.status,
        pass_mark: defaultPassMark,
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
      const questions: QuestionCreate[] = Array.from({ length: questionCount }, (_, i) => ({
        question_number: i + 1,
        question_type: questionType,
      }));
      await examsApi.bulkCreateQuestions(examId, questions);
      await examsApi.update(examId, { total_questions: questionCount });
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
            Reference Name *
            <input
              required
              value={meta.name}
              onChange={(e) => setMeta({ ...meta, name: e.target.value })}
              style={styles.input}
              placeholder="e.g. SLMC-2024-A (for internal tracking)"
            />
          </label>
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
          <label style={styles.label}>
            Question Type
            <select
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value as "type1" | "type2")}
              style={styles.input}
            >
              <option value="type1">Type 1 — Single Best Answer (A–E)</option>
              <option value="type2">Type 2 — Extended True/False (T/F per A–E)</option>
            </select>
          </label>
          <label style={styles.label}>
            Number of Questions
            <input
              type="number"
              min={1}
              max={200}
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              style={styles.input}
            />
          </label>
          <button type="submit" disabled={saving || questionCount === 0} style={styles.btn}>
            {saving ? "Saving..." : "Next: Answer Key"}
          </button>
        </form>
      )}

      {step === "answer-key" && (
        <div style={styles.form}>
          <p>Questions created. You can set the answer key from the exam detail page.</p>
          <button onClick={handleFinish} style={styles.btn}>
            Go to Exam Detail
          </button>
        </div>
      )}
    </Layout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  h1: { fontSize: 24, fontWeight: 700, color: "#233654", marginBottom: 24 },
  steps: { display: "flex", gap: 16, marginBottom: 32 },
  step: { padding: "8px 16px", borderRadius: 6, background: "#e8e0d0", color: "#718096", fontSize: 13, fontWeight: 600 },
  activeStep: { background: "#ba3c3c", color: "#fff" },
  form: { background: "#fff", borderRadius: 8, padding: 32, maxWidth: 520, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", display: "flex", flexDirection: "column", gap: 16 },
  label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 14, fontWeight: 600, color: "#2d3748" },
  input: { padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 14, fontWeight: 400 },
  btn: { padding: "10px 24px", background: "#ba3c3c", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer", alignSelf: "flex-start" },
  error: { background: "#fff5f5", border: "1px solid #fc8181", color: "#c53030", padding: "10px 16px", borderRadius: 6, marginBottom: 16 },
};
