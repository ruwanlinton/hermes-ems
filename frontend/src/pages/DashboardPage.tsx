import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../components/layout/Layout";
import { examsApi, type Exam } from "../api/exams";
import { useAuth, hasRole } from "../auth/AuthContext";

export function DashboardPage() {
  const { user } = useAuth();
  const canCreate = hasRole(user, "admin", "creator");
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    examsApi.list().then((r) => {
      setExams(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const activeExams = exams.filter((e) => e.status === "active").length;
  const totalExams = exams.length;

  return (
    <Layout>
      <h1 style={styles.h1}>Dashboard</h1>

      <div style={styles.statsRow}>
        <StatCard label="Total Exams" value={totalExams} color="#233654" />
        <StatCard label="Active Exams" value={activeExams} color="#2d7a3a" />
        <StatCard label="Draft Exams" value={exams.filter((e) => e.status === "draft").length} color="#b79a62" />
        <StatCard label="Closed Exams" value={exams.filter((e) => e.status === "closed").length} color="#ba3c3c" />
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.h2}>Recent Exams</h2>
          {canCreate && <Link to="/exams/new" style={styles.createBtn}>+ New Exam</Link>}
        </div>

        {loading ? (
          <p style={styles.muted}>Loading...</p>
        ) : exams.length === 0 ? (
          <div style={styles.empty}>
            <p>No exams yet.{canCreate && <> <Link to="/exams/new" style={styles.link}>Create your first exam</Link>.</>}</p>
          </div>
        ) : (
          <div style={styles.examList}>
            {exams.slice(0, 5).map((exam) => (
              <Link key={exam.id} to={`/exams/${exam.id}`} style={styles.examCard}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={styles.examTitle}>{exam.title}</span>
                  <span style={{ ...styles.badge, ...statusBadge(exam.status) }}>
                    {exam.status}
                  </span>
                  {exam.question_type && (
                    <span style={styles.typeBadge}>
                      {exam.question_type === "type1" ? "Type 1" : "Type 2"}
                    </span>
                  )}
                </div>
                {exam.name && <div style={styles.examName}>{exam.name}</div>}
                <div style={styles.examMeta}>
                  {exam.total_questions} questions •{" "}
                  {exam.exam_date ? new Date(exam.exam_date).toLocaleDateString() : "No date set"}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={styles.statCard}>
      <div style={{ ...styles.statValue, color }}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

function statusBadge(status: string): React.CSSProperties {
  const map: Record<string, [string, string]> = {
    active:  ["#276749", "#c6f6d5"],
    draft:   ["#7b5e16", "#fef3c7"],
    closed:  ["#742a2a", "#fed7d7"],
  };
  const [color, bg] = map[status] || ["#2d3748", "#e2e8f0"];
  return { color, background: bg };
}

const styles: Record<string, React.CSSProperties> = {
  h1: { fontSize: 24, fontWeight: 700, color: "#233654", marginBottom: 24, fontFamily: "Roboto, sans-serif" },
  h2: { fontSize: 17, fontWeight: 600, color: "#233654" },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 },
  statCard: {
    background: "#fff",
    borderRadius: 6,
    padding: "20px 24px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
    textAlign: "center",
    borderTop: "3px solid #b79a62",
  },
  statValue: { fontSize: 32, fontWeight: 700, marginBottom: 4 },
  statLabel: { fontSize: 12, color: "#718096", fontWeight: 500 },
  section: { background: "#fff", borderRadius: 6, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  sectionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  createBtn: {
    padding: "8px 18px",
    background: "#ba3c3c",
    color: "#fff",
    textDecoration: "none",
    borderRadius: 4,
    fontSize: 13,
    fontWeight: 600,
  },
  empty: { padding: "32px 0", textAlign: "center", color: "#718096" },
  muted: { color: "#718096" },
  link: { color: "#ba3c3c" },
  examList: { display: "flex", flexDirection: "column", gap: 8 },
  examCard: {
    display: "block",
    padding: "14px 16px",
    border: "1px solid #e8e0d0",
    borderRadius: 6,
    textDecoration: "none",
    color: "inherit",
    borderLeft: "3px solid #b79a62",
  },
  examTitle: { fontWeight: 600, color: "#233654" },
  examName: { fontSize: 12, color: "#718096", fontWeight: 500, marginTop: 2 },
  badge: { fontSize: 11, padding: "2px 8px", borderRadius: 99, fontWeight: 600 },
  typeBadge: { fontSize: 11, padding: "2px 8px", borderRadius: 99, fontWeight: 600, background: "#e8f0fe", color: "#2b4acb" },
  examMeta: { fontSize: 13, color: "#718096", marginTop: 4 },
};
