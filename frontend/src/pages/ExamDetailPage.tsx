import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ExamLayout } from "../components/layout/ExamLayout";
import { examsApi, type Exam, type Question, type AnswerKey } from "../api/exams";
import { useAuth, hasRole } from "../auth/AuthContext";

export function ExamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEditAnswerKey = hasRole(user, "admin", "creator");
  const canEditPassMark = hasRole(user, "admin", "creator", "marker");
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answerKeys, setAnswerKeys] = useState<AnswerKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editPassMark, setEditPassMark] = useState(50);
  const [editingPassMark, setEditingPassMark] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      examsApi.get(id),
      examsApi.listQuestions(id),
      examsApi.getAnswerKey(id).catch(() => ({ data: [] as AnswerKey[] })),
    ]).then(([examRes, questionsRes, akRes]) => {
      setExam(examRes.data);
      setEditTitle(examRes.data.title);
      setEditStatus(examRes.data.status);
      setEditPassMark(examRes.data.pass_mark ?? 50);
      setQuestions(questionsRes.data);
      setAnswerKeys(akRes.data);
      setLoading(false);
    });
  }, [id]);

  const handleSave = async () => {
    if (!id || !exam) return;
    const res = await examsApi.update(id, { title: editTitle, status: editStatus });
    setExam(res.data);
    setEditing(false);
  };

  const handleSavePassMark = async () => {
    if (!id) return;
    const res = await examsApi.update(id, { pass_mark: editPassMark });
    setExam(res.data);
    setEditingPassMark(false);
  };

  const handleAnswerKeyChange = (qId: string, field: "correct_option" | "sub_options", value: string | Record<string, boolean>) => {
    setAnswerKeys((prev) => {
      const existing = prev.find((ak) => ak.question_id === qId);
      if (existing) {
        return prev.map((ak) => ak.question_id === qId ? { ...ak, [field]: value } : ak);
      }
      return [...prev, { id: "", question_id: qId, correct_option: null, sub_options: null, [field]: value }];
    });
  };

  const handleSaveAnswerKey = async () => {
    if (!id) return;
    const payload = answerKeys
      .filter((ak) => ak.question_id)
      .map((ak) => ({
        question_id: ak.question_id,
        correct_option: ak.correct_option ?? undefined,
        sub_options: ak.sub_options ?? undefined,
      }));
    await examsApi.upsertAnswerKey(id, payload);
    navigate(0);
  };

  if (loading) return <ExamLayout><p>Loading...</p></ExamLayout>;
  if (!exam) return <ExamLayout><p>Exam not found.</p></ExamLayout>;

  const breadcrumb = exam.examination_id && exam.examination_title ? (
    <div style={{ fontSize: 13, color: "#718096", marginBottom: 12 }}>
      <Link to="/examinations" style={{ color: "#ba3c3c", textDecoration: "none", fontWeight: 500 }}>
        Examinations
      </Link>
      {" / "}
      <Link to={`/examinations/${exam.examination_id}`} style={{ color: "#ba3c3c", textDecoration: "none", fontWeight: 500 }}>
        {exam.examination_title}
      </Link>
      {exam.subject_name && <>{" / "}<span>{exam.subject_name}</span></>}
      {" / "}
      <span>{exam.title}</span>
    </div>
  ) : null;

  const type1 = questions.filter((q) => q.question_type === "type1");

  const answerKeyComplete = questions.length > 0 && questions.every((q) => {
    const ak = answerKeys.find((a) => a.question_id === q.id);
    if (!ak) return false;
    if (q.question_type === "type1") return !!ak.correct_option;
    const opts = ak.sub_options;
    return !!opts && ["A", "B", "C", "D", "E"].every((o) => opts[o] === true || opts[o] === false);
  });

  return (
    <ExamLayout>
      {breadcrumb}
      <div style={styles.header}>
        {canEditAnswerKey && (editing ? (
          <div style={styles.editRow}>
            <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} style={styles.titleInput} />
            <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} style={styles.select}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
            </select>
            <button onClick={handleSave} style={styles.saveBtn}>Save</button>
            <button onClick={() => setEditing(false)} style={styles.cancelBtn}>Cancel</button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} style={styles.editBtn}>Edit Exam</button>
        ))}
      </div>

      <div style={styles.meta}>
        {exam.name && <MetaItem label="Ref. Name" value={exam.name} />}
        <MetaItem label="Status" value={exam.status} />
        <MetaItem label="Questions" value={String(exam.total_questions)} />
        <MetaItem label="Date" value={exam.exam_date ? new Date(exam.exam_date).toLocaleDateString() : "—"} />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 12, color: "#718096" }}>Pass Mark</div>
          {canEditPassMark && editingPassMark ? (
            <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
              <input
                type="number"
                min={0}
                max={100}
                value={editPassMark}
                onChange={(e) => setEditPassMark(Math.min(100, Math.max(0, Number(e.target.value))))}
                style={{ width: 56, padding: "2px 6px", border: "1px solid #e2e8f0", borderRadius: 4, fontSize: 14, textAlign: "center" }}
              />
              <span style={{ fontSize: 12, color: "#718096" }}>%</span>
              <button onClick={handleSavePassMark} style={{ ...styles.saveBtn, padding: "2px 8px", fontSize: 11 }}>Save</button>
              <button onClick={() => { setEditingPassMark(false); setEditPassMark(exam.pass_mark ?? 50); }} style={{ ...styles.cancelBtn, padding: "2px 8px", fontSize: 11 }}>✕</button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: "#2d3748" }}>{exam.pass_mark ?? 50}%</span>
              {canEditPassMark && (
                <button onClick={() => setEditingPassMark(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "#718096", fontSize: 11, padding: "0 2px" }} title="Edit pass mark">✎</button>
              )}
            </div>
          )}
        </div>
      </div>

      {!answerKeyComplete && questions.length > 0 && (
        <div style={styles.answerKeyWarning}>
          Answer key is incomplete — fill all questions below and save before uploading submissions or viewing results.
        </div>
      )}

      <div style={styles.section}>
        <h2 style={styles.h2}>Questions ({questions.length})</h2>
        <p style={styles.hint}>
          Question type: {type1.length > 0 ? "Type 1 — Single Best Answer" : "Type 2 — Extended True/False"}
        </p>
        {questions.length === 0 && (
          <Link to={`/exams/new`} style={styles.link}>No questions yet — recreate with questions.</Link>
        )}
      </div>

      {questions.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.h2}>Answer Key</h2>
          {questions[0].question_type === "type1" ? (
            <Type1Grid
              questions={questions}
              answerKeys={answerKeys}
              canEdit={canEditAnswerKey}
              onChange={handleAnswerKeyChange}
            />
          ) : (
            <Type2Grid
              questions={questions}
              answerKeys={answerKeys}
              canEdit={canEditAnswerKey}
              onChange={handleAnswerKeyChange}
            />
          )}
          {canEditAnswerKey && (
            <button onClick={handleSaveAnswerKey} style={styles.saveAkBtn}>Save Answer Key</button>
          )}
        </div>
      )}
    </ExamLayout>
  );
}

