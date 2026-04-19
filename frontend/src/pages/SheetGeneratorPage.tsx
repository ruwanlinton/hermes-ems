import { useState } from "react";
import { useParams } from "react-router-dom";
import { ExamLayout } from "../components/layout/ExamLayout";
import { examsApi } from "../api/exams";
import { loadSettings } from "../settings";

const ID_MODES = [
  {
    value: "qr",
    label: "QR Code",
    desc: "Each sheet has a printed QR code identifying the candidate. One sheet per row in the CSV. Recommended for standard use.",
  },
  {
    value: "bubble_grid",
    label: "Digit Bubble Grid",
    desc: "A single blank template is generated. Candidates fill in their numeric index number (up to 10 digits) by bubbling each digit. No CSV required.",
  },
];

export function SheetGeneratorPage() {
  const { id } = useParams<{ id: string }>();
  const [idMode, setIdMode] = useState(() => loadSettings().defaultIdMode);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [digitCount, setDigitCount] = useState(() => loadSettings().defaultDigitCount);
  const [digitOrientation, setDigitOrientation] = useState<"vertical" | "horizontal">(() => loadSettings().defaultDigitOrientation);
  const [includeSubject, setIncludeSubject] = useState(true);
  const [includeDate, setIncludeDate] = useState(true);
  const [includeRegNo, setIncludeRegNo] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const needsCsv = idMode !== "bubble_grid";

  const handleGenerate = async () => {
    if (!id) return;
    if (needsCsv && !csvFile) return;
    setGenerating(true);
    setError("");
    try {
      const res = await examsApi.generateSheets(id, idMode, csvFile ?? undefined, digitCount, digitOrientation, includeSubject, includeDate, includeRegNo);
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
    <ExamLayout>

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
          <div style={styles.infoBox}>
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

            <label style={{ ...styles.digitLabel, marginTop: 10 }}>
              CSV File
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                style={styles.fileInput}
              />
            </label>

            {csvFile && <p style={styles.fileInfo}>{csvFile.name}</p>}
          </div>
        )}

        {/* Bubble grid options */}
        {idMode === "bubble_grid" && (
          <div style={styles.infoBox}>
            <div style={{ marginBottom: 10 }}>
              A single blank template sheet will be generated. Print as many copies as needed.
              Candidates must fill in each digit of their <strong>numeric</strong> index number,
              zero-padded from the left (e.g. index number 1234 with 10 digits → fill 0000001234).
            </div>
            <label style={styles.digitLabel}>
              Number of digit columns
              <div style={styles.digitRow}>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={digitCount}
                  onChange={(e) => setDigitCount(Math.min(10, Math.max(1, Number(e.target.value))))}
                  style={styles.digitInput}
                />
                <span style={styles.digitHint}>1 – 10 digits</span>
              </div>
            </label>
            <label style={{ ...styles.digitLabel, marginTop: 10 }}>
              Grid orientation
              <div style={styles.digitRow}>
                <select
                  value={digitOrientation}
                  onChange={(e) => setDigitOrientation(e.target.value as "vertical" | "horizontal")}
                  style={{ padding: "4px 8px", border: "1px solid #d69e2e", borderRadius: 4, fontSize: 13 }}
                >
                  <option value="vertical">Vertical (digit positions across columns)</option>
                  <option value="horizontal">Horizontal (digit positions down rows)</option>
                </select>
              </div>
            </label>
          </div>
        )}

        {/* Header fields */}
        <div>
          <p style={styles.sectionLabel}>Header Fields</p>
          <div style={styles.checkGroup}>
            {([
              ["Subject", includeSubject, setIncludeSubject],
              ["Date", includeDate, setIncludeDate],
              ["Reg. No", includeRegNo, setIncludeRegNo],
            ] as [string, boolean, (v: boolean) => void][]).map(([label, checked, setter]) => (
              <label key={label} style={styles.checkLabel}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setter(e.target.checked)}
                  style={{ marginRight: 6 }}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

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
    </ExamLayout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: { background: "#fff", borderRadius: 8, padding: 32, maxWidth: 620, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", display: "flex", flexDirection: "column", gap: 24 },
  sectionLabel: { fontSize: 13, fontWeight: 700, color: "#233654", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em" },
  modeGroup: { display: "flex", flexDirection: "column", gap: 10 },
  modeOption: { display: "flex", alignItems: "flex-start", gap: 4, border: "1px solid #e2e8f0", borderRadius: 6, padding: "12px 14px", cursor: "pointer", transition: "border-color 0.15s" },
  modeOptionSelected: { borderColor: "#233654", background: "#f0f4f9" },
  modeLabel: { fontSize: 14, fontWeight: 600, color: "#233654", marginBottom: 2 },
  modeDesc: { fontSize: 12, color: "#718096", lineHeight: 1.5 },
  csvTemplate: { background: "#fef9ec", borderRadius: 6, padding: 12, fontSize: 13, color: "#744210" },
  pre: { background: "#fffdf0", borderRadius: 4, padding: 10, fontSize: 12, overflowX: "auto", marginTop: 8, color: "#92400e" },
  templateLink: { color: "#92400e", fontSize: 12, marginTop: 8, display: "inline-block", fontWeight: 600 },
  label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 14, fontWeight: 600, color: "#2d3748", marginTop: 12 },
  fileInput: { marginTop: 4 },
  fileInfo: { fontSize: 13, color: "#92400e", marginTop: 6 },
  infoBox: { background: "#fffbeb", border: "1px solid #f6d860", borderRadius: 6, padding: "12px 16px", fontSize: 13, color: "#744210", lineHeight: 1.6 },
  digitLabel: { display: "flex", flexDirection: "column" as const, gap: 6, fontWeight: 600, fontSize: 13 },
  digitRow: { display: "flex", alignItems: "center", gap: 10 },
  digitInput: { width: 64, padding: "4px 8px", border: "1px solid #d69e2e", borderRadius: 4, fontSize: 14, textAlign: "center" as const },
  digitHint: { fontSize: 12, color: "#92400e" },
  checkGroup: { display: "flex", gap: 20, flexWrap: "wrap" as const, marginTop: 6 },
  checkLabel: { display: "flex", alignItems: "center", fontSize: 13, fontWeight: 600, color: "#2d3748", cursor: "pointer" },
  error: { background: "#fff5f5", border: "1px solid #fc8181", color: "#c53030", padding: "10px 14px", borderRadius: 6, fontSize: 13 },
  btn: { padding: "10px 24px", background: "#233654", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer", alignSelf: "flex-start" },
  btnDisabled: { background: "#a0aec0", cursor: "not-allowed" },
};
