import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Layout } from "../components/layout/Layout";
import { examinationsApi } from "../api/examinations";

export function ExaminationCreatePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    description: "",
    exam_date: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await examinationsApi.create({
        title: form.title,
        description: form.description || undefined,
        exam_date: form.exam_date || undefined,
        status: "draft",
      });
      navigate(`/examinations/${res.data.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to create examination.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div style={styles.breadcrumb}>
        <Link to="/examinations" style={styles.breadLink}>Examinations</Link> / New
      </div>

      <div style={styles.card}>
        <h1 style={styles.h1}>New Examination</h1>
        <p style={styles.hint}>An examination is a sitting (e.g. "SLMC Part 1 — May 2026"). Add subjects and papers after creating it.</p>

        {error && <div style={styles.alertErr}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Title *</label>
            <input
              style={styles.input}
              value={form.title}
              onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder='e.g. SLMC Part 1 — May 2026'
              required
            />
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Description</label>
            <textarea
              style={{ ...styles.input, height: 80, resize: "vertical" }}
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Optional notes about this sitting"
            />
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Examination Date</label>
            <input
              style={styles.input}
              type="date"
              value={form.exam_date}
              onChange={(e) => setForm(f => ({ ...f, exam_date: e.target.value }))}
            />
          </div>
          <div style={styles.formActions}>
            <button type="submit" style={styles.saveBtn} disabled={saving}>
              {saving ? "Creating…" : "Create Examination"}
            </button>
            <Link to="/examinations" style={styles.cancelBtn}>Cancel</Link>
          </div>
        </form>
      </div>
    </Layout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  breadcrumb: { fontSize: 13, color: "#718096", marginBottom: 20 },
  breadLink: { color: "#ba3c3c", textDecoration: "none", fontWeight: 500 },
  card: {
    background: "#fff",
    borderRadius: 10,
    padding: 32,
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
    maxWidth: 560,
  },
  h1: { fontSize: 20, fontWeight: 700, color: "#233654", margin: "0 0 6px" },
  hint: { fontSize: 13, color: "#718096", margin: "0 0 24px" },
  form: { display: "flex", flexDirection: "column", gap: 16 },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: 12, fontWeight: 600, color: "#718096" },
  input: {
    padding: "8px 12px",
    border: "1px solid #d4c5a9",
    borderRadius: 6,
    fontSize: 14,
    background: "#fff",
    fontFamily: "inherit",
  },
  formActions: { display: "flex", gap: 10, marginTop: 8, alignItems: "center" },
  saveBtn: {
    padding: "9px 22px",
    background: "#233654",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
  },
  cancelBtn: {
    padding: "9px 22px",
    background: "#f5f0e8",
    color: "#233654",
    border: "1px solid #d4c5a9",
    borderRadius: 6,
    fontWeight: 600,
    fontSize: 14,
    textDecoration: "none",
    display: "inline-block",
    cursor: "pointer",
  },
  alertErr: {
    background: "#fff5f5",
    border: "1px solid #feb2b2",
    borderRadius: 6,
    padding: "10px 14px",
    marginBottom: 16,
    fontSize: 13,
    color: "#742a2a",
  },
};
