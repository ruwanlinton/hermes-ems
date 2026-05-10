import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Layout } from "../components/layout/Layout";
import { candidatesApi } from "../api/candidates";

export function CandidateCreatePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    registration_number: "",
    name: "",
    date_of_birth: "",
    address: "",
    mobile: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await candidatesApi.create({
        registration_number: form.registration_number,
        name: form.name,
        date_of_birth: form.date_of_birth || undefined,
        address: form.address || undefined,
        mobile: form.mobile || undefined,
      });
      navigate(`/candidates/${res.data.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to create candidate.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div style={styles.breadcrumb}>
        <Link to="/candidates" style={styles.breadLink}>Candidates</Link> / New Candidate
      </div>

      <div style={styles.card}>
        <h1 style={styles.h1}>Add Candidate</h1>

        {error && <div style={styles.alertErr}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Registration Number *</label>
            <input
              style={styles.input}
              value={form.registration_number}
              onChange={(e) => setForm(f => ({ ...f, registration_number: e.target.value }))}
              placeholder="e.g. SLMC-2026-001"
              required
            />
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Full Name *</label>
            <input
              style={styles.input}
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Full name as on NIC"
              required
            />
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Date of Birth</label>
            <input
              style={styles.input}
              type="date"
              value={form.date_of_birth}
              onChange={(e) => setForm(f => ({ ...f, date_of_birth: e.target.value }))}
            />
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Mobile</label>
            <input
              style={styles.input}
              value={form.mobile}
              onChange={(e) => setForm(f => ({ ...f, mobile: e.target.value }))}
              placeholder="+94 7X XXX XXXX"
            />
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Address</label>
            <textarea
              style={{ ...styles.input, height: 80, resize: "vertical" }}
              value={form.address}
              onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))}
            />
          </div>
          <div style={styles.formActions}>
            <button type="submit" style={styles.saveBtn} disabled={saving}>
              {saving ? "Saving…" : "Create Candidate"}
            </button>
            <Link to="/candidates" style={styles.cancelBtn}>Cancel</Link>
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
  h1: { fontSize: 20, fontWeight: 700, color: "#233654", margin: "0 0 24px" },
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
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-block",
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
