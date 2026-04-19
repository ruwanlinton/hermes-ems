import { useState } from "react";
import { Layout } from "../components/layout/Layout";
import { loadSettings, saveSettings } from "../settings";

export function SettingsPage() {
  const [settings, setSettings] = useState(loadSettings);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Layout>
      <h1 style={styles.h1}>Settings</h1>

      <div style={styles.card}>
        <p style={styles.sectionLabel}>OMR Sheet Defaults</p>

        <div style={styles.field}>
          <label style={styles.label}>
            Default index digit columns
            <div style={styles.inputRow}>
              <input
                type="number"
                min={1}
                max={10}
                value={settings.defaultDigitCount}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    defaultDigitCount: Math.min(10, Math.max(1, Number(e.target.value))),
                  }))
                }
                style={styles.input}
              />
              <span style={styles.hint}>1 – 10 digits</span>
            </div>
          </label>
          <p style={styles.desc}>
            Number of digit columns used in the bubble grid index number field.
            This default is pre-filled on the sheet generation and upload pages.
            Set it to match the digit count you generate sheets with.
          </p>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>
            Default identification method
            <div style={styles.inputRow}>
              <select
                value={settings.defaultIdMode}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    defaultIdMode: e.target.value as "qr" | "bubble_grid" | "both",
                  }))
                }
                style={{ ...styles.input, width: "auto", textAlign: "left" }}
              >
                <option value="qr">QR Code</option>
                <option value="bubble_grid">Digit Bubble Grid</option>
                <option value="both">Both (QR + Digit Grid)</option>
              </select>
            </div>
          </label>
          <p style={styles.desc}>
            Default identification method pre-selected on the sheet generation page.
          </p>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>
            Default digit grid orientation
            <div style={styles.inputRow}>
              <select
                value={settings.defaultDigitOrientation}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    defaultDigitOrientation: e.target.value as "vertical" | "horizontal",
                  }))
                }
                style={{ ...styles.input, width: "auto", textAlign: "left" }}
              >
                <option value="vertical">Vertical — digit positions across columns, values 0–9 down rows</option>
                <option value="horizontal">Horizontal — digit positions down rows, values 0–9 across columns</option>
              </select>
            </div>
          </label>
          <p style={styles.desc}>
            Controls how the index number bubble grid is laid out on generated sheets and read during upload processing.
            Both sheet generation and upload must use the same orientation.
          </p>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>
            Default pass mark (%)
            <div style={styles.inputRow}>
              <input
                type="number"
                min={0}
                max={100}
                value={settings.defaultPassMark}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    defaultPassMark: Math.min(100, Math.max(0, Number(e.target.value))),
                  }))
                }
                style={styles.input}
              />
              <span style={styles.hint}>0 – 100%</span>
            </div>
          </label>
          <p style={styles.desc}>
            Default pass mark percentage applied to newly created exams.
            Can be adjusted per exam by creators and markers.
          </p>
        </div>

        <div style={styles.footer}>
          <button onClick={handleSave} style={styles.btn}>
            Save Settings
          </button>
          {saved && <span style={styles.savedMsg}>Saved!</span>}
        </div>
      </div>
    </Layout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  h1: { fontSize: 22, fontWeight: 700, color: "#233654", marginBottom: 24 },
  card: {
    background: "#fff",
    borderRadius: 8,
    padding: 32,
    maxWidth: 520,
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: "#233654",
    marginBottom: 0,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 14, fontWeight: 600, color: "#2d3748", display: "flex", flexDirection: "column", gap: 8 },
  inputRow: { display: "flex", alignItems: "center", gap: 10 },
  input: {
    width: 72,
    padding: "6px 10px",
    border: "1px solid #cbd5e0",
    borderRadius: 4,
    fontSize: 15,
    textAlign: "center" as const,
  },
  hint: { fontSize: 12, color: "#718096" },
  desc: { fontSize: 13, color: "#718096", lineHeight: 1.6, margin: 0 },
  footer: { display: "flex", alignItems: "center", gap: 16 },
  btn: {
    padding: "10px 24px",
    background: "#233654",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  savedMsg: { fontSize: 13, color: "#276749", fontWeight: 600 },
};
