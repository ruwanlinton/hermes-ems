import { useState } from "react";
import { useParams } from "react-router-dom";
import { Layout } from "../components/layout/Layout";
import { examsApi } from "../api/exams";

export function SheetGeneratorPage() {
  const { id } = useParams<{ id: string }>();
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!id || !csvFile) return;
    setGenerating(true);
    setError("");
    try {
      const res = await examsApi.generateSheets(id, csvFile);
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `omr_sheets_${id.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setError("Failed to generate sheets. Check that the CSV has an 'index_number' column.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Layout>
      <h1 style={styles.h1}>Generate OMR Sheets</h1>

      <div style={styles.card}>
        <p style={styles.desc}>
          Upload a CSV file with an <code>index_number</code> column. One answer sheet will be
          generated per row, encoded with a QR code linking the sheet to this exam.
        </p>

        <div style={styles.csvTemplate}>
          <strong>CSV format example:</strong>
          <pre style={styles.pre}>{`index_number\n2024001\n2024002\n2024003`}</pre>
          <a
            href={`data:text/csv;charset=utf-8,index_number%0A2024001%0A2024002`}
            download="index_numbers_template.csv"
            style={styles.templateLink}
          >
            Download template
          </a>
        </div>

        <label style={styles.label}>
          CSV File
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
            style={styles.fileInput}
          />
        </label>

        {csvFile && (
          <p style={styles.fileInfo}>Selected: {csvFile.name}</p>
        )}

        {error && <div style={styles.error}>{error}</div>}

        <button
          onClick={handleGenerate}
          disabled={!csvFile || generating}
          style={{ ...styles.btn, ...(!csvFile || generating ? styles.btnDisabled : {}) }}
        >
          {generating ? "Generating PDF..." : "Generate & Download PDF"}
        </button>
      </div>
    </Layout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  h1: { fontSize: 22, fontWeight: 700, color: "#1a365d", marginBottom: 24 },
  card: { background: "#fff", borderRadius: 8, padding: 32, maxWidth: 560, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", display: "flex", flexDirection: "column", gap: 20 },
  desc: { fontSize: 14, color: "#4a5568", lineHeight: 1.6 },
  csvTemplate: { background: "#f7fafc", borderRadius: 6, padding: 16, fontSize: 13 },
  pre: { background: "#edf2f7", borderRadius: 4, padding: 10, fontSize: 12, overflowX: "auto", marginTop: 8 },
  templateLink: { color: "#2b6cb0", fontSize: 12, marginTop: 8, display: "inline-block" },
  label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 14, fontWeight: 600, color: "#2d3748" },
  fileInput: { marginTop: 4 },
  fileInfo: { fontSize: 13, color: "#718096" },
  error: { background: "#fff5f5", border: "1px solid #fc8181", color: "#c53030", padding: "10px 14px", borderRadius: 6, fontSize: 13 },
  btn: { padding: "10px 24px", background: "#2b6cb0", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer", alignSelf: "flex-start" },
  btnDisabled: { background: "#a0aec0", cursor: "not-allowed" },
};
