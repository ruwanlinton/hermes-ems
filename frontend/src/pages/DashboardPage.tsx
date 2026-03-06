import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../components/layout/Layout";
import { examsApi, type Exam } from "../api/exams";

export function DashboardPage() {
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
        <StatCard label="Total Exams" value={totalExams} />
        <StatCard label="Active Exams" value={activeExams} />
        <StatCard label="Draft Exams" value={exams.filter((e) => e.status === "draft").length} />
        <StatCard label="Closed Exams" value={exams.filter((e) => e.status === "closed").length} />
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.h2}>Recent Exams</h2>
          <Link to="/exams/new" style={styles.createBtn}>+ New Exam</Link>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : exams.length === 0 ? (
          <div style={styles.empty}>
            <p>No exams yet. <Link to="/exams/new">Create your first exam</Link>.</p>
          </div>
        ) : (
          <div style={styles.examList}>
            {exams.slice(0, 5).map((exam) => (
              <Link key={exam.id} to={`/exams/${exam.id}`} style={styles.examCard}>
                <div>
                  <span style={styles.examTitle}>{exam.title}</span>
                  <span style={{ ...styles.badge, ...statusBadge(exam.status) }}>
                    {exam.status}
                  </span>
                </div>
                <div style={styles.examMeta}>
                  {exam.total_questions} questions •{" "}
                  {exam.exam_date ? new Date(exam.exam_date).toLocaleDateString() : "No date"}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

function statusBadge(status: string): React.CSSProperties {
  const colors: Record<string, string> = {
    active: "#c6f6d5",
    draft: "#fefcbf",
    closed: "#fed7d7",
  };
  return { background: colors[status] || "#e2e8f0" };
}

const styles: Record<string, React.CSSProperties> = {
  h1: { fontSize: 24, fontWeight: 700, color: "#1a365d", marginBottom: 24 },
  h2: { fontSize: 18, fontWeight: 600, color: "#2d3748" },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 },
  statCard: {
    background: "#fff",
    borderRadius: 8,
    padding: "20px 24px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
    textAlign: "center",
  },
  statValue: { fontSize: 32, fontWeight: 700, color: "#2b6cb0" },
  statLabel: { fontSize: 13, color: "#718096", marginTop: 4 },
  section: { background: "#fff", borderRadius: 8, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  sectionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  createBtn: {
    padding: "8px 16px",
    background: "#2b6cb0",
    color: "#fff",
    textDecoration: "none",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
  },
  empty: { padding: "32px 0", textAlign: "center", color: "#718096" },
  examList: { display: "flex", flexDirection: "column", gap: 8 },
  examCard: {
    display: "block",
    padding: "14px 16px",
    border: "1px solid #e2e8f0",
    borderRadius: 6,
    textDecoration: "none",
    color: "inherit",
  },
  examTitle: { fontWeight: 600, color: "#2d3748", marginRight: 8 },
  badge: { fontSize: 11, padding: "2px 8px", borderRadius: 99, fontWeight: 600 },
  examMeta: { fontSize: 13, color: "#718096", marginTop: 4 },
};
