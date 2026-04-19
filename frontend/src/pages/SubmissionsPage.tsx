import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ExamLayout } from "../components/layout/ExamLayout";
import { submissionsApi, type Submission } from "../api/submissions";
import { useAuth, hasRole } from "../auth/AuthContext";

export function SubmissionsPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const canDownload = hasRole(user, "admin", "creator", "marker");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [reprocessing, setReprocessing] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    submissionsApi.list(id).then((r) => {
      setSubmissions(r.data);
      setLoading(false);
    });
  }, [id]);

  const handleDownload = async (sub: Submission) => {
    if (!id) return;
    setDownloading(sub.id);
    try {
      const res = await submissionsApi.downloadImage(id, sub.id);
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sheet_${sub.index_number || sub.id.slice(0, 8)}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(null);
    }
  };

  const handleReprocess = async (submissionId: string) => {
    if (!id) return;
    setReprocessing(submissionId);
    try {
      const res = await submissionsApi.reprocess(id, submissionId);
      setSubmissions((prev) =>
        prev.map((s) => (s.id === submissionId ? res.data : s))
      );
    } finally {
      setReprocessing(null);
    }
  };

  const statusCounts = {
    completed: submissions.filter((s) => s.status === "completed").length,
    error: submissions.filter((s) => s.status === "error").length,
    pending: submissions.filter((s) => s.status === "pending").length,
  };

  return (
    <ExamLayout>

      <div style={styles.statsRow}>
        <StatBadge label="Total" value={submissions.length} color="#2d3748" bg="#e2e8f0" />
        <StatBadge label="Completed" value={statusCounts.completed} color="#276749" bg="#c6f6d5" />
        <StatBadge label="Errors" value={statusCounts.error} color="#742a2a" bg="#fed7d7" />
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : submissions.length === 0 ? (
        <div style={styles.empty}>No submissions yet.</div>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Index #</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Error Stage</th>
              <th style={styles.th}>Error</th>
              <th style={styles.th}>Created</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((sub) => (
              <tr key={sub.id} style={styles.tr}>
                <td style={styles.td}>{sub.index_number || "—"}</td>
                <td style={styles.td}>
                  <span style={{ ...styles.badge, ...statusBadge(sub.status) }}>
                    {sub.status}
                  </span>
                </td>
                <td style={styles.td}>{sub.error_stage || "—"}</td>
                <td style={{ ...styles.td, maxWidth: 200 }}>
                  <span style={styles.errText}>{sub.error_message || "—"}</span>
                </td>
                <td style={styles.td}>{new Date(sub.created_at).toLocaleString()}</td>
                <td style={{ ...styles.td, display: "flex", gap: 6, alignItems: "center" }}>
                  {canDownload && (
                    <button
                      onClick={() => handleDownload(sub)}
                      disabled={downloading === sub.id}
                      style={styles.downloadBtn}
                      title="Download scanned sheet"
                    >
                      {downloading === sub.id ? "..." : "Download"}
                    </button>
                  )}
                  {canDownload && (
                    <button
                      onClick={() => handleReprocess(sub.id)}
                      disabled={reprocessing === sub.id}
                      style={styles.reprocessBtn}
                      title="Re-run OMR pipeline on this sheet"
                    >
                      {reprocessing === sub.id ? "..." : "Reprocess"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </ExamLayout>
  );
}

function StatBadge({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div style={{ padding: "10px 20px", background: bg, color, borderRadius: 8, fontWeight: 700, fontSize: 14, textAlign: "center" }}>
      <div style={{ fontSize: 22 }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

function statusBadge(status: string): React.CSSProperties {
  const map: Record<string, React.CSSProperties> = {
    completed: { background: "#c6f6d5", color: "#276749" },
    error: { background: "#fed7d7", color: "#742a2a" },
    pending: { background: "#fefcbf", color: "#744210" },
    processing: { background: "#bee3f8", color: "#2c5282" },
  };
  return map[status] || {};
}

const styles: Record<string, React.CSSProperties> = {
  statsRow: { display: "flex", gap: 12, marginBottom: 20 },
  empty: { padding: "48px 0", textAlign: "center", color: "#718096" },
  table: { width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  th: { padding: "10px 12px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#718096", background: "#f7fafc", borderBottom: "1px solid #e2e8f0" },
  tr: { borderBottom: "1px solid #f7fafc" },
  td: { padding: "10px 12px", fontSize: 13, color: "#2d3748" },
  badge: { padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 700 },
  errText: { display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#c53030", maxWidth: 200 },
  downloadBtn: { padding: "4px 12px", background: "#f0fff4", color: "#276749", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12 },
  reprocessBtn: { padding: "4px 12px", background: "#ebf8ff", color: "#2b6cb0", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12 },
};
