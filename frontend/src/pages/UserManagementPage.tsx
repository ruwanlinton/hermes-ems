import { useEffect, useState } from "react";
import { Layout } from "../components/layout/Layout";
import { adminUsersApi, type AdminUser, ROLE_OPTIONS } from "../api/adminUsers";

type ModalMode = "create" | "edit" | null;

interface FormState {
  username: string;
  password: string;
  name: string;
  email: string;
  roles: string[];
}

const emptyForm: FormState = { username: "", password: "", name: "", email: "", roles: ["viewer"] };

const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: "Full access including user management",
  creator: "Manage exams, questions, answer keys, sheets",
  marker: "Upload submissions, view answer keys and results",
  viewer: "View exams and results only",
};

export function UserManagementPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const r = await adminUsersApi.list();
      setUsers(r.data);
    } catch {
      setError("Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm(emptyForm);
    setFormError("");
    setEditTarget(null);
    setModalMode("create");
  };

  const openEdit = (u: AdminUser) => {
    setForm({ username: u.username, password: "", name: u.name ?? "", email: u.email ?? "", roles: u.roles });
    setFormError("");
    setEditTarget(u);
    setModalMode("edit");
  };

  const closeModal = () => { setModalMode(null); setEditTarget(null); };

  const toggleRole = (role: string) => {
    setForm((f) => ({
      ...f,
      roles: f.roles.includes(role) ? f.roles.filter((r) => r !== role) : [...f.roles, role],
    }));
  };

  const handleSave = async () => {
    if (modalMode === "create" && !form.username.trim()) {
      setFormError("Username is required.");
      return;
    }
    if (modalMode === "create" && !form.password.trim()) {
      setFormError("Password is required.");
      return;
    }
    if (form.roles.length === 0) {
      setFormError("At least one role must be selected.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      if (modalMode === "create") {
        await adminUsersApi.create({
          username: form.username,
          password: form.password,
          name: form.name || undefined,
          email: form.email || undefined,
          roles: form.roles,
        });
      } else if (editTarget) {
        await adminUsersApi.update(editTarget.id, {
          name: form.name || undefined,
          email: form.email || undefined,
          roles: form.roles,
          password: form.password || undefined,
        });
      }
      closeModal();
      await load();
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      setFormError(typeof detail === "string" ? detail : "Failed to save user.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminUsersApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch {
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Layout>
      <div style={styles.page}>
        <div style={styles.header}>
          <h1 style={styles.h1}>User Management</h1>
          <button onClick={openCreate} style={styles.addBtn}>+ Add User</button>
        </div>

        {error && <p style={styles.error}>{error}</p>}

        {loading ? (
          <p style={styles.muted}>Loading...</p>
        ) : (
          <div style={styles.card}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Username / Name</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Roles</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ ...styles.td, color: "#a0aec0", textAlign: "center" }}>
                      No users found.
                    </td>
                  </tr>
                ) : users.map((u) => (
                  <tr key={u.id} style={styles.tr}>
                    <td style={styles.td}>
                      <span style={styles.avatar}>{initials(u)}</span>
                      <span style={{ fontWeight: 600 }}>{u.username}</span>
                      {u.name && <span style={{ color: "#718096", marginLeft: 6, fontSize: 12 }}>{u.name}</span>}
                    </td>
                    <td style={styles.td}>{u.email || "—"}</td>
                    <td style={styles.td}>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {u.roles.map((r) => (
                          <span key={r} style={roleBadgeStyle(r)}>{r}</span>
                        ))}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <button onClick={() => openEdit(u)} style={styles.editBtn}>Edit</button>
                      <button onClick={() => setDeleteTarget(u)} style={styles.deleteBtn}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalMode && (
        <div style={styles.overlay} onClick={closeModal}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>
              {modalMode === "create" ? "Add User" : "Edit User"}
            </h2>

            {modalMode === "create" && (
              <>
                <label style={styles.label}>Username *</label>
                <input
                  style={styles.input}
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  placeholder="e.g. jsmith"
                  autoComplete="off"
                />
              </>
            )}

            <label style={styles.label}>
              {modalMode === "create" ? "Password *" : "New Password (leave blank to keep)"}
            </label>
            <input
              style={styles.input}
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder={modalMode === "create" ? "Password" : "Leave blank to keep current"}
              autoComplete="new-password"
            />

            <label style={styles.label}>Display Name</label>
            <input
              style={styles.input}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Full name"
            />

            <label style={styles.label}>Email</label>
            <input
              style={styles.input}
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="user@example.com"
            />

            <label style={styles.label}>Roles *</label>
            <div style={styles.rolesGrid}>
              {ROLE_OPTIONS.map((role) => (
                <label key={role} style={styles.roleCheckbox}>
                  <input
                    type="checkbox"
                    checked={form.roles.includes(role)}
                    onChange={() => toggleRole(role)}
                    style={{ marginRight: 8 }}
                  />
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{role}</span>
                    <span style={{ fontSize: 11, color: "#718096", display: "block" }}>
                      {ROLE_DESCRIPTIONS[role]}
                    </span>
                  </div>
                </label>
              ))}
            </div>

            {formError && <p style={styles.error}>{formError}</p>}

            <div style={styles.modalActions}>
              <button onClick={closeModal} style={styles.cancelBtn}>Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ ...styles.saveBtn, ...(saving ? styles.disabled : {}) }}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div style={styles.overlay} onClick={() => setDeleteTarget(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Delete User</h2>
            <p style={styles.confirmText}>
              Are you sure you want to delete <strong>{deleteTarget.username}</strong>?
              This action cannot be undone.
            </p>
            <div style={styles.modalActions}>
              <button onClick={() => setDeleteTarget(null)} style={styles.cancelBtn}>Cancel</button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{ ...styles.deleteBtnModal, ...(deleting ? styles.disabled : {}) }}
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

function initials(u: AdminUser) {
  const name = u.name || u.username;
  return name.split(" ").map((w) => w[0] ?? "").slice(0, 2).join("").toUpperCase();
}

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  admin:   { bg: "#ebf4ff", color: "#2b6cb0" },
  creator: { bg: "#faf5ff", color: "#6b46c1" },
  marker:  { bg: "#fffbeb", color: "#b7791f" },
  viewer:  { bg: "#f0fff4", color: "#276749" },
};

function roleBadgeStyle(role: string): React.CSSProperties {
  const c = ROLE_COLORS[role] ?? { bg: "#edf2f7", color: "#2d3748" };
  return { background: c.bg, color: c.color, padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 700 };
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 900, margin: "40px auto", padding: "0 24px" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  h1: { fontSize: 22, fontWeight: 700, color: "#233654", margin: 0 },
  addBtn: { padding: "8px 18px", background: "#233654", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  card: { background: "#fff", borderRadius: 10, boxShadow: "0 1px 6px rgba(0,0,0,0.10)", overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "10px 16px", textAlign: "left" as const, fontSize: 12, fontWeight: 600, color: "#718096", background: "#f7fafc", borderBottom: "1px solid #e2e8f0" },
  tr: { borderBottom: "1px solid #f7fafc" },
  td: { padding: "12px 16px", fontSize: 13, color: "#2d3748", verticalAlign: "middle" },
  avatar: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: "50%", background: "#b79a62", color: "#233654", fontSize: 11, fontWeight: 700, marginRight: 10, verticalAlign: "middle" },
  editBtn: { padding: "4px 12px", background: "#edf2f7", color: "#2d3748", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: 600, marginRight: 6 },
  deleteBtn: { padding: "4px 12px", background: "#fff5f5", color: "#c53030", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: 600 },
  muted: { color: "#718096", fontSize: 14 },
  error: { color: "#c53030", fontSize: 13, marginBottom: 8 },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500 },
  modal: { background: "#fff", borderRadius: 10, padding: "28px 32px", width: 460, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", maxHeight: "90vh", overflowY: "auto" },
  modalTitle: { fontSize: 17, fontWeight: 700, color: "#233654", marginBottom: 20 },
  label: { display: "block", fontSize: 12, fontWeight: 600, color: "#4a5568", marginBottom: 4 },
  input: { display: "block", width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 14, color: "#2d3748", marginBottom: 14, boxSizing: "border-box" },
  rolesGrid: { display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 },
  roleCheckbox: { display: "flex", alignItems: "flex-start", gap: 4, cursor: "pointer", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 6 },
  confirmText: { fontSize: 14, color: "#2d3748", marginBottom: 20 },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 },
  cancelBtn: { padding: "8px 18px", background: "#edf2f7", color: "#2d3748", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  saveBtn: { padding: "8px 18px", background: "#233654", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  deleteBtnModal: { padding: "8px 18px", background: "#c53030", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  disabled: { opacity: 0.6, cursor: "not-allowed" },
};
