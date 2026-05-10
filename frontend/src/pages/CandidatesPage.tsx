import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../components/layout/Layout";
import { candidatesApi, type Candidate, type ImportResult } from "../api/candidates";
import { useAuth, hasRole } from "../auth/AuthContext";

export function CandidatesPage() {
  const { user } = useAuth();
  const canEdit = hasRole(user, "admin", "creator");

  const [items, setItems] = useState<Candidate[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);

  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [deleting, setDeleting] = useState<string | null>(null);

  const load = async (pg: number, q: string) => {
    setLoading(true);
    try {
      const res = await candidatesApi.list({ page: pg, page_size: PAGE_SIZE, search: q || undefined });
      setItems(res.data.items);
      setTotal(res.data.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(page, search); }, [page, search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete candidate "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await candidatesApi.delete(id);
      load(page, search);
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Delete failed.");
    } finally {
      setDeleting(null);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    setImportError("");
    try {
      const res = await candidatesApi.import(file);
      setImportResult(res.data);
      load(1, search);
      setPage(1);
    } catch (err: any) {
      setImportError(err?.response?.data?.detail || "Import failed.");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleExport = async (format: "csv" | "xlsx") => {
    try {
      const res = await candidatesApi.export(format, search || undefined);
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `candidates.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed.");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Layout>
      <div style={styles.header}>
        <div>
          <h1 style={styles.h1}>Candidates</h1>
          <p style={styles.sub}>{total} candidate{total !== 1 ? "s" : ""} registered</p>
        </div>
        <div style={styles.headerActions}>
          {canEdit && (
            <>
              <button
                style={styles.secondaryBtn}
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
              >
                {importing ? "Importing…" : "Import CSV / XLSX"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx"
                style={{ display: "none" }}
                onChange={handleImport}
              />
              <button style={styles.secondaryBtn} onClick={() => handleExport("csv")}>Export CSV</button>
              <button style={styles.secondaryBtn} onClick={() => handleExport("xlsx")}>Export XLSX</button>
              <Link to="/candidates/new" style={styles.createBtn}>+ Add Candidate</Link>
            </>
          )}
        </div>
      </div>

      {importResult && (
        <div style={importResult.errors.length > 0 ? styles.alertWarn : styles.alertOk}>
          <strong>Import complete:</strong> {importResult.imported} added, {importResult.updated} updated
          {importResult.errors.length > 0 && (
            <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
              {importResult.errors.map((e, i) => (
                <li key={i} style={{ fontSize: 12 }}>Row {e.row}: {e.message}</li>
              ))}
            </ul>
          )}
          <button style={styles.dismissBtn} onClick={() => setImportResult(null)}>✕</button>
        </div>
      )}

      {importError && (
        <div style={styles.alertErr}>
          {importError}
          <button style={styles.dismissBtn} onClick={() => setImportError("")}>✕</button>
        </div>
      )}

      <form onSubmit={handleSearch} style={styles.searchRow}>
        <input
          style={styles.searchInput}
          placeholder="Search by name or registration number…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <button type="submit" style={styles.searchBtn}>Search</button>
        {search && (
          <button
            type="button"
            style={{ ...styles.searchBtn, background: "#e2e8f0", color: "#2d3748" }}
            onClick={() => { setSearchInput(""); setSearch(""); setPage(1); }}
          >
            Clear
          </button>
        )}
      </form>

      {loading ? (
        <p style={{ color: "#718096" }}>Loading…</p>
      ) : items.length === 0 ? (
        <div style={styles.empty}>
          <p>{search ? "No candidates match your search." : "No candidates yet."}</p>
          {canEdit && !search && <Link to="/candidates/new" style={styles.emptyLink}>Add the first candidate</Link>}
        </div>
      ) : (
        <>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Reg. No.</th>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Date of Birth</th>
                <th style={styles.th}>Mobile</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} style={styles.tr}>
                  <td style={styles.td}>
                    <Link to={`/candidates/${c.id}`} style={styles.link}>{c.registration_number}</Link>
                  </td>
                  <td style={styles.td}>{c.name}</td>
                  <td style={styles.td}>{c.date_of_birth ? new Date(c.date_of_birth).toLocaleDateString() : "—"}</td>
                  <td style={styles.td}>{c.mobile || "—"}</td>
                  <td style={styles.td}>
                    <Link to={`/candidates/${c.id}`} style={styles.actionBtn}>View</Link>
                    {canEdit && (
                      <button
                        style={{ ...styles.actionBtn, ...styles.deleteBtn }}
                        disabled={deleting === c.id}
                        onClick={() => handleDelete(c.id, c.name)}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={styles.pagination}>
            <button
              style={styles.pageBtn}
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              ← Prev
            </button>
            <span style={styles.pageInfo}>Page {page} of {totalPages}</span>
            <button
              style={styles.pageBtn}
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Next →
            </button>
          </div>
        </>
      )}
    </Layout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  h1: { fontSize: 24, fontWeight: 700, color: "#233654", margin: 0 },
  sub: { fontSize: 13, color: "#718096", margin: "4px 0 0" },
  headerActions: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
  createBtn: {
    padding: "10px 20px",
    background: "#ba3c3c",
    color: "#fff",
    textDecoration: "none",
    borderRadius: 6,
    fontWeight: 600,
    fontSize: 14,
  },
  secondaryBtn: {
    padding: "8px 16px",
    background: "#f5f0e8",
    color: "#233654",
    border: "1px solid #d4c5a9",
    borderRadius: 6,
    fontWeight: 500,
    fontSize: 13,
    cursor: "pointer",
  },
  searchRow: { display: "flex", gap: 8, marginBottom: 20 },
  searchInput: {
    flex: 1,
    padding: "8px 12px",
    border: "1px solid #d4c5a9",
    borderRadius: 6,
    fontSize: 14,
    background: "#fff",
  },
  searchBtn: {
    padding: "8px 16px",
    background: "#233654",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    fontWeight: 500,
    fontSize: 13,
    cursor: "pointer",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    background: "#fff",
    borderRadius: 8,
    overflow: "hidden",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  },
  th: {
    padding: "12px 16px",
    textAlign: "left" as const,
    fontSize: 12,
    fontWeight: 600,
    color: "#718096",
    background: "#f9f6f0",
    borderBottom: "1px solid #e2e8f0",
  },
  tr: { borderBottom: "1px solid #e2e8f0" },
  td: { padding: "12px 16px", fontSize: 14, color: "#2d3748" },
  link: { color: "#ba3c3c", textDecoration: "none", fontWeight: 600 },
  actionBtn: {
    padding: "4px 12px",
    background: "#f5f0e8",
    color: "#233654",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 12,
    textDecoration: "none",
    marginRight: 6,
    display: "inline-block",
  },
  deleteBtn: { background: "#fff5f5", color: "#c53030" },
  empty: { textAlign: "center" as const, padding: "48px 0", color: "#718096" },
  emptyLink: { color: "#ba3c3c", display: "block", marginTop: 8 },
  pagination: { display: "flex", alignItems: "center", gap: 12, marginTop: 16, justifyContent: "center" },
  pageBtn: {
    padding: "6px 14px",
    background: "#f5f0e8",
    color: "#233654",
    border: "1px solid #d4c5a9",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 13,
  },
  pageInfo: { fontSize: 13, color: "#718096" },
  alertOk: {
    background: "#f0fff4",
    border: "1px solid #9ae6b4",
    borderRadius: 6,
    padding: "12px 16px",
    marginBottom: 16,
    fontSize: 13,
    color: "#276749",
    position: "relative" as const,
  },
  alertWarn: {
    background: "#fffbeb",
    border: "1px solid #f6e05e",
    borderRadius: 6,
    padding: "12px 16px",
    marginBottom: 16,
    fontSize: 13,
    color: "#744210",
    position: "relative" as const,
  },
  alertErr: {
    background: "#fff5f5",
    border: "1px solid #feb2b2",
    borderRadius: 6,
    padding: "12px 16px",
    marginBottom: 16,
    fontSize: 13,
    color: "#742a2a",
    position: "relative" as const,
  },
  dismissBtn: {
    position: "absolute" as const,
    top: 8,
    right: 12,
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: 14,
    color: "inherit",
  },
};