const OPTIONS = ["A", "B", "C", "D", "E"];

function Type1Grid({ questions, answerKeys, canEdit, onChange }: {
  questions: { id: string; question_number: number; question_type: string }[];
  answerKeys: { question_id: string; correct_option: string | null; sub_options: Record<string, boolean> | null }[];
  canEdit: boolean;
  onChange: (qId: string, field: "correct_option" | "sub_options", value: string | Record<string, boolean>) => void;
}) {
  const perCol = Math.ceil(questions.length / 3);
  const cols = [questions.slice(0, perCol), questions.slice(perCol, perCol * 2), questions.slice(perCol * 2)];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 24px" }}>
      {cols.map((col, ci) => (
        <div key={ci}>
          <div style={{ display: "grid", gridTemplateColumns: "28px 1fr", alignItems: "center", marginBottom: 4, paddingBottom: 4, borderBottom: "1px solid #e2e8f0" }}>
            <span style={{ fontSize: 11, color: "#718096", fontWeight: 600 }}>Q</span>
            <div style={{ display: "flex", gap: 6 }}>
              {OPTIONS.map((o) => <span key={o} style={{ width: 26, textAlign: "center", fontSize: 11, color: "#718096", fontWeight: 700 }}>{o}</span>)}
            </div>
          </div>
          {col.map((q) => {
            const ak = answerKeys.find((a) => a.question_id === q.id);
            const selected = ak?.correct_option || "";
            return (
              <div key={q.id} style={{ display: "grid", gridTemplateColumns: "28px 1fr", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#4a5568" }}>{String(q.question_number).padStart(2, "0")}.</span>
                <div style={{ display: "flex", gap: 6 }}>
                  {OPTIONS.map((o) => (
                    <button
                      key={o}
                      onClick={() => canEdit && onChange(q.id, "correct_option", o)}
                      style={{
                        width: 26, height: 26, borderRadius: "50%", border: `2px solid ${selected === o ? "#233654" : "#cbd5e0"}`,
                        background: selected === o ? "#233654" : "#fff", color: selected === o ? "#fff" : "#4a5568",
                        fontWeight: 700, fontSize: 11, cursor: canEdit ? "pointer" : "default", padding: 0,
                      }}
                      disabled={!canEdit}
                    >{o}</button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function Type2Grid({ questions, answerKeys, canEdit, onChange }: {
  questions: { id: string; question_number: number; question_type: string }[];
  answerKeys: { question_id: string; correct_option: string | null; sub_options: Record<string, boolean> | null }[];
  canEdit: boolean;
  onChange: (qId: string, field: "correct_option" | "sub_options", value: string | Record<string, boolean>) => void;
}) {
  const perCol = Math.ceil(questions.length / 4);
  const cols = [questions.slice(0, perCol), questions.slice(perCol, perCol * 2), questions.slice(perCol * 2, perCol * 3), questions.slice(perCol * 3)];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0 16px" }}>
      {cols.map((col, ci) => (
        <div key={ci}>
          <div style={{ display: "grid", gridTemplateColumns: "28px 1fr", alignItems: "center", marginBottom: 4, paddingBottom: 4, borderBottom: "1px solid #e2e8f0" }}>
            <span style={{ fontSize: 11, color: "#718096", fontWeight: 600 }}>Q</span>
            <div style={{ display: "flex", gap: 4 }}>
              {OPTIONS.map((o) => <span key={o} style={{ width: 32, textAlign: "center", fontSize: 11, color: "#718096", fontWeight: 700 }}>{o}</span>)}
            </div>
          </div>
          {col.map((q) => {
            const ak = answerKeys.find((a) => a.question_id === q.id);
            const subs = ak?.sub_options || {};
            return (
              <div key={q.id} style={{ marginBottom: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "28px 1fr", alignItems: "flex-start" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#4a5568", paddingTop: 2 }}>{String(q.question_number).padStart(2, "0")}.</span>
                  <div>
                    {["T", "F"].map((tf) => (
                      <div key={tf} style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 1 }}>
                        <span style={{ fontSize: 10, color: "#718096", fontWeight: 700, width: 8 }}>{tf}</span>
                        <div style={{ display: "flex", gap: 4 }}>
                          {OPTIONS.map((o) => {
                            const current = subs[o] === true ? "T" : subs[o] === false ? "F" : "";
                            const active = current === tf;
                            return (
                              <button
                                key={o}
                                onClick={() => {
                                  if (!canEdit) return;
                                  const val = active ? null : tf === "T";
                                  const updated = { ...subs, [o]: val };
                                  onChange(q.id, "sub_options", updated as Record<string, boolean>);
                                }}
                                style={{
                                  width: 32, height: 18, borderRadius: 3, border: `1.5px solid ${active ? "#233654" : "#cbd5e0"}`,
                                  background: active ? "#233654" : "#fff", color: active ? "#fff" : "#718096",
                                  fontWeight: 700, fontSize: 9, cursor: canEdit ? "pointer" : "default", padding: 0,
                                }}
                                disabled={!canEdit}
                              >{o}</button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 12, color: "#718096" }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: "#2d3748" }}>{value}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { display: "flex", alignItems: "center", justifyContent: "flex-end", marginBottom: 16 },
  h2: { fontSize: 16, fontWeight: 700, color: "#2d3748", marginBottom: 8 },
  editRow: { display: "flex", alignItems: "center", gap: 8, flex: 1 },
  titleInput: { flex: 1, padding: "6px 10px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 16 },
  select: { padding: "6px 10px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 14 },
  saveBtn: { padding: "6px 16px", background: "#ba3c3c", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 },
  cancelBtn: { padding: "6px 16px", background: "#e8e0d0", color: "#2d3748", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 },
  editBtn: { padding: "6px 16px", background: "#edf2f7", color: "#2d3748", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 },
  meta: { display: "flex", gap: 32, background: "#fff", borderRadius: 8, padding: "16px 24px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  answerKeyWarning: { background: "#fffbeb", border: "1px solid #f6d860", color: "#744210", borderRadius: 6, padding: "10px 16px", fontSize: 13, marginBottom: 16 },
  section: { background: "#fff", borderRadius: 8, padding: 24, marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  hint: { fontSize: 13, color: "#718096", marginBottom: 12 },
  link: { color: "#ba3c3c" },
  saveAkBtn: { marginTop: 16, padding: "8px 20px", background: "#ba3c3c", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 },
};
