import { useState } from "react";
import { useParams } from "react-router-dom";
import { Layout } from "../components/layout/Layout";
import { DropZone } from "../components/upload/DropZone";
import { submissionsApi, type BatchResult } from "../api/submissions";

interface FileStatus {
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  result?: BatchResult;
}

export function UploadPage() {
  const { id } = useParams<{ id: string }>();
  const [files, setFiles] = useState<FileStatus[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFiles = (newFiles: File[]) => {
    setFiles((prev) => [
      ...prev,
      ...newFiles.map((f) => ({ file: f, status: "pending" as const })),
    ]);
  };

  const handleUpload = async () => {
    if (!id || files.length === 0) return;
    setUploading(true);

    const pending = files.filter((f) => f.status === "pending");

    if (pending.length === 1) {
      // Single file upload
      const item = pending[0];
      setFiles((prev) =>
        prev.map((f) => f.file === item.file ? { ...f, status: "uploading" } : f)
      );
      try {
        const res = await submissionsApi.upload(id, item.file);
        setFiles((prev) =>
          prev.map((f) =>
            f.file === item.file
              ? {
                  ...f,
                  status: res.data.status === "completed" ? "done" : "error",
                  result: {
                    filename: item.file.name,
                    submission_id: res.data.id,
                    status: res.data.status,
                    index_number: res.data.index_number ?? undefined,
                    error_stage: res.data.error_stage ?? undefined,
                    error_message: res.data.error_message ?? undefined,
                  },
                }
              : f
          )
        );
      } catch {
        setFiles((prev) =>
          prev.map((f) =>
            f.file === item.file
              ? { ...f, status: "error", result: { filename: item.file.name, status: "error", error_message: "Upload failed" } }
              : f
          )
        );
      }
    } else {
      // Batch upload
      setFiles((prev) =>
        prev.map((f) => f.status === "pending" ? { ...f, status: "uploading" } : f)
      );
      try {
        const res = await submissionsApi.batchUpload(id, pending.map((f) => f.file));
        const resultMap = new Map(res.data.results.map((r) => [r.filename, r]));
        setFiles((prev) =>
          prev.map((f) => {
            const r = resultMap.get(f.file.name);
            if (!r) return f;
            return {
              ...f,
              status: r.status === "completed" ? "done" : "error",
              result: r,
            };
          })
        );
      } catch {
        setFiles((prev) =>
          prev.map((f) =>
            f.status === "uploading"
              ? { ...f, status: "error", result: { filename: f.file.name, status: "error" } }
              : f
          )
        );
      }
    }
    setUploading(false);
  };

  const clearDone = () => setFiles((prev) => prev.filter((f) => f.status !== "done"));
  const pendingCount = files.filter((f) => f.status === "pending").length;

  return (
    <Layout>
      <h1 style={styles.h1}>Upload OMR Sheets</h1>

      <div style={styles.dropArea}>
        <DropZone onFiles={handleFiles} multiple />
      </div>

      {files.length > 0 && (
        <div style={styles.fileList}>
          <div style={styles.fileListHeader}>
            <span style={styles.fileCount}>{files.length} file(s)</span>
            <div>
              <button onClick={clearDone} style={styles.clearBtn}>Clear Done</button>
              <button
                onClick={handleUpload}
                disabled={uploading || pendingCount === 0}
                style={{ ...styles.uploadBtn, ...(uploading || pendingCount === 0 ? styles.btnDisabled : {}) }}
              >
                {uploading ? "Processing..." : `Process ${pendingCount} file(s)`}
              </button>
            </div>
          </div>

          {files.map((item, i) => (
            <div key={i} style={styles.fileItem}>
              <div style={styles.fileName}>{item.file.name}</div>
              <div style={styles.fileSize}>{(item.file.size / 1024).toFixed(0)} KB</div>
              <div style={{ ...styles.statusBadge, ...statusStyle(item.status) }}>
                {item.status}
              </div>
              {item.result && (
                <div style={styles.resultInfo}>
                  {item.result.index_number && (
                    <span style={styles.indexNum}>#{item.result.index_number}</span>
                  )}
                  {item.result.error_message && (
                    <span style={styles.errMsg}>{item.result.error_message}</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}

function statusStyle(status: string): React.CSSProperties {
  const map: Record<string, React.CSSProperties> = {
    pending: { background: "#fefcbf", color: "#744210" },
    uploading: { background: "#bee3f8", color: "#2c5282" },
    done: { background: "#c6f6d5", color: "#276749" },
    error: { background: "#fed7d7", color: "#742a2a" },
  };
  return map[status] || {};
}

const styles: Record<string, React.CSSProperties> = {
  h1: { fontSize: 22, fontWeight: 700, color: "#1a365d", marginBottom: 24 },
  dropArea: { marginBottom: 24 },
  fileList: { background: "#fff", borderRadius: 8, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  fileListHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  fileCount: { fontSize: 14, fontWeight: 600, color: "#2d3748" },
  clearBtn: { padding: "6px 14px", background: "#e2e8f0", color: "#4a5568", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, marginRight: 8 },
  uploadBtn: { padding: "8px 20px", background: "#2b6cb0", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 },
  btnDisabled: { background: "#a0aec0", cursor: "not-allowed" },
  fileItem: { display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #f7fafc" },
  fileName: { flex: 1, fontSize: 13, color: "#2d3748", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  fileSize: { fontSize: 12, color: "#a0aec0", minWidth: 60 },
  statusBadge: { padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, minWidth: 70, textAlign: "center" },
  resultInfo: { display: "flex", flexDirection: "column", gap: 2, fontSize: 12 },
  indexNum: { color: "#276749", fontWeight: 600 },
  errMsg: { color: "#c53030", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" },
};
