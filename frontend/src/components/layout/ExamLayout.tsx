import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { Navbar } from "./Navbar";
import { examsApi, type Exam, type Question, type AnswerKey } from "../../api/exams";

interface Tab {
  label: string;
  to: string;
  exact?: boolean;
  locked?: boolean;
}

interface ExamLayoutProps {
  children: React.ReactNode;
}

export function ExamLayout({ children }: ExamLayoutProps) {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [exam, setExam] = useState<Exam | null>(null);
  const [answerKeyComplete, setAnswerKeyComplete] = useState(false);
  const [hasQuestions, setHasQuestions] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      examsApi.get(id),
      examsApi.listQuestions(id),
      examsApi.getAnswerKey(id).catch(() => ({ data: [] as AnswerKey[] })),
    ]).then(([examRes, qRes, akRes]) => {
      setExam(examRes.data);
      const questions: Question[] = qRes.data;
      const answerKeys: AnswerKey[] = akRes.data;
      setHasQuestions(questions.length > 0);
      const complete = questions.length > 0 && questions.every((q) => {
        const ak = answerKeys.find((a) => a.question_id === q.id);
        if (!ak) return false;
        if (q.question_type === "type1") return !!ak.correct_option;
        const opts = ak.sub_options;
        return !!opts && ["A", "B", "C", "D", "E"].every(
          (o) => opts[o] === true || opts[o] === false
        );
      });
      setAnswerKeyComplete(complete);
    });
  }, [id]);

  const tabs: Tab[] = [
    { label: "Overview", to: `/exams/${id}`, exact: true },
    { label: "Generate Sheets", to: `/exams/${id}/sheets` },
    { label: "Upload Submissions", to: `/exams/${id}/upload`, locked: hasQuestions && !answerKeyComplete },
    { label: "Submissions", to: `/exams/${id}/submissions`, locked: hasQuestions && !answerKeyComplete },
    { label: "Results", to: `/exams/${id}/results`, locked: hasQuestions && !answerKeyComplete },
  ];

  const isActive = (tab: Tab) => {
    if (tab.exact) return location.pathname === tab.to;
    return location.pathname.startsWith(tab.to);
  };

  const statusColor = (status: string) => {
    const map: Record<string, React.CSSProperties> = {
      draft:  { background: "#fefcbf", color: "#744210" },
      active: { background: "#c6f6d5", color: "#276749" },
      closed: { background: "#e2e8f0", color: "#4a5568" },
    };
    return map[status] || map.draft;
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f2ede4", fontFamily: "Roboto, sans-serif" }}>
      <Navbar />

      {/* Exam header */}
      <div style={styles.examHeader}>
        <div style={styles.examHeaderInner}>
          <Link to="/exams" style={styles.backLink}>← Exams</Link>
          <div style={styles.examTitleRow}>
            <h1 style={styles.examTitle}>{exam?.title ?? "Loading…"}</h1>
            {exam && (
              <span style={{ ...styles.statusBadge, ...statusColor(exam.status) }}>
                {exam.status}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={styles.tabBar}>
        <div style={styles.tabBarInner}>
          {tabs.map((tab) => {
            const active = isActive(tab);
            if (tab.locked) {
              return (
                <span
                  key={tab.label}
                  style={styles.tabLocked}
                  title="Complete the answer key first"
                >
                  {tab.label}
                </span>
              );
            }
            return (
              <Link
                key={tab.label}
                to={tab.to}
                style={{ ...styles.tab, ...(active ? styles.tabActive : {}) }}
              >
                {tab.label}
                {active && <span style={styles.tabUnderline} />}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Page content */}
      <main style={styles.main}>
        {children}
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  examHeader: {
    background: "#fff",
    borderBottom: "1px solid #e2e8f0",
    padding: "0 24px",
  },
  examHeaderInner: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "12px 0 10px",
  },
  backLink: {
    color: "#718096",
    fontSize: 12,
    textDecoration: "none",
    fontWeight: 500,
    display: "block",
    marginBottom: 4,
  },
  examTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  examTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: "#233654",
    margin: 0,
  },
  statusBadge: {
    padding: "2px 10px",
    borderRadius: 99,
    fontSize: 11,
    fontWeight: 700,
  },
  tabBar: {
    background: "#fff",
    borderBottom: "2px solid #e2e8f0",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  tabBarInner: {
    maxWidth: 1100,
    margin: "0 auto",
    display: "flex",
    gap: 0,
    padding: "0 24px",
  },
  tab: {
    position: "relative" as const,
    padding: "12px 18px",
    fontSize: 13,
    fontWeight: 600,
    color: "#4a5568",
    textDecoration: "none",
    display: "flex",
    alignItems: "center",
    borderBottom: "2px solid transparent",
    marginBottom: -2,
    transition: "color 0.15s",
  },
  tabActive: {
    color: "#233654",
    borderBottomColor: "#ba3c3c",
  },
  tabUnderline: {
    display: "none", // handled by borderBottom on tabActive
  },
  tabLocked: {
    padding: "12px 18px",
    fontSize: 13,
    fontWeight: 600,
    color: "#cbd5e0",
    cursor: "not-allowed",
    display: "inline-flex",
    alignItems: "center",
    borderBottom: "2px solid transparent",
    marginBottom: -2,
  },
  main: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "32px 24px",
  },
};
