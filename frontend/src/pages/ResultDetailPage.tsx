import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Layout } from "../components/layout/Layout";
import { resultsApi, type ResultDetail, type QuestionDetail } from "../api/results";

const PASS_MARK = 50;

export function ResultDetailPage() {
  const { id, indexNumber } = useParams<{ id: string; indexNumber: string }>();
  const [detail, setDetail] = useState<ResultDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id || !indexNumber) return;
    resultsApi.detail(id, decodeURIComponent(indexNumber))
      .then((r) => setDetail(r.data))
      .catch(() => setError("Failed to load result detail."))
      .finally(() => setLoading(false));
  }, [id, indexNumber]);

  const passed = detail ? detail.percentage >= PASS_MARK : false;

  return (
    <Layout>
      <div style={styles.breadcrumb}>
        <Link to={`/exams/${id}/results`} style={styles.backLink}>← Back to Results</Link>
      </div>

      {loading && <p style={styles.loading}>Loading...</p>}
      {error && <p style={styles.error}>{error}</p>}

      {detail && (
        <>
          <div style={styles.header}>
            <div>
              <h1 style={styles.h1}>Index #{detail.index_number}</h1>
              <div style={styles.scoreLine}>
                <span style={styles.scoreVal}>{detail.score.toFixed(1)} pts</span>
                <span style={styles.sep}>·</span>
                <span style={styles.scoreVal}>{detail.percentage.toFixed(1)}%</span>
                <span style={{ ...styles.badge, ...(passed ? styles.pass : styles.fail) }}>
                  {passed ? "PASS" : "FAIL"}
                </span>
              </div>
            </div>
          </div>

          <div style={styles.card}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Q#</th>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Marked</th>
                  <th style={styles.th}>Correct</th>
                  <th style={styles.th}>Score</th>
                  <th style={styles.th}>Result</th>
                </tr>
              </thead>
              <tbody>
                {detail.questions.map((q) => (
                  <QuestionRow key={q.question_number} q={q} />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Layout>
  );
}

function QuestionRow({ q }: { q: QuestionDetail }) {
  const OPTIONS = ["A", "B", "C", "D", "E"];
  const isCorrect = q.question_type === "type1" ? q.score === 1.0 : q.score >= 1.0;

  if (q.question_type === "type1") {
    const marked = q.marked as string | null;
    const correct = q.correct as string | null;
    return (
      <tr style={styles.tr}>
        <td style={styles.td}>{q.question_number}</td>
        <td style={styles.td}><span style={styles.typeBadge}>T1</span></td>
        <td style={styles.td}>
          <span style={marked ? { ...styles.optionBadge, ...(marked === correct ? styles.optCorrect : styles.optWrong) } : styles.optionNone}>
            {marked ?? "—"}
          </span>
        </td>
        <td style={styles.td}>
          <span style={styles.optionBadge}>{correct ?? "—"}</span>
        </td>
        <td style={styles.td}>{q.score.toFixed(1)}</td>
        <td style={styles.td}>
          <span style={isCorrect ? styles.tickCorrect : styles.tickWrong}>{isCorrect ? "✓" : "✗"}</span>
        </td>
      </tr>
    );
  }

  // type2 — sub-option T/F grid
  const marked = (q.marked ?? {}) as Record<string, boolean>;
  const correct = (q.correct ?? {}) as Record<string, boolean>;
  const maxScore = 1.0;

  return (
    <tr style={styles.tr}>
      <td style={styles.td}>{q.question_number}</td>
      <td style={styles.td}><span style={{ ...styles.typeBadge, background: "#ebf4ff", color: "#2b6cb0" }}>T2</span></td>
      <td colSpan={3} style={styles.td}>
        <div style={styles.tfGrid}>
          {OPTIONS.map((opt) => {
            const mv = marked[opt];
            const cv = correct[opt];
            const subCorrect = mv === cv;
            return (
              <div key={opt} style={styles.tfCell}>
                <span style={styles.tfLabel}>{opt}</span>
                <span style={{ ...styles.tfVal, ...(subCorrect ? styles.tfCorrect : styles.tfWrong) }}>
                  {mv === undefined ? "—" : mv ? "T" : "F"}
                </span>
                <span style={styles.tfExpected}>{cv === undefined ? "" : cv ? "T" : "F"}</span>
              </div>
            );
          })}
        </div>
      </td>
      <td style={styles.td}>
        <span style={{ fontWeight: 600, color: q.score >= maxScore ? "#276749" : q.score > 0 ? "#744210" : "#742a2a" }}>
          {q.score.toFixed(2)} / {maxScore.toFixed(1)}
        </span>
      </td>
    </tr>
  );
}

const styles: Record<string, React.CSSProperties> = {
  breadcrumb: { marginBottom: 16 },
  backLink: { color: "#2b6cb0", fontSize: 14, textDecoration: "none", fontWeight: 500 },
  loading: { color: "#718096", fontSize: 14 },
  error: { color: "#c53030", fontSize: 14 },
  header: { marginBottom: 24 },
  h1: { fontSize: 22, fontWeight: 700, color: "#1a365d", marginBottom: 8 },
  scoreLine: { display: "flex", alignItems: "center", gap: 10, fontSize: 16 },
  scoreVal: { fontWeight: 600, color: "#2d3748" },
  sep: { color: "#a0aec0" },
  badge: { padding: "3px 12px", borderRadius: 99, fontSize: 12, fontWeight: 700 },
  pass: { background: "#c6f6d5", color: "#276749" },
  fail: { background: "#fed7d7", color: "#742a2a" },
  card: { background: "#fff", borderRadius: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "10px 14px", textAlign: "left" as const, fontSize: 12, fontWeight: 600, color: "#718096", background: "#f7fafc", borderBottom: "1px solid #e2e8f0" },
  tr: { borderBottom: "1px solid #f7fafc" },
  td: { padding: "10px 14px", fontSize: 13, color: "#2d3748" },
  typeBadge: { padding: "1px 7px", borderRadius: 4, fontSize: 11, fontWeight: 700, background: "#fefcbf", color: "#744210" },
  optionBadge: { padding: "2px 10px", borderRadius: 4, fontSize: 13, fontWeight: 700, background: "#edf2f7", color: "#2d3748" },
  optCorrect: { background: "#c6f6d5", color: "#276749" },
  optWrong: { background: "#fed7d7", color: "#742a2a" },
  optionNone: { color: "#a0aec0", fontSize: 13 },
  tickCorrect: { color: "#276749", fontWeight: 700, fontSize: 16 },
  tickWrong: { color: "#742a2a", fontWeight: 700, fontSize: 16 },
  tfGrid: { display: "flex", gap: 8 },
  tfCell: { display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 2, minWidth: 30 },
  tfLabel: { fontSize: 11, fontWeight: 700, color: "#718096" },
  tfVal: { fontSize: 12, fontWeight: 700, padding: "1px 6px", borderRadius: 4 },
  tfCorrect: { background: "#c6f6d5", color: "#276749" },
  tfWrong: { background: "#fed7d7", color: "#742a2a" },
  tfExpected: { fontSize: 10, color: "#a0aec0" },
};
