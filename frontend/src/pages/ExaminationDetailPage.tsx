import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Layout } from "../components/layout/Layout";
import { examinationsApi, type ExaminationDetail, type SubjectWithPapers } from "../api/examinations";
import { examsApi, type Exam } from "../api/exams";
import { useAuth, hasRole } from "../auth/AuthContext";

type Status = "draft" | "active" | "closed";

export function ExaminationDetailPage() {
  const { eid } = useParams<{ eid: string }>();
  const { user } = useAuth();
  const isAdmin = hasRole(user, "admin");
  const canEdit = hasRole(user, "admin", "creator");

  const [examination, setExamination] = useState<ExaminationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Edit examination header
  const [editingHeader, setEditingHeader] = useState(false);
  const [headerForm, setHeaderForm] = useState({ title: "", description: "", exam_date: "" });
  const [savingHeader, setSavingHeader] = useState(false);

  // Add subject
  const [newSubjectName, setNewSubjectName] = useState("");
  const [addingSubject, setAddingSubject] = useState(false);
  const [subjectError, setSubjectError] = useState("");

  // Edit subject inline
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editSubjectName, setEditSubjectName] = useState("");

  // Assign paper to subject
  const [assignTarget, setAssignTarget] = useState<string | null>(null); // subject id
  const [unassignedExams, setUnassignedExams] = useState<Exam[]>([]);
  const [assigningExamId, setAssigningExamId] = useState("");

  const load = async () => {
    if (!eid) return;
    try {
      const res = await examinationsApi.get(eid);
      setExamination(res.data);
      setHeaderForm({
        title: res.data.title,
        description: res.data.description ?? "",
        exam_date: res.data.exam_date ? res.data.exam_date.slice(0, 10) : "",
      });
    } catch {
      setError("Examination not found.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [eid]);

  const handleSaveHeader = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eid) return;
    setSavingHeader(true);
    try {
      await examinationsApi.update(eid, {
        title: headerForm.title,
        description: headerForm.description || undefined,
        exam_date: headerForm.exam_date || undefined,
      });
      setEditingHeader(false);
      load();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Save failed.");
    } finally {
      setSavingHeader(false);
    }
  };

  const handleTransition = async (target: "active" | "closed") => {
    if (!eid) return;
    const msg =
      target === "active"
        ? "Activate this examination? Subject names and dates will be locked."
        : "Close this examination permanently? All editing will be locked.";
    if (!confirm(msg)) return;
    try {
      await examinationsApi.transition(eid, target);
      load();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Transition failed.");
    }
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eid || !newSubjectName.trim()) return;
    setAddingSubject(true);
    setSubjectError("");
    try {
      await examinationsApi.addSubject(eid, { name: newSubjectName.trim() });
      setNewSubjectName("");
      load();
    } catch (err: any) {
      setSubjectError(err?.response?.data?.detail || "Failed to add subject.");
    } finally {
      setAddingSubject(false);
    }
  };

  const handleRenameSubject = async (sid: string) => {
    if (!eid || !editSubjectName.trim()) return;
    try {
      await examinationsApi.updateSubject(eid, sid, { name: editSubjectName.trim() });
      setEditingSubjectId(null);
      load();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Rename failed.");
    }
  };

  const handleDeleteSubject = async (sid: string, name: string) => {
    if (!eid) return;
    if (!confirm(`Delete subject "${name}"? Papers in it must be reassigned first.`)) return;
    try {
      await examinationsApi.deleteSubject(eid, sid);
      load();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Delete failed.");
    }
  };

  const openAssignPanel = async (sid: string) => {
    setAssignTarget(sid);
    setAssigningExamId("");
    const allExams = (await examsApi.list()).data;
    // Show papers not yet in any subject (subject_id === null) OR in a different examination
    const assignedInThisExam = new Set(
      examination?.subjects.flatMap((s) => s.papers.map((p) => p.id)) ?? []
    );
    setUnassignedExams(allExams.filter((e) => !assignedInThisExam.has(e.id)));
  };

  const handleAssignPaper = async () => {
    if (!assignTarget || !assigningExamId) return;
    try {
      await examsApi.update(assigningExamId, { subject_id: assignTarget });
      setAssignTarget(null);
      load();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Assign failed.");
    }
  };

  const handleUnassignPaper = async (paperId: string, paperTitle: string) => {
    if (!confirm(`Remove "${paperTitle}" from this subject?`)) return;
    try {
      await examsApi.update(paperId, { subject_id: undefined });
      load();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Remove failed.");
    }
  };

  if (loading) return <Layout><p style={{ color: "#718096" }}>Loading…</p></Layout>;
  if (!examination) return <Layout><p style={{ color: "#c53030" }}>{error || "Not found."}</p></Layout>;

  const status = examination.status as Status;
  const isDraft = status === "draft";
  const isActive = status === "active";
  const isClosed = status === "closed";

  return (
    <Layout>
      <div style={styles.breadcrumb}>
        <Link to="/examinations" style={styles.breadLink}>Examinations</Link>
        {" / "}
        <span style={{ color: "#718096" }}>{examination.title}</span>
      </div>

      {/* Header card */}
      <div style={styles.headerCard}>
        <div style={styles.headerTop}>
          <div style={{ flex: 1 }}>
            {editingHeader ? (
              <form onSubmit={handleSaveHeader} style={styles.editHeaderForm}>
                <input
                  style={styles.titleInput}
                  value={headerForm.title}
                  onChange={(e) => setHeaderForm(f => ({ ...f, title: e.target.value }))}
                  required
                />
                <input
                  style={styles.dateInput}
                  type="date"
                  value={headerForm.exam_date}
                  onChange={(e) => setHeaderForm(f => ({ ...f, exam_date: e.target.value }))}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="submit" style={styles.saveBtn} disabled={savingHeader}>
                    {savingHeader ? "Saving…" : "Save"}
                  </button>
                  <button type="button" style={styles.cancelBtn} onClick={() => setEditingHeader(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div style={styles.titleRow}>
                  <h1 style={styles.h1}>{examination.title}</h1>
                  <span style={{ ...styles.statusBadge, ...statusStyle(status) }}>
                    {status.toUpperCase()}
                  </span>
                </div>
                {examination.description && (
                  <p style={styles.desc}>{examination.description}</p>
                )}
                <div style={styles.metaRow}>
                  {examination.exam_date && (
                    <span style={styles.metaItem}>
                      📅 {new Date(examination.exam_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                    </span>
                  )}
                  <span style={styles.metaItem}>{examination.subject_count} subject{examination.subject_count !== 1 ? "s" : ""}</span>
                  <span style={styles.metaItem}>{examination.paper_count} paper{examination.paper_count !== 1 ? "s" : ""}</span>
                </div>
              </>
            )}
          </div>

          {/* Action buttons */}
          {!editingHeader && (
            <div style={styles.headerActions}>
              {canEdit && isDraft && (
                <button style={styles.editBtn} onClick={() => setEditingHeader(true)}>Edit</button>
              )}
              {canEdit && isDraft && (
                <button style={styles.activateBtn} onClick={() => handleTransition("active")}>
                  Activate
                </button>
              )}
              {isAdmin && isActive && (
                <button style={styles.closeBtn} onClick={() => handleTransition("closed")}>
                  Close Examination
                </button>
              )}
            </div>
          )}
        </div>

        {isClosed && (
          <div style={styles.closedBanner}>
            This examination is closed. All editing is locked.
          </div>
        )}
      </div>

      {error && <div style={styles.alertErr}>{error}</div>}

      {/* Subjects & Papers */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Subjects &amp; Papers</h2>

        {examination.subjects.length === 0 && (
          <div style={styles.emptySubjects}>
            {isDraft
              ? "No subjects yet. Add subjects below to organise papers."
              : "No subjects in this examination."}
          </div>
        )}

        {examination.subjects.map((subject) => (
          <SubjectBlock
            key={subject.id}
            subject={subject}
            status={status}
            canEdit={canEdit && !isClosed}
            isDraft={isDraft}
            isEditingName={editingSubjectId === subject.id}
            editNameValue={editSubjectName}
            onEditNameChange={setEditSubjectName}
            onStartEdit={() => { setEditingSubjectId(subject.id); setEditSubjectName(subject.name); }}
            onSaveRename={() => handleRenameSubject(subject.id)}
            onCancelEdit={() => setEditingSubjectId(null)}
            onDelete={() => handleDeleteSubject(subject.id, subject.name)}
            onAssignPaper={() => openAssignPanel(subject.id)}
            onUnassignPaper={handleUnassignPaper}
            isAssigning={assignTarget === subject.id}
            unassignedExams={unassignedExams}
            assigningExamId={assigningExamId}
            onAssigningExamIdChange={setAssigningExamId}
            onConfirmAssign={handleAssignPaper}
            onCancelAssign={() => setAssignTarget(null)}
          />
        ))}

        {/* Add subject form */}
        {canEdit && isDraft && (
          <form onSubmit={handleAddSubject} style={styles.addSubjectForm}>
            <input
              style={styles.addSubjectInput}
              placeholder="New subject name (e.g. Anatomy)"
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
            />
            <button type="submit" style={styles.addSubjectBtn} disabled={addingSubject || !newSubjectName.trim()}>
              {addingSubject ? "Adding…" : "+ Add Subject"}
            </button>
            {subjectError && <span style={{ color: "#c53030", fontSize: 12 }}>{subjectError}</span>}
          </form>
        )}
      </div>
    </Layout>
  );
}

// ---------------------------------------------------------------------------
// SubjectBlock component
// ---------------------------------------------------------------------------

interface SubjectBlockProps {
  subject: SubjectWithPapers;
  status: Status;
  canEdit: boolean;
  isDraft: boolean;
  isEditingName: boolean;
  editNameValue: string;
  onEditNameChange: (v: string) => void;
  onStartEdit: () => void;
  onSaveRename: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onAssignPaper: () => void;
  onUnassignPaper: (paperId: string, title: string) => void;
  isAssigning: boolean;
  unassignedExams: Exam[];
  assigningExamId: string;
  onAssigningExamIdChange: (id: string) => void;
  onConfirmAssign: () => void;
  onCancelAssign: () => void;
}

function SubjectBlock({
  subject, canEdit, isDraft,
  isEditingName, editNameValue, onEditNameChange,
  onStartEdit, onSaveRename, onCancelEdit,
  onDelete, onAssignPaper, onUnassignPaper,
  isAssigning, unassignedExams, assigningExamId,
  onAssigningExamIdChange, onConfirmAssign, onCancelAssign,
}: SubjectBlockProps) {
  return (
    <div style={bs.block}>
      {/* Subject header */}
      <div style={bs.subjectHeader}>
        {isEditingName ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center", flex: 1 }}>
            <input
              style={bs.renameInput}
              value={editNameValue}
              onChange={(e) => onEditNameChange(e.target.value)}
              autoFocus
            />
            <button style={bs.saveSmBtn} onClick={onSaveRename}>Save</button>
            <button style={bs.cancelSmBtn} onClick={onCancelEdit}>Cancel</button>
          </div>
        ) : (
          <>
            <span style={bs.subjectName}>{subject.name}</span>
            <span style={bs.paperCount}>{subject.papers.length} paper{subject.papers.length !== 1 ? "s" : ""}</span>
          </>
        )}
        {canEdit && !isEditingName && isDraft && (
          <div style={bs.subjectActions}>
            <button style={bs.smBtn} onClick={onStartEdit}>Rename</button>
            <button style={{ ...bs.smBtn, color: "#c53030" }} onClick={onDelete}>Delete</button>
          </div>
        )}
      </div>

      {/* Papers list */}
      {subject.papers.length > 0 ? (
        <div style={bs.paperList}>
          {subject.papers.map((paper) => (
            <div key={paper.id} style={bs.paperRow}>
              <Link to={`/exams/${paper.id}`} style={bs.paperLink}>{paper.title}</Link>
              {paper.name && <span style={bs.paperSub}>{paper.name}</span>}
              <span style={{ ...bs.paperBadge, ...examBadgeStyle(paper.status) }}>{paper.status}</span>
              <span style={bs.paperMeta}>{paper.total_questions} Qs</span>
              {canEdit && (
                <button
                  style={bs.unassignBtn}
                  onClick={() => onUnassignPaper(paper.id, paper.title)}
                  title="Remove from subject"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={bs.emptyPapers}>No papers assigned to this subject.</div>
      )}

      {/* Assign panel */}
      {canEdit && (
        <div style={bs.assignRow}>
          {isAssigning ? (
            <div style={bs.assignPanel}>
              <select
                style={bs.assignSelect}
                value={assigningExamId}
                onChange={(e) => onAssigningExamIdChange(e.target.value)}
              >
                <option value="">— select a paper —</option>
                {unassignedExams.map((e) => (
                  <option key={e.id} value={e.id}>{e.title}{e.name ? ` (${e.name})` : ""}</option>
                ))}
              </select>
              <button style={bs.saveSmBtn} disabled={!assigningExamId} onClick={onConfirmAssign}>
                Assign
              </button>
              <button style={bs.cancelSmBtn} onClick={onCancelAssign}>Cancel</button>
              <Link to="/exams/new" style={bs.newPaperLink}>+ Create new paper</Link>
            </div>
          ) : (
            <button style={bs.assignBtn} onClick={onAssignPaper}>+ Assign paper</button>
          )}
        </div>
      )}
    </div>
  );
}

function statusStyle(status: Status): React.CSSProperties {
  const map: Record<Status, [string, string]> = {
    draft: ["#4a5568", "#e2e8f0"],
    active: ["#276749", "#c6f6d5"],
    closed: ["#fff", "#233654"],
  };
  const [color, bg] = map[status];
  return { color, background: bg };
}

function examBadgeStyle(status: string): React.CSSProperties {
  const map: Record<string, [string, string]> = {
    draft: ["#744210", "#fefcbf"],
    active: ["#276749", "#c6f6d5"],
    closed: ["#742a2a", "#fed7d7"],
  };
  const [color, bg] = map[status] ?? ["#2d3748", "#e2e8f0"];
  return { color, background: bg };
}

const styles: Record<string, React.CSSProperties> = {
  breadcrumb: { fontSize: 13, color: "#718096", marginBottom: 20 },
  breadLink: { color: "#ba3c3c", textDecoration: "none", fontWeight: 500 },
  headerCard: {
    background: "#fff",
    borderRadius: 10,
    padding: "24px 28px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
    marginBottom: 24,
    border: "1px solid #e8e0d0",
  },
  headerTop: { display: "flex", gap: 16, alignItems: "flex-start" },
  titleRow: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" as const },
  h1: { fontSize: 22, fontWeight: 700, color: "#233654", margin: 0 },
  statusBadge: {
    padding: "3px 12px",
    borderRadius: 99,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },
  desc: { fontSize: 14, color: "#718096", margin: "8px 0 0" },
  metaRow: { display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" as const },
  metaItem: { fontSize: 13, color: "#718096" },
  headerActions: { display: "flex", gap: 8, flexShrink: 0 },
  editBtn: {
    padding: "7px 16px", background: "#f5f0e8", color: "#233654",
    border: "1px solid #d4c5a9", borderRadius: 6, fontWeight: 500, fontSize: 13, cursor: "pointer",
  },
  activateBtn: {
    padding: "7px 16px", background: "#276749", color: "#fff",
    border: "none", borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: "pointer",
  },
  closeBtn: {
    padding: "7px 16px", background: "#233654", color: "#fff",
    border: "none", borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: "pointer",
  },
  editHeaderForm: { display: "flex", flexDirection: "column" as const, gap: 8 },
  titleInput: {
    fontSize: 18, fontWeight: 700, color: "#233654",
    border: "1px solid #d4c5a9", borderRadius: 6, padding: "6px 10px",
    fontFamily: "inherit",
  },
  dateInput: {
    padding: "6px 10px", border: "1px solid #d4c5a9", borderRadius: 6,
    fontSize: 13, fontFamily: "inherit", width: "fit-content",
  },
  saveBtn: {
    padding: "7px 18px", background: "#233654", color: "#fff",
    border: "none", borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: "pointer",
  },
  cancelBtn: {
    padding: "7px 16px", background: "#f5f0e8", color: "#233654",
    border: "1px solid #d4c5a9", borderRadius: 6, fontWeight: 500, fontSize: 13, cursor: "pointer",
  },
  closedBanner: {
    marginTop: 16, background: "#edf2f7", color: "#4a5568",
    padding: "10px 14px", borderRadius: 6, fontSize: 13, fontWeight: 500,
  },
  alertErr: {
    background: "#fff5f5", border: "1px solid #feb2b2",
    borderRadius: 6, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#742a2a",
  },
  section: { marginTop: 8 },
  sectionTitle: { fontSize: 17, fontWeight: 700, color: "#233654", marginBottom: 14 },
  emptySubjects: {
    background: "#fff", borderRadius: 8, padding: "24px",
    textAlign: "center" as const, color: "#718096", fontSize: 14,
    border: "1px dashed #d4c5a9", marginBottom: 16,
  },
  addSubjectForm: { display: "flex", gap: 8, alignItems: "center", marginTop: 12, flexWrap: "wrap" as const },
  addSubjectInput: {
    padding: "8px 12px", border: "1px solid #d4c5a9", borderRadius: 6,
    fontSize: 14, width: 260, fontFamily: "inherit",
  },
  addSubjectBtn: {
    padding: "8px 18px", background: "#233654", color: "#fff",
    border: "none", borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: "pointer",
  },
};

// SubjectBlock styles
const bs: Record<string, React.CSSProperties> = {
  block: {
    background: "#fff", borderRadius: 8, marginBottom: 12,
    border: "1px solid #e8e0d0", overflow: "hidden",
  },
  subjectHeader: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "12px 18px", background: "#f9f6f0",
    borderBottom: "1px solid #e8e0d0",
  },
  subjectName: { fontSize: 15, fontWeight: 700, color: "#233654", flex: 1 },
  paperCount: { fontSize: 12, color: "#a0aec0" },
  subjectActions: { display: "flex", gap: 6 },
  smBtn: {
    padding: "3px 10px", background: "transparent",
    border: "1px solid #d4c5a9", borderRadius: 4,
    fontSize: 11, cursor: "pointer", color: "#4a5568",
  },
  renameInput: {
    padding: "4px 8px", border: "1px solid #d4c5a9",
    borderRadius: 4, fontSize: 14, fontFamily: "inherit",
  },
  saveSmBtn: {
    padding: "4px 10px", background: "#233654", color: "#fff",
    border: "none", borderRadius: 4, fontSize: 12, cursor: "pointer", fontWeight: 600,
  },
  cancelSmBtn: {
    padding: "4px 10px", background: "#f5f0e8", color: "#2d3748",
    border: "1px solid #d4c5a9", borderRadius: 4, fontSize: 12, cursor: "pointer",
  },
  paperList: { padding: "4px 0" },
  paperRow: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 18px", borderBottom: "1px solid #f0ebe0", flexWrap: "wrap" as const,
  },
  paperLink: { color: "#ba3c3c", textDecoration: "none", fontWeight: 600, fontSize: 14 },
  paperSub: { fontSize: 12, color: "#718096" },
  paperBadge: {
    padding: "1px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700,
  },
  paperMeta: { fontSize: 12, color: "#a0aec0", marginLeft: "auto" },
  unassignBtn: {
    padding: "2px 6px", background: "transparent",
    border: "none", cursor: "pointer", color: "#a0aec0", fontSize: 13, marginLeft: 4,
  },
  emptyPapers: { padding: "14px 18px", fontSize: 13, color: "#a0aec0" },
  assignRow: { padding: "10px 18px", background: "#fafafa" },
  assignPanel: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const },
  assignSelect: {
    padding: "5px 8px", border: "1px solid #d4c5a9",
    borderRadius: 4, fontSize: 13, fontFamily: "inherit",
  },
  assignBtn: {
    padding: "4px 12px", background: "transparent",
    border: "1px dashed #b79a62", borderRadius: 4,
    color: "#b79a62", fontSize: 12, cursor: "pointer", fontWeight: 600,
  },
  newPaperLink: {
    color: "#718096", textDecoration: "none",
    fontSize: 12, marginLeft: 8, borderBottom: "1px dotted #718096",
  },
};
