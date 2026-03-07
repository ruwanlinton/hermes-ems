import { useState } from "react";
import { useParams } from "react-router-dom";
import { Layout } from "../components/layout/Layout";
import { examsApi } from "../api/exams";

const ID_MODES = [
  {
    value: "qr",
    label: "QR Code only",
    desc: "Each sheet has a printed QR code identifying the candidate. One sheet per row in the CSV. Recommended for standard use.",
  },
  {
    value: "bubble_grid",
    label: "Digit Bubble Grid only",
    desc: "A single blank template is generated. Candidates fill in their numeric index number (up to 8 digits) by bubbling each digit. No CSV required.",
  },
  {
    value: "both",
    label: "QR Code + Digit Bubble Grid",
    desc: "Each sheet has a QR code (left) and a digit bubble grid (right). During scanning the QR code is used first; the bubble grid is used as a fallback.",
  },
];

export function SheetGeneratorPage() {
  const { id } = useParams<{ id: string }>();
  const [idMode, setIdMode] = useState("qr");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const needsCsv = idMode !== "bubble_grid";

  const handleGenerate = async () => {
    if (!id) return;
    if (needsCsv && !csvFile) return;
    setGenerating(true);
    setError("");
    try {
      const res = await examsApi.generateSheets(id, idMode, csvFile ?? undefined);
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `omr_sheets_${id.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError(
        needsCsv
          ? "Failed to generate sheets. Check that the CSV has an 'index_number' column."
          : "Failed to generate sheet template."
      );
    } finally {
      setGenerating(false);
    }
  };

  const canGenerate = !generating && (needsCsv ? !!csvFile : true);

  return (
    <Layout>
      <h1 style={styles.h1}>Generate OMR Sheets</h1>

      <div style={styles.card}>
        {/* Mode selection */}
        <div>
          <p style={styles.sectionLabel}>Identification Method</p>
          <div style={styles.modeGroup}>
            {ID_MODES.map((m) => (
              <label
                key={m.value}
                style={{
                  ...styles.modeOption,
                  ...(idMode === m.value ? styles.modeOptionSelected : {}),
                }}
              >
                <input
                  type="radio"
                  name="id_mode"
                  value={m.value}
                  checked={idMode === m.value}
                  onChange={() => { setIdMode(m.value); setCsvFile(null); }}
                  style={{ marginRight: 8 }}
                />
                <div>
                  <div style={styles.modeLabel}>{m.label}</div>
                  <div style={styles.modeDesc}>{m.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* CSV upload — only for qr / both modes */}
        {needsCsv && (
          <div>
            <div style={styles.csvTemplate}>
              <strong>CSV format (one index number per row):</strong>
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

            {csvFile && <p style={styles.fileInfo}>Selected: {csvFile.name}</p>}
          </div>
        )}

        {/* Bubble grid info */}
        {idMode === "bubble_grid" && (
          <div style={styles.infoBox}>
            A single blank template sheet will be generated. Print as many copies as needed.
            Candidates must fill in each digit of their <strong>numeric</strong> index number
            (up to 8 digits, zero-padded from the left — e.g. index number 1234 → fill 00001234).
          </div>
        )}

        {error && <div style={styles.error}>{error}</div>}

        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          style={{ ...styles.btn, ...(!canGenerate ? styles.btnDisabled : {}) }}
        >
          {generating
            ? "Generating PDF..."
            : idMode === "bubble_grid"
            ? "Generate Blank Template"
            : "Generate & Download PDF"}
        </button>
      </div>
    </Layout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  h1: { fontSize: 22, fontWeight: 700, color: "#233654", marginBottom: 24 },
  card: { background: "#fff", borderRadius: 8, padding: 32, maxWidth: 620, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", display: "flex", flexDirection: "column", gap: 24 },
  sectionLabel: { fontSize: 13, fontWeight: 700, color: "#233654", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em" },
  modeGroup: { display: "flex", flexDirection: "column", gap: 10 },
  modeOption: { display: "flex", alignItems: "flex-start", gap: 4, border: "1px solid #e2e8f0", borderRadius: 6, padding: "12px 14px", cursor: "pointer", transition: "border-color 0.15s" },
  modeOptionSelected: { borderColor: "#233654", background: "#f0f4f9" },
  modeLabel: { fontSize: 14, fontWeight: 600, color: "#233654", marginBottom: 2 },
  modeDesc: { fontSize: 12, color: "#718096", lineHeight: 1.5 },
  csvTemplate: { background: "#f7fafc", borderRadius: 6, padding: 16, fontSize: 13 },
  pre: { background: "#edf2f7", borderRadius: 4, padding: 10, fontSize: 12, overflowX: "auto", marginTop: 8 },
  templateLink: { color: "#233654", fontSize: 12, marginTop: 8, display: "inline-block" },
  label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 14, fontWeight: 600, color: "#2d3748", marginTop: 12 },
  fileInput: { marginTop: 4 },
  fileInfo: { fontSize: 13, color: "#718096" },
  infoBox: { background: "#fffbeb", border: "1px solid #f6d860", borderRadius: 6, padding: "12px 16px", fontSize: 13, color: "#744210", lineHeight: 1.6 },
  error: { background: "#fff5f5", border: "1px solid #fc8181", color: "#c53030", padding: "10px 14px", borderRadius: 6, fontSize: 13 },
  btn: { padding: "10px 24px", background: "#233654", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer", alignSelf: "flex-start" },
  btnDisabled: { background: "#a0aec0", cursor: "not-allowed" },
};
