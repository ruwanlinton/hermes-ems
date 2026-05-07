import { useEffect, useState } from "react";
import { Layout } from "../components/layout/Layout";
import { usersApi, type UserProfile } from "../api/users";

export function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);
  const [pwError, setPwError] = useState("");

  useEffect(() => {
    usersApi.getProfile().then((r) => {
      setProfile(r.data);
      setName(r.data.name ?? "");
    });
  }, []);

  const handleChangePassword = async () => {
    setPwError("");
    setPwSaved(false);
    if (newPassword !== confirmPassword) {
      setPwError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setPwError("New password must be at least 8 characters.");
      return;
    }
    setPwSaving(true);
    try {
      await usersApi.changePassword({ current_password: currentPassword, new_password: newPassword });
      setPwSaved(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPwSaved(false), 3000);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setPwError(detail ?? "Failed to change password.");
    } finally {
      setPwSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const r = await usersApi.updateProfile({ name });
      setProfile(r.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div style={styles.page}>
        <h1 style={styles.h1}>My Profile</h1>

        {!profile ? (
          <p style={styles.loading}>Loading...</p>
        ) : (
          <div style={styles.card}>
            <div style={styles.row}>
              <label style={styles.label}>Email</label>
              <span style={styles.value}>{profile.email ?? "—"}</span>
            </div>

            <div style={styles.row}>
              <label style={styles.label}>Roles</label>
              <span style={{ ...styles.value, ...styles.roleBadge }}>{profile.roles.join(", ")}</span>
            </div>

            <div style={styles.divider} />

            <div style={styles.row}>
              <label style={styles.label} htmlFor="name-input">Display Name</label>
              <input
                id="name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={styles.input}
                placeholder="Enter your display name"
              />
            </div>

            <div style={styles.actions}>
              {error && <span style={styles.error}>{error}</span>}
              {saved && <span style={styles.success}>Saved successfully.</span>}
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ ...styles.btn, ...(saving ? styles.btnDisabled : {}) }}
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>

            <div style={styles.divider} />
            <p style={styles.sectionLabel}>Change Password</p>

            <div style={styles.row}>
              <label style={styles.label} htmlFor="cur-pw">Current Password</label>
              <input
                id="cur-pw"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                style={styles.input}
                autoComplete="current-password"
              />
            </div>
            <div style={styles.row}>
              <label style={styles.label} htmlFor="new-pw">New Password</label>
              <input
                id="new-pw"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={styles.input}
                autoComplete="new-password"
                placeholder="Minimum 8 characters"
              />
            </div>
            <div style={styles.row}>
              <label style={styles.label} htmlFor="confirm-pw">Confirm New Password</label>
              <input
                id="confirm-pw"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={styles.input}
                autoComplete="new-password"
              />
            </div>

            <div style={styles.actions}>
              {pwError && <span style={styles.error}>{pwError}</span>}
              {pwSaved && <span style={styles.success}>Password changed.</span>}
              <button
                onClick={handleChangePassword}
                disabled={pwSaving || !currentPassword || !newPassword || !confirmPassword}
                style={{ ...styles.btn, ...((pwSaving || !currentPassword || !newPassword || !confirmPassword) ? styles.btnDisabled : {}) }}
              >
                {pwSaving ? "Saving…" : "Change Password"}
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 560, margin: "40px auto", padding: "0 24px" },
  h1: { fontSize: 22, fontWeight: 700, color: "#233654", marginBottom: 24 },
  loading: { color: "#718096", fontSize: 14 },
  card: {
    background: "#fff",
    borderRadius: 10,
    boxShadow: "0 1px 6px rgba(0,0,0,0.10)",
    padding: "28px 32px",
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    marginBottom: 18,
  },
  label: {
    width: 130,
    fontSize: 13,
    fontWeight: 600,
    color: "#4a5568",
    flexShrink: 0,
  },
  value: { fontSize: 14, color: "#2d3748" },
  roleBadge: {
    background: "#ebf4ff",
    color: "#2b6cb0",
    padding: "2px 10px",
    borderRadius: 99,
    fontSize: 12,
    fontWeight: 700,
  },
  divider: { borderTop: "1px solid #e2e8f0", margin: "8px 0 20px" },
  sectionLabel: { fontSize: 13, fontWeight: 700, color: "#233654", marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: "0.04em" },
  input: {
    flex: 1,
    padding: "8px 12px",
    border: "1px solid #e2e8f0",
    borderRadius: 6,
    fontSize: 14,
    color: "#2d3748",
    outline: "none",
  },
  actions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 8,
  },
  error: { fontSize: 13, color: "#c53030" },
  success: { fontSize: 13, color: "#276749" },
  btn: {
    padding: "8px 20px",
    background: "#233654",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  btnDisabled: { opacity: 0.6, cursor: "not-allowed" },
};
