import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ExamLayout } from "../components/layout/ExamLayout";
import { examsApi } from "../api/exams";
import { resultsApi, type Result, type ResultSummary } from "../api/results";
import { ScoreChart } from "../components/results/ScoreChart";

export function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const [results, setResults] = useState<Result[]>([]);
  const [summary, setSummary] = useState<ResultSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [passMark, setPassMark] = useState<number | null>(null);

  const loadData = async () => {
    if (!id) return;
    const [examRes, resData] = await Promise.all([
      examsApi.get(id),
      resultsApi.list(id),
    ]);
    const examPassMark = examRes.data.pass_mark ?? 50;
    setPassMark(examPassMark);
    const sumData = await resultsApi.summary(id, examPassMark);
    setResults(resData.data);
    setSummary(sumData.data);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [id]);
  useEffect(() => {
    if (!loading && passMark !== null) resultsApi.summary(id!, passMark).then((r) => setSummary(r.data));
  }, [passMark]);

  const handleExport = async (format: "csv" | "xlsx") => {
    if (!id) return;
    const res = await resultsApi.export(id, format);
    const ext = format === "csv" ? "csv" : "xlsx";
    const mime = format === "csv" ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    const url = URL.createObjectURL(new Blob([res.data], { type: mime }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `results_${id.slice(0, 8)}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ExamLayout>
      <div style={styles.header}>
        <div style={styles.exportBtns}>
          <button onClick={() => handleExport("csv")} style={styles.exportBtn}>Export CSV</button>
          <button onClick={() => handleExport("xlsx")} style={styles.exportBtn}>Export XLSX</button>
        </div>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          {summary && (
            <div style={styles.summaryGrid}>
              <SummaryCard label="Total Candidates" value={summary.total_candidates} />
              <SummaryCard label="Mean Score" value={`${summary.mean_percentage.toFixed(1)}%`} />
              <SummaryCard label="Highest" value={`${summary.highest_score.toFixed(1)}%`} />
              <SummaryCard label="Lowest" value={`${summary.lowest_score.toFixed(1)}%`} />
              <SummaryCard
                label="Pass Rate"
                value={`${summary.pass_percentage.toFixed(1)}%`}
                subtext={`${summary.pass_count} passed`}
              />
            </div>
          )}

          <div style={styles.passMarkRow}>
            <label style={styles.passMarkLabel}>
              Pass mark: {passMark ?? 50}%
              <input
                type="range"
                min={0}
                max={100}
                value={passMark ?? 50}
                onChange={(e) => setPassMark(Number(e.target.value))}
                style={styles.slider}
              />
            </label>
          </div>

          {summary && summary.distribution.length > 0 && (
            <div style={styles.chartSection}>
              <h2 style={styles.h2}>Score Distribution</h2>
              <ScoreChart distribution={summary.distribution} />
            </div>
          )}

          <div style={styles.tableSection}>
            <h2 style={styles.h2}>All Results ({results.length})</h2>
            {results.length === 0 ? (
              <p style={styles.empty}>No results yet.</p>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Index Number</th>
                    <th style={styles.th}>Score</th>
                    <th style={styles.th}>Percentage</th>
                    <th style={styles.th}>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.id} style={styles.tr}>
                      <td style={styles.td}>
                        <Link
                          to={`/exams/${id}/results/${encodeURIComponent(r.index_number)}`}
                          style={styles.indexLink}
                        >
                          {r.index_number}
                        </Link>
                      </td>
                      <td style={styles.td}>{r.score.toFixed(1)}</td>
                      <td style={styles.td}>{r.percentage.toFixed(1)}%</td>
                      <td style={styles.td}>
                        <span style={{ ...styles.badge, ...(r.percentage >= (passMark ?? 50) ? styles.pass : styles.fail) }}>
                          {r.percentage >= (passMark ?? 50) ? "PASS" : "FAIL"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </ExamLayout>
  );
}

function SummaryCard({ label, value, subtext }: { label: string; value: string | number; subtext?: string }) {
  return (
    <div style={styles.summaryCard}>
      <div style={styles.summaryVal}>{value}</div>
      <div style={styles.summaryLabel}>{label}</div>
      {subtext && <div style={styles.summarySubtext}>{subtext}</div>}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: 24 },
  h2: { fontSize: 16, fontWeight: 700, color: "#2d3748", marginBottom: 16 },
  exportBtns: { display: "flex", gap: 8 },
  exportBtn: { padding: "8px 16px", background: "#edf2f7", color: "#2d3748", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 },
  summaryGrid: { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 20 },
  summaryCard: { background: "#fff", borderRadius: 8, padding: "16px 20px", textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  summaryVal: { fontSize: 24, fontWeight: 700, color: "#2b6cb0" },
  summaryLabel: { fontSize: 11, color: "#718096", marginTop: 4 },
  summarySubtext: { fontSize: 11, color: "#a0aec0", marginTop: 2 },
  passMarkRow: { background: "#fff", borderRadius: 8, padding: "16px 24px", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  passMarkLabel: { display: "flex", alignItems: "center", gap: 12, fontSize: 14, fontWeight: 600, color: "#2d3748" },
  slider: { flex: 1, maxWidth: 300 },
  chartSection: { background: "#fff", borderRadius: 8, padding: "20px 24px", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  tableSection: { background: "#fff", borderRadius: 8, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  empty: { color: "#718096", fontSize: 14 },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "10px 12px", textAlign: "left" as const, fontSize: 12, fontWeight: 600, color: "#718096", borderBottom: "1px solid #e2e8f0" },
  tr: { borderBottom: "1px solid #f7fafc" },
  td: { padding: "10px 12px", fontSize: 13 },
  badge: { padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700 },
  pass: { background: "#c6f6d5", color: "#276749" },
  fail: { background: "#fed7d7", color: "#742a2a" },
  indexLink: { color: "#2b6cb0", fontWeight: 600, fontSize: 13, textDecoration: "underline" },
};
