import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Layout } from "../components/layout/Layout";
import { statsApi, type ExaminationStats } from "../api/stats";

export function ExaminationStatsPage() {
  const { eid } = useParams<{ eid: string }>();
  const [stats, setStats] = useState<ExaminationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!eid) return;
    statsApi.examinationStats(eid)
      .then((r) => setStats(r.data))
      .catch(() => setError("Failed to load stats."))
      .finally(() => setLoading(false));
  }, [eid]);

  if (loading) return <Layout><p style={{ color: "#718096" }}>Loading…</p></Layout>;
  if (error || !stats) return <Layout><p style={{ color: "#c53030" }}>{error || "Not found."}</p></Layout>;

  const totalCandidates = stats.subjects
    .flatMap((s) => s.papers)
    .reduce((sum, p) => sum + p.total_candidates, 0);
  const allPapers = stats.subjects.flatMap((s) => s.papers);
  const overallPassRate = allPapers.length > 0
    ? allPapers.reduce((sum, p) => sum + p.pass_rate, 0) / allPapers.length
    : 0;

  return (
    <Layout>
      <div style={styles.breadcrumb}>
        <Link to="/examinations" style={styles.breadLink}>Examinations</Link>
        {" / "}
        <Link to={`/examinations/${eid}`} style={styles.breadLink}>{stats.title}</Link>
        {" / "}
        <span style={{ color: "#718096" }}>Statistics</span>
      </div>

      <h1 style={styles.h1}>{stats.title} — Statistics</h1>

      {/* Top-level summary cards */}
      <div style={styles.summaryGrid}>
        <StatCard label="Enrolled Candidates" value={stats.total_enrolled_candidates} />
        <StatCard label="Total Submissions" value={totalCandidates} />
        <StatCard label="Papers" value={allPapers.length} />
        <StatCard label="Overall Pass Rate" value={`${overallPassRate.toFixed(1)}%`} highlight />
      </div>

      {/* Per-subject breakdown */}
      {stats.subjects.length === 0 ? (
        <div style={styles.empty}>No subjects in this examination.</div>
      ) : (
        stats.subjects.map((subject) => (
          <div key={subject.subject_id} style={styles.subjectCard}>
            <div style={styles.subjectHeader}>
              <span style={styles.subjectName}>{subject.subject_name}</span>
              <Link
                to={`/examinations/${eid}/subjects/${subject.subject_id}/stats`}
                style={styles.detailLink}
              >
                Full details →
              </Link>
            </div>

            {subject.papers.length === 0 ? (
              <div style={styles.emptyPapers}>No papers in this subject.</div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Paper</th>
                    <th style={{ ...styles.th, textAlign: "right" }}>Candidates</th>
                    <th style={{ ...styles.th, textAlign: "right" }}>Mean %</th>
                    <th style={{ ...styles.th, textAlign: "right" }}>Pass Rate</th>
                    <th style={{ ...styles.th, textAlign: "right" }}>Passed</th>
                  </tr>
                </thead>
                <tbody>
                  {subject.papers.map((p) => (
                    <tr key={p.paper_id} style={styles.tr}>
                      <td style={styles.td}>
                        <Link to={`/exams/${p.paper_id}/results`} style={styles.paperLink}>
                          {p.title}
                        </Link>
                      </td>
                      <td style={{ ...styles.td, textAlign: "right" }}>{p.total_candidates}</td>
                      <td style={{ ...styles.td, textAlign: "right" }}>{p.mean_percentage.toFixed(1)}%</td>
                      <td style={{ ...styles.td, textAlign: "right" }}>
                        <PassRateBar rate={p.pass_rate} />
                      </td>
                      <td style={{ ...styles.td, textAlign: "right" }}>{p.pass_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))
      )}
    </Layout>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div style={styles.statCard}>
      <div style={{ ...styles.statVal, color: highlight ? "#b79a62" : "#233654" }}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

function PassRateBar({ rate }: { rate: number }) {
  const color = rate >= 70 ? "#276749" : rate >= 50 ? "#b79a62" : "#c53030";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
      <div style={{ width: 80, height: 8, background: "#e2e8f0", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ width: `${rate}%`, height: "100%", background: color, borderRadius: 99 }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color, minWidth: 42, textAlign: "right" }}>
        {rate.toFixed(1)}%
      </span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  breadcrumb: { fontSize: 13, color: "#718096", marginBottom: 16 },
  breadLink: { color: "#ba3c3c", textDecoration: "none", fontWeight: 500 },
  h1: { fontSize: 22, fontWeight: 700, color: "#233654", marginBottom: 20 },
  summaryGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 },
  statCard: {
    background: "#fff", borderRadius: 8, padding: "18px 22px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)", textAlign: "center",
  },
  statVal: { fontSize: 28, fontWeight: 700 },
  statLabel: { fontSize: 11, color: "#718096", marginTop: 4 },
  subjectCard: {
    background: "#fff", borderRadius: 8, marginBottom: 16,
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)", overflow: "hidden",
  },
  subjectHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "14px 20px", background: "#f9f6f0", borderBottom: "1px solid #e8e0d0",
  },
  subjectName: { fontSize: 15, fontWeight: 700, color: "#233654" },
  detailLink: { fontSize: 12, color: "#ba3c3c", textDecoration: "none", fontWeight: 600 },
  emptyPapers: { padding: "20px", textAlign: "center", color: "#a0aec0", fontSize: 14 },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "10px 20px", fontSize: 11, fontWeight: 600, color: "#718096", borderBottom: "1px solid #f0ebe0", textAlign: "left" as const },
  tr: { borderBottom: "1px solid #f7fafc" },
  td: { padding: "11px 20px", fontSize: 13, color: "#2d3748" },
  paperLink: { color: "#ba3c3c", textDecoration: "none", fontWeight: 600 },
  empty: { background: "#fff", borderRadius: 8, padding: 32, textAlign: "center", color: "#718096" },
};
