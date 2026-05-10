import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Layout } from "../components/layout/Layout";
import { candidatesApi, type Candidate } from "../api/candidates";
import { statsApi, type CandidatePerformance } from "../api/stats";
import { useAuth, hasRole } from "../auth/AuthContext";

export function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = hasRole(user, "admin", "creator");

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [performance, setPerformance] = useState<CandidatePerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    registration_number: "",
    name: "",
    date_of_birth: "",
    address: "",
    mobile: "",
  });

  useEffect(() => {
    if (!id) return;
    candidatesApi.get(id).then((res) => {
      setCandidate(res.data);
      setForm({
        registration_number: res.data.registration_number,
        name: res.data.name,
        date_of_birth: res.data.date_of_birth ?? "",
        address: res.data.address ?? "",
        mobile: res.data.mobile ?? "",
      });
      setLoading(false);
      statsApi.candidatePerformance(id).then((r) => setPerformance(r.data)).catch(() => {});
    }).catch(() => {
      setError("Candidate not found.");
      setLoading(false);
    });
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    setError("");
    try {
      const payload: Record<string, string | undefined> = {
        registration_number: form.registration_number,
        name: form.name,
        date_of_birth: form.date_of_birth || undefined,
        address: form.address || undefined,
        mobile: form.mobile || undefined,
      };
      const res = await candidatesApi.update(id, payload);
      setCandidate(res.data);
      setEditing(false);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !candidate) return;
    if (!confirm(`Delete candidate "${candidate.name}"? This cannot be undone.`)) return;
    try {
      await candidatesApi.delete(id);
      navigate("/candidates");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Delete failed.");
    }
  };

  if (loading) return <Layout><p style={{ color: "#718096" }}>Loading…</p></Layout>;

  if (!candidate && error) return (
    <Layout>
      <div style={styles.breadcrumb}>
        <Link to="/candidates" style={styles.breadLink}>Candidates</Link> / Not found
      </div>
      <p style={{ color: "#c53030" }}>{error}</p>
    </Layout>
  );

  return (
    <Layout>
      <div style={styles.breadcrumb}>
        <Link to="/candidates" style={styles.breadLink}>Candidates</Link>
        {" / "}
        <span style={{ color: "#718096" }}>{candidate!.name}</span>
      </div>

      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <h1 style={styles.h1}>{candidate!.name}</h1>
            <span style={styles.regBadge}>{candidate!.registration_number}</span>
          </div>
          {canEdit && !editing && (
            <div style={{ display: "flex", gap: 8 }}>
              <button style={styles.editBtn} onClick={() => setEditing(true)}>Edit</button>
              <button style={styles.deleteBtn} onClick={handleDelete}>Delete</button>
            </div>
          )}
        </div>

        {error && <div style={styles.alertErr}>{error}</div>}

        {editing ? (
          <form onSubmit={handleSave} style={styles.form}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Registration Number *</label>
              <input
                style={styles.input}
                value={form.registration_number}
                onChange={(e) => setForm(f => ({ ...f, registration_number: e.target.value }))}
                required
              />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Full Name *</label>
              <input
                style={styles.input}
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
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
                {saving ? "Saving…" : "Save Changes"}
              </button>
              <button
                type="button"
                style={styles.cancelBtn}
                onClick={() => { setEditing(false); setError(""); }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <dl style={styles.dl}>
            <div style={styles.dlRow}>
              <dt style={styles.dt}>Registration Number</dt>
              <dd style={styles.dd}>{candidate!.registration_number}</dd>
            </div>
            <div style={styles.dlRow}>
              <dt style={styles.dt}>Full Name</dt>
              <dd style={styles.dd}>{candidate!.name}</dd>
            </div>
            <div style={styles.dlRow}>
              <dt style={styles.dt}>Date of Birth</dt>
              <dd style={styles.dd}>
                {candidate!.date_of_birth
                  ? new Date(candidate!.date_of_birth).toLocaleDateString()
                  : <span style={{ color: "#a0aec0" }}>—</span>}
              </dd>
            </div>
            <div style={styles.dlRow}>
              <dt style={styles.dt}>Mobile</dt>
              <dd style={styles.dd}>{candidate!.mobile || <span style={{ color: "#a0aec0" }}>—</span>}</dd>
            </div>
            <div style={styles.dlRow}>
              <dt style={styles.dt}>Address</dt>
              <dd style={styles.dd}>
                {candidate!.address
                  ? <span style={{ whiteSpace: "pre-wrap" }}>{candidate!.address}</span>
                  : <span style={{ color: "#a0aec0" }}>—</span>}
              </dd>
            </div>
            <div style={styles.dlRow}>
              <dt style={styles.dt}>Registered</dt>
              <dd style={styles.dd}>{new Date(candidate!.created_at).toLocaleString()}</dd>
            </div>
          </dl>
        )}
      </div>

      {/* Cross-examination performance */}
      <div style={{ ...styles.card, marginTop: 24, maxWidth: "none" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#233654", marginBottom: 16 }}>
          Examination Performance
        </h2>
        {!performance ? (
          <p style={{ color: "#a0aec0", fontSize: 14 }}>Loading performance data…</p>
        ) : performance.examinations.length === 0 ? (
          <p style={{ color: "#a0aec0", fontSize: 14 }}>No examination results linked to this candidate yet.</p>
        ) : (
          performance.examinations.map((ex) => (
            <div key={ex.examination_id} style={pStyles.examBlock}>
              <div style={pStyles.examHeader}>
                <Link to={`/examinations/${ex.examination_id}`} style={pStyles.examLink}>
                  {ex.title}
                </Link>
                <span style={pStyles.overallBadge}>
                  Overall: {ex.overall_percentage.toFixed(1)}%
                </span>
              </div>
              <table style={pStyles.table}>
                <thead>
                  <tr>
                    <th style={pStyles.th}>Paper</th>
                    <th style={{ ...pStyles.th, textAlign: "right" }}>Score</th>
                    <th style={{ ...pStyles.th, textAlign: "right" }}>Percentage</th>
                    <th style={{ ...pStyles.th, textAlign: "right" }}>Pass Mark</th>
                    <th style={{ ...pStyles.th, textAlign: "right" }}>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {ex.papers.map((p) => (
                    <tr key={p.paper_id} style={pStyles.tr}>
                      <td style={pStyles.td}>
                        <Link to={`/exams/${p.paper_id}/results`} style={pStyles.paperLink}>
                          {p.title}
                        </Link>
                      </td>
                      <td style={{ ...pStyles.td, textAlign: "right" }}>{p.score.toFixed(1)}</td>
                      <td style={{ ...pStyles.td, textAlign: "right" }}>{p.percentage.toFixed(1)}%</td>
                      <td style={{ ...pStyles.td, textAlign: "right" }}>{p.pass_mark}%</td>
                      <td style={{ ...pStyles.td, textAlign: "right" }}>
                        <span style={{ ...pStyles.badge, ...(p.passed ? pStyles.pass : pStyles.fail) }}>
                          {p.passed ? "PASS" : "FAIL"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>
    </Layout>
  );
}

const pStyles: Record<string, React.CSSProperties> = {
  examBlock: { marginBottom: 20, border: "1px solid #e8e0d0", borderRadius: 8, overflow: "hidden" },
  examHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "12px 18px", background: "#f9f6f0", borderBottom: "1px solid #e8e0d0",
  },
  examLink: { fontSize: 14, fontWeight: 700, color: "#233654", textDecoration: "none" },
  overallBadge: { fontSize: 12, fontWeight: 700, color: "#718096" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "9px 18px", fontSize: 11, fontWeight: 600, color: "#718096", borderBottom: "1px solid #f0ebe0", textAlign: "left" as const },
  tr: { borderBottom: "1px solid #f7fafc" },
  td: { padding: "10px 18px", fontSize: 13, color: "#2d3748" },
  paperLink: { color: "#ba3c3c", textDecoration: "none", fontWeight: 600 },
  badge: { padding: "2px 9px", borderRadius: 99, fontSize: 11, fontWeight: 700 },
  pass: { background: "#c6f6d5", color: "#276749" },
  fail: { background: "#fed7d7", color: "#742a2a" },
};

const styles: Record<string, React.CSSProperties> = {
  breadcrumb: { fontSize: 13, color: "#718096", marginBottom: 20 },
  breadLink: { color: "#ba3c3c", textDecoration: "none", fontWeight: 500 },
  card: {
    background: "#fff",
    borderRadius: 10,
    padding: 32,
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
    maxWidth: 640,
  },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  h1: { fontSize: 22, fontWeight: 700, color: "#233654", margin: "0 0 8px" },
  regBadge: {
    display: "inline-block",
    background: "#f5f0e8",
    color: "#233654",
    padding: "2px 10px",
    borderRadius: 99,
    fontSize: 12,
    fontWeight: 600,
    border: "1px solid #d4c5a9",
  },
  editBtn: {
    padding: "7px 18px",
    background: "#233654",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
  },
  deleteBtn: {
    padding: "7px 18px",
    background: "#fff5f5",
    color: "#c53030",
    border: "1px solid #feb2b2",
    borderRadius: 6,
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
  },
  dl: { display: "flex", flexDirection: "column", gap: 0 },
  dlRow: {
    display: "grid",
    gridTemplateColumns: "180px 1fr",
    gap: 12,
    padding: "12px 0",
    borderBottom: "1px solid #f0ebe0",
  },
  dt: { fontSize: 13, fontWeight: 600, color: "#718096" },
  dd: { fontSize: 14, color: "#2d3748", margin: 0 },
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
  formActions: { display: "flex", gap: 10, marginTop: 8 },
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
