import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../components/layout/Layout";
import { examsApi, type Exam } from "../api/exams";
import { useAuth, hasRole } from "../auth/AuthContext";

export function ExamsPage() {
  const { user } = useAuth();
  const canCreate = hasRole(user, "admin", "creator");
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    examsApi.list().then((r) => {
      setExams(r.data);
      setLoading(false);
    });
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this exam? This cannot be undone.")) return;
    await examsApi.delete(id);
    setExams((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <Layout>
      <div style={styles.header}>
        <h1 style={styles.h1}>Exams</h1>
        {canCreate && <Link to="/exams/new" style={styles.createBtn}>+ Create Exam</Link>}
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : exams.length === 0 ? (
        <div style={styles.empty}>
          <p>No exams found.{canCreate && <> <Link to="/exams/new">Create one</Link>.</>}</p>
        </div>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Title</th>
              <th style={styles.th}>Type</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Questions</th>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {exams.map((exam) => (
              <tr key={exam.id} style={styles.tr}>
                <td style={styles.td}>
                  <Link to={`/exams/${exam.id}`} style={styles.link}>{exam.title}</Link>
                  {exam.name && <div style={{ fontSize: 11, color: "#718096", marginTop: 2 }}>{exam.name}</div>}
                </td>
                <td style={styles.td}>
                  {exam.question_type
                    ? <span style={{ fontSize: 12, color: "#4a5568" }}>{exam.question_type === "type1" ? "Type 1" : "Type 2"}</span>
                    : <span style={{ fontSize: 12, color: "#cbd5e0" }}>—</span>}
                </td>
                <td style={styles.td}>
                  <span style={{ ...styles.badge, ...badgeColor(exam.status) }}>
                    {exam.status}
                  </span>
                </td>
                <td style={styles.td}>{exam.total_questions}</td>
                <td style={styles.td}>
                  {exam.exam_date ? new Date(exam.exam_date).toLocaleDateString() : "—"}
                </td>
                <td style={styles.td}>
                  <Link to={`/exams/${exam.id}`} style={styles.actionBtn}>View</Link>
                  {canCreate && (
                    <button
                      onClick={() => handleDelete(exam.id)}
                      style={{ ...styles.actionBtn, ...styles.deleteBtn }}
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Layout>
  );
}

function badgeColor(status: string): React.CSSProperties {
  const colors: Record<string, [string, string]> = {
    active: ["#276749", "#c6f6d5"],
    draft: ["#744210", "#fefcbf"],
    closed: ["#742a2a", "#fed7d7"],
  };
  const [color, bg] = colors[status] || ["#2d3748", "#e2e8f0"];
  return { color, background: bg };
}

const styles: Record<string, React.CSSProperties> = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  h1: { fontSize: 24, fontWeight: 700, color: "#233654" },
  createBtn: {
    padding: "10px 20px",
    background: "#ba3c3c",
    color: "#fff",
    textDecoration: "none",
    borderRadius: 6,
    fontWeight: 600,
    fontSize: 14,
  },
  empty: { textAlign: "center", padding: "48px 0", color: "#718096" },
  table: { width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  th: { padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#718096", background: "#f9f6f0", borderBottom: "1px solid #e2e8f0" },
  tr: { borderBottom: "1px solid #e2e8f0" },
  td: { padding: "12px 16px", fontSize: 14, color: "#2d3748" },
  link: { color: "#ba3c3c", textDecoration: "none", fontWeight: 600 },
  badge: { padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700 },
  actionBtn: {
    padding: "4px 12px",
    background: "#f5f0e8",
    color: "#233654",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 12,
    textDecoration: "none",
    marginRight: 6,
    display: "inline-block",
  },
  deleteBtn: { background: "#fff5f5", color: "#c53030" },
};
