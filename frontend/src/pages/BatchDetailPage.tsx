import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Layout } from "../components/layout/Layout";
import { batchesApi, type Batch, type Member, type MemberImportResult } from "../api/batches";
import { candidatesApi, type Candidate } from "../api/candidates";
import { useAuth, hasRole } from "../auth/AuthContext";

export function BatchDetailPage() {
  const { eid, bid } = useParams<{ eid: string; bid: string }>();
  const { user } = useAuth();
  const canEdit = hasRole(user, "admin", "creator");

  const [batch, setBatch] = useState<Batch | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Rename batch
  const [renamingBatch, setRenamingBatch] = useState(false);
  const [newBatchName, setNewBatchName] = useState("");

  // Enroll single candidate
  const [showEnrollForm, setShowEnrollForm] = useState(false);
  const [enrollSearch, setEnrollSearch] = useState("");
  const [enrollResults, setEnrollResults] = useState<Candidate[]>([]);
  const [enrollCandidate, setEnrollCandidate] = useState<Candidate | null>(null);
  const [enrollIndexNumber, setEnrollIndexNumber] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState("");

  // Import
  const [importResult, setImportResult] = useState<MemberImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!eid || !bid) return;
    try {
      const [batchRes, membersRes] = await Promise.all([
        batchesApi.get(eid, bid),
        batchesApi.listMembers(eid, bid, { page, page_size: PAGE_SIZE, search: search || undefined }),
      ]);
      setBatch(batchRes.data);
      setNewBatchName(batchRes.data.name);
      setMembers(membersRes.data.items);
      setTotal(membersRes.data.total);
    } catch {
      setError("Batch not found.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [eid, bid, page, search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eid || !bid || !newBatchName.trim()) return;
    try {
      await batchesApi.update(eid, bid, newBatchName.trim());
      setRenamingBatch(false);
      load();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Rename failed.");
    }
  };

  const handleUnenroll = async (mid: string, name: string) => {
    if (!eid || !bid) return;
    if (!confirm(`Remove "${name}" from this batch?`)) return;
    try {
      await batchesApi.unenroll(eid, bid, mid);
      load();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Remove failed.");
    }
  };

  const handleEnrollSearch = async () => {
    if (!enrollSearch.trim()) return;
    const res = await candidatesApi.list({ search: enrollSearch, page_size: 10 });
    setEnrollResults(res.data.items);
  };

  const handleEnroll = async () => {
    if (!eid || !bid || !enrollCandidate || !enrollIndexNumber.trim()) return;
    setEnrolling(true);
    setEnrollError("");
    try {
      await batchesApi.enroll(eid, bid, enrollCandidate.id, enrollIndexNumber.trim());
      setShowEnrollForm(false);
      setEnrollCandidate(null);
      setEnrollIndexNumber("");
      setEnrollSearch("");
      setEnrollResults([]);
      load();
    } catch (err: any) {
      setEnrollError(err?.response?.data?.detail || "Enroll failed.");
    } finally {
      setEnrolling(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !eid || !bid) return;
    setImporting(true);
    setImportResult(null);
    setImportError("");
    try {
      const res = await batchesApi.importMembers(eid, bid, file);
      setImportResult(res.data);
      load();
    } catch (err: any) {
      setImportError(err?.response?.data?.detail || "Import failed.");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleExport = async (format: "csv" | "xlsx") => {
    if (!eid || !bid) return;
    try {
      const res = await batchesApi.exportMembers(eid, bid, format);
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `batch_members.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed.");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (loading) return <Layout><p style={{ color: "#718096" }}>Loading…</p></Layout>;
  if (!batch) return <Layout><p style={{ color: "#c53030" }}>{error || "Batch not found."}</p></Layout>;

  return (
    <Layout>
      <div style={styles.breadcrumb}>
        <Link to="/examinations" style={styles.breadLink}>Examinations</Link>
        {" / "}
        <Link to={`/examinations/${eid}`} style={styles.breadLink}>Examination</Link>
        {" / "}
        <span style={{ color: "#718096" }}>Batch: {batch.name}</span>
      </div>

      {/* Header */}
      <div style={styles.headerCard}>
        <div style={styles.headerTop}>
          {renamingBatch ? (
            <form onSubmit={handleRename} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                style={styles.renameInput}
                value={newBatchName}
                onChange={(e) => setNewBatchName(e.target.value)}
                autoFocus
                required
              />
              <button type="submit" style={styles.saveBtn}>Save</button>
              <button type="button" style={styles.cancelBtn} onClick={() => setRenamingBatch(false)}>Cancel</button>
            </form>
          ) : (
            <div>
              <h1 style={styles.h1}>{batch.name}</h1>
              <p style={styles.sub}>{batch.member_count} enrolled candidate{batch.member_count !== 1 ? "s" : ""}</p>
            </div>
          )}
          {canEdit && !renamingBatch && (
            <div style={{ display: "flex", gap: 8 }}>
              <button style={styles.secondaryBtn} onClick={() => setRenamingBatch(true)}>Rename</button>
              <button style={styles.secondaryBtn} onClick={() => fileInputRef.current?.click()} disabled={importing}>
                {importing ? "Importing…" : "Import CSV/XLSX"}
              </button>
              <input ref={fileInputRef} type="file" accept=".csv,.xlsx" style={{ display: "none" }} onChange={handleImport} />
              <button style={styles.secondaryBtn} onClick={() => handleExport("csv")}>Export CSV</button>
              <button style={styles.secondaryBtn} onClick={() => handleExport("xlsx")}>Export XLSX</button>
              {!showEnrollForm && (
                <button style={styles.enrollBtn} onClick={() => setShowEnrollForm(true)}>+ Enroll Candidate</button>
              )}
            </div>
          )}
        </div>

        {importResult && (
          <div style={importResult.errors.length > 0 ? styles.alertWarn : styles.alertOk}>
            <strong>Import complete:</strong> {importResult.enrolled} enrolled
            {importResult.errors.length > 0 && (
              <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                {importResult.errors.map((e, i) => (
                  <li key={i} style={{ fontSize: 12 }}>Row {e.row}: {e.message}</li>
                ))}
              </ul>
            )}
            <button style={styles.dismissBtn} onClick={() => setImportResult(null)}>✕</button>
          </div>
        )}
        {importError && (
          <div style={styles.alertErr}>{importError}<button style={styles.dismissBtn} onClick={() => setImportError("")}>✕</button></div>
        )}
      </div>

      {/* Enroll form */}
      {canEdit && showEnrollForm && (
        <div style={styles.enrollCard}>
          <h3 style={styles.enrollTitle}>Enroll a Candidate</h3>
          {enrollError && <div style={styles.alertErr}>{enrollError}</div>}
          <div style={styles.enrollSearch}>
            <input
              style={styles.input}
              placeholder="Search by name or registration number…"
              value={enrollSearch}
              onChange={(e) => setEnrollSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleEnrollSearch()}
            />
            <button style={styles.saveBtn} onClick={handleEnrollSearch}>Search</button>
          </div>
          {enrollResults.length > 0 && !enrollCandidate && (
            <div style={styles.enrollResultList}>
              {enrollResults.map((c) => (
                <button key={c.id} style={styles.enrollResultItem} onClick={() => setEnrollCandidate(c)}>
                  <strong>{c.name}</strong> <span style={{ color: "#718096", fontSize: 12 }}>{c.registration_number}</span>
                </button>
              ))}
            </div>
          )}
          {enrollCandidate && (
            <div style={styles.enrollSelected}>
              <span>Selected: <strong>{enrollCandidate.name}</strong> ({enrollCandidate.registration_number})</span>
              <button style={{ ...styles.cancelBtn, fontSize: 11, padding: "2px 8px" }} onClick={() => setEnrollCandidate(null)}>Change</button>
            </div>
          )}
          <div style={styles.enrollIndexRow}>
            <label style={styles.label}>Index Number for this sitting</label>
            <input
              style={{ ...styles.input, width: 200 }}
              value={enrollIndexNumber}
              onChange={(e) => setEnrollIndexNumber(e.target.value)}
              placeholder="e.g. 2026001"
            />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button
              style={styles.enrollBtn}
              disabled={!enrollCandidate || !enrollIndexNumber.trim() || enrolling}
              onClick={handleEnroll}
            >
              {enrolling ? "Enrolling…" : "Enroll"}
            </button>
            <button style={styles.cancelBtn} onClick={() => { setShowEnrollForm(false); setEnrollError(""); setEnrollCandidate(null); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <form onSubmit={handleSearch} style={styles.searchRow}>
        <input
          style={styles.searchInput}
          placeholder="Search by name, registration number, or index number…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <button type="submit" style={styles.searchBtn}>Search</button>
        {search && (
          <button type="button" style={{ ...styles.searchBtn, background: "#e2e8f0", color: "#2d3748" }}
            onClick={() => { setSearchInput(""); setSearch(""); setPage(1); }}>
            Clear
          </button>
        )}
      </form>

      {/* Import CSV format hint */}
      {canEdit && (
        <div style={styles.hint}>
          <strong>Import CSV format:</strong> columns <code>registration_number</code>, <code>index_number</code>
        </div>
      )}

      {/* Members table */}
      {members.length === 0 ? (
        <div style={styles.empty}>
          {search ? "No members match your search." : "No candidates enrolled yet."}
        </div>
      ) : (
        <>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Index No.</th>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Reg. No.</th>
                {canEdit && <th style={styles.th}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} style={styles.tr}>
                  <td style={{ ...styles.td, fontFamily: "monospace", fontWeight: 700 }}>{m.index_number}</td>
                  <td style={styles.td}>
                    <Link to={`/candidates/${m.candidate_id}`} style={styles.candidateLink}>
                      {m.candidate_name}
                    </Link>
                  </td>
                  <td style={styles.td}>{m.candidate_registration_number}</td>
                  {canEdit && (
                    <td style={styles.td}>
                      <button
                        style={styles.removeBtn}
                        onClick={() => handleUnenroll(m.id, m.candidate_name)}
                      >
                        Remove
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          <div style={styles.pagination}>
            <button style={styles.pageBtn} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span style={styles.pageInfo}>Page {page} of {totalPages} ({total} total)</span>
            <button style={styles.pageBtn} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        </>
      )}
    </Layout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  breadcrumb: { fontSize: 13, color: "#718096", marginBottom: 20 },
  breadLink: { color: "#ba3c3c", textDecoration: "none", fontWeight: 500 },
  headerCard: {
    background: "#fff", borderRadius: 10, padding: "20px 24px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)", marginBottom: 20,
    border: "1px solid #e8e0d0", display: "flex", flexDirection: "column" as const, gap: 12,
  },
  headerTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" as const, gap: 12 },
  h1: { fontSize: 20, fontWeight: 700, color: "#233654", margin: 0 },
  sub: { fontSize: 13, color: "#718096", margin: "4px 0 0" },
  renameInput: { padding: "6px 10px", border: "1px solid #d4c5a9", borderRadius: 6, fontSize: 15, fontWeight: 700, fontFamily: "inherit" },
  saveBtn: { padding: "7px 16px", background: "#233654", color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: "pointer" },
  cancelBtn: { padding: "7px 16px", background: "#f5f0e8", color: "#233654", border: "1px solid #d4c5a9", borderRadius: 6, fontWeight: 500, fontSize: 13, cursor: "pointer" },
  secondaryBtn: { padding: "7px 14px", background: "#f5f0e8", color: "#233654", border: "1px solid #d4c5a9", borderRadius: 6, fontWeight: 500, fontSize: 12, cursor: "pointer" },
  enrollBtn: { padding: "7px 18px", background: "#ba3c3c", color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: "pointer" },
  enrollCard: {
    background: "#fff", borderRadius: 8, padding: "20px 24px",
    border: "1px solid #d4c5a9", marginBottom: 20,
    display: "flex", flexDirection: "column" as const, gap: 12,
  },
  enrollTitle: { fontSize: 15, fontWeight: 700, color: "#233654", margin: 0 },
  enrollSearch: { display: "flex", gap: 8 },
  enrollResultList: {
    border: "1px solid #e2e8f0", borderRadius: 6, overflow: "hidden", maxHeight: 200, overflowY: "auto" as const,
  },
  enrollResultItem: {
    display: "block", width: "100%", padding: "8px 12px", textAlign: "left" as const,
    background: "transparent", border: "none", borderBottom: "1px solid #f0ebe0",
    cursor: "pointer", fontSize: 13,
  },
  enrollSelected: {
    display: "flex", alignItems: "center", gap: 10,
    background: "#f0fff4", border: "1px solid #9ae6b4", borderRadius: 6,
    padding: "8px 12px", fontSize: 13,
  },
  enrollIndexRow: { display: "flex", flexDirection: "column" as const, gap: 4 },
  label: { fontSize: 12, fontWeight: 600, color: "#718096" },
  input: { padding: "8px 12px", border: "1px solid #d4c5a9", borderRadius: 6, fontSize: 14, fontFamily: "inherit" },
  hint: {
    background: "#fef9ec", border: "1px solid #f6d860", borderRadius: 6,
    padding: "8px 14px", fontSize: 12, color: "#744210", marginBottom: 12,
  },
  searchRow: { display: "flex", gap: 8, marginBottom: 16 },
  searchInput: { flex: 1, padding: "8px 12px", border: "1px solid #d4c5a9", borderRadius: 6, fontSize: 14 },
  searchBtn: { padding: "8px 16px", background: "#233654", color: "#fff", border: "none", borderRadius: 6, fontWeight: 500, fontSize: 13, cursor: "pointer" },
  table: { width: "100%", borderCollapse: "collapse" as const, background: "#fff", borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  th: { padding: "11px 16px", textAlign: "left" as const, fontSize: 12, fontWeight: 600, color: "#718096", background: "#f9f6f0", borderBottom: "1px solid #e2e8f0" },
  tr: { borderBottom: "1px solid #e2e8f0" },
  td: { padding: "11px 16px", fontSize: 14, color: "#2d3748" },
  candidateLink: { color: "#ba3c3c", textDecoration: "none", fontWeight: 600 },
  removeBtn: { padding: "3px 10px", background: "#fff5f5", color: "#c53030", border: "1px solid #feb2b2", borderRadius: 4, fontSize: 12, cursor: "pointer" },
  empty: { textAlign: "center" as const, padding: "40px 0", color: "#718096" },
  pagination: { display: "flex", alignItems: "center", gap: 12, marginTop: 16, justifyContent: "center" },
  pageBtn: { padding: "6px 14px", background: "#f5f0e8", color: "#233654", border: "1px solid #d4c5a9", borderRadius: 6, cursor: "pointer", fontSize: 13 },
  pageInfo: { fontSize: 13, color: "#718096" },
  alertOk: { background: "#f0fff4", border: "1px solid #9ae6b4", borderRadius: 6, padding: "10px 14px", fontSize: 13, color: "#276749", position: "relative" as const },
  alertWarn: { background: "#fffbeb", border: "1px solid #f6e05e", borderRadius: 6, padding: "10px 14px", fontSize: 13, color: "#744210", position: "relative" as const },
  alertErr: { background: "#fff5f5", border: "1px solid #feb2b2", borderRadius: 6, padding: "10px 14px", fontSize: 13, color: "#742a2a", position: "relative" as const },
  dismissBtn: { position: "absolute" as const, top: 8, right: 10, background: "transparent", border: "none", cursor: "pointer", fontSize: 13 },
};
