import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Layout } from "../components/layout/Layout";
import { statsApi, type SubjectStats } from "../api/stats";

export function SubjectStatsPage() {
  const { eid, sid } = useParams<{ eid: string; sid: string }>();
  const [stats, setStats] = useState<SubjectStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!eid || !sid) return;
    statsApi.subjectStats(eid, sid)
      .then((r) => setStats(r.data))
      .catch(() => setError("Failed to load subject stats."))
      .finally(() => setLoading(false));
  }, [eid, sid]);

  if (loading) return <Layout><p style={{ color: "#718096" }}>Loading…</p></Layout>;
  if (error || !stats) return <Layout><p style={{ color: "#c53030" }}>{error || "Not found."}</p></Layout>;

  const totalCandidates = stats.papers.reduce((s, p) => s + p.total_candidates, 0);
  const avgPassRate = stats.papers.length > 0
    ? stats.papers.reduce((s, p) => s + p.pass_rate, 0) / stats.papers.length
    : 0;

  return (
    <Layout>
      <div style={styles.breadcrumb}>
        <Link to="/examinations" style={styles.breadLink}>Examinations</Link>
        {" / "}
        <Link to={`/examinations/${eid}`} style={styles.breadLink}>Examination</Link>
        {" / "}
        <Link to={`/examinations/${eid}/stats`} style={styles.breadLink}>Statistics</Link>
        {" / "}
        <span style={{ color: "#718096" }}>{stats.subject_name}</span>
      </div>

      <h1 style={styles.h1}>{stats.subject_name} — Subject Statistics</h1>

      <div style={styles.summaryGrid}>
        <StatCard label="Total Submissions" value={totalCandidates} />
        <StatCard label="Papers" value={stats.papers.length} />
        <StatCard label="Avg Pass Rate" value={`${avgPassRate.toFixed(1)}%`} highlight />
      </div>

      <div style={styles.card}>
        <h2 style={styles.h2}>Papers</h2>
        {stats.papers.length === 0 ? (
          <div style={styles.empty}>No papers in this subject.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Paper</th>
                <th style={{ ...styles.th, textAlign: "right" }}>Candidates</th>
                <th style={{ ...styles.th, textAlign: "right" }}>Mean %</th>
                <th style={{ ...styles.th, textAlign: "right" }}>Pass Rate</th>
                <th style={{ ...styles.th, textAlign: "right" }}>Passed / Total</th>
              </tr>
            </thead>
            <tbody>
              {stats.papers.map((p) => (
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
                  <td style={{ ...styles.td, textAlign: "right" }}>
                    {p.pass_count} / {p.total_candidates}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
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
        <div style={{ width: `${Math.min(rate, 100)}%`, height: "100%", background: color, borderRadius: 99 }} />
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
  summaryGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 },
  statCard: { background: "#fff", borderRadius: 8, padding: "18px 22px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", textAlign: "center" },
  statVal: { fontSize: 28, fontWeight: 700 },
  statLabel: { fontSize: 11, color: "#718096", marginTop: 4 },
  card: { background: "#fff", borderRadius: 8, padding: "20px 0", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  h2: { fontSize: 15, fontWeight: 700, color: "#233654", marginBottom: 12, padding: "0 20px" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "10px 20px", fontSize: 11, fontWeight: 600, color: "#718096", borderBottom: "1px solid #f0ebe0", textAlign: "left" as const },
  tr: { borderBottom: "1px solid #f7fafc" },
  td: { padding: "11px 20px", fontSize: 13, color: "#2d3748" },
  paperLink: { color: "#ba3c3c", textDecoration: "none", fontWeight: 600 },
  empty: { padding: "24px 20px", color: "#a0aec0", fontSize: 14 },
};
