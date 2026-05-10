import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ExamLayout } from "../components/layout/ExamLayout";
import { examsApi } from "../api/exams";
import { resultsApi, type Result, type ResultSummary } from "../api/results";
import { statsApi, type QuestionStat } from "../api/stats";
import { ScoreChart } from "../components/results/ScoreChart";

export function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<"results" | "questions">("results");
  const [results, setResults] = useState<Result[]>([]);
  const [summary, setSummary] = useState<ResultSummary | null>(null);
  const [questionStats, setQuestionStats] = useState<QuestionStat[]>([]);
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

  useEffect(() => {
    if (tab === "questions" && id && questionStats.length === 0) {
      statsApi.questionStats(id).then((r) => setQuestionStats(r.data)).catch(() => {});
    }
  }, [tab, id]);

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
        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(tab === "results" ? styles.tabActive : {}) }}
            onClick={() => setTab("results")}
          >
            Results
          </button>
          <button
            style={{ ...styles.tab, ...(tab === "questions" ? styles.tabActive : {}) }}
            onClick={() => setTab("questions")}
          >
            Question Analysis
          </button>
        </div>
        {tab === "results" && (
          <div style={styles.exportBtns}>
            <button onClick={() => handleExport("csv")} style={styles.exportBtn}>Export CSV</button>
            <button onClick={() => handleExport("xlsx")} style={styles.exportBtn}>Export XLSX</button>
          </div>
        )}
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : tab === "results" ? (
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
      ) : (
        /* Question Analysis tab */
        <div style={styles.tableSection}>
          <h2 style={styles.h2}>Per-Question Analysis</h2>
          {questionStats.length === 0 ? (
            <p style={styles.empty}>No question stats available. Process submissions first.</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Q#</th>
                  <th style={styles.th}>Type</th>
                  <th style={{ ...styles.th, textAlign: "right" }}>Responses</th>
                  <th style={{ ...styles.th, textAlign: "right" }}>Correct</th>
                  <th style={{ ...styles.th, textAlign: "right" }}>Wrong</th>
                  <th style={{ ...styles.th, textAlign: "right" }}>Multiple</th>
                  <th style={{ ...styles.th, textAlign: "right" }}>Unanswered</th>
                  <th style={{ ...styles.th, textAlign: "right" }}>Correct Rate</th>
                </tr>
              </thead>
              <tbody>
                {questionStats.map((q) => (
                  <tr key={q.question_number} style={styles.tr}>
                    <td style={{ ...styles.td, fontWeight: 700 }}>{q.question_number}</td>
                    <td style={styles.td}>
                      <span style={styles.typeBadge}>{q.question_type}</span>
                    </td>
                    <td style={{ ...styles.td, textAlign: "right" }}>{q.total_responses}</td>
                    <td style={{ ...styles.td, textAlign: "right", color: "#276749", fontWeight: 600 }}>{q.correct}</td>
                    <td style={{ ...styles.td, textAlign: "right", color: "#742a2a" }}>{q.wrong}</td>
                    <td style={{ ...styles.td, textAlign: "right", color: "#b79a62" }}>{q.multiple}</td>
                    <td style={{ ...styles.td, textAlign: "right", color: "#718096" }}>{q.unanswered}</td>
                    <td style={{ ...styles.td, textAlign: "right" }}>
                      <CorrectRateBar rate={q.correct_rate} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </ExamLayout>
  );
}

function CorrectRateBar({ rate }: { rate: number }) {
  const pct = Math.round(rate * 100);
  const color = pct >= 70 ? "#276749" : pct >= 40 ? "#b79a62" : "#c53030";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
      <div style={{ width: 70, height: 7, background: "#e2e8f0", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99 }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 36, textAlign: "right" }}>{pct}%</span>
    </div>
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
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  tabs: { display: "flex", gap: 4 },
  tab: {
    padding: "7px 18px", background: "transparent", border: "1px solid #d4c5a9",
    borderRadius: 6, fontSize: 13, fontWeight: 600, color: "#718096", cursor: "pointer",
  },
  tabActive: { background: "#233654", color: "#fff", borderColor: "#233654" },
  typeBadge: { fontSize: 10, fontWeight: 700, background: "#e2e8f0", color: "#4a5568", padding: "2px 7px", borderRadius: 99 },
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
