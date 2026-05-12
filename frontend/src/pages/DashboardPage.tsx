import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../components/layout/Layout";
import { apiClient } from "../api/client";
import { useAuth, hasRole } from "../auth/AuthContext";

interface DashboardStats {
  examinations: { total: number; draft: number; active: number; closed: number };
  subjects: { total: number };
  papers: { total: number; draft: number; active: number; closed: number };
  questions: { total: number };
  candidates: { total: number };
  batches: { total: number };
  enrolled: { total: number };
  results: { total: number };
  submissions: { total: number };
  recent_examinations: {
    id: string;
    title: string;
    status: string;
    exam_date: string | null;
    created_at: string;
  }[];
}

export function DashboardPage() {
  const { user } = useAuth();
  const canCreate = hasRole(user, "admin", "creator");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get<DashboardStats>("/dashboard/stats")
      .then((r) => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <div style={styles.pageHeader}>
        <h1 style={styles.h1}>Dashboard</h1>
        {canCreate && (
          <div style={styles.quickActions}>
            <Link to="/examinations/new" style={styles.actionBtn}>+ New Examination</Link>
            <Link to="/candidates/new" style={{ ...styles.actionBtn, background: "#f5f0e8", color: "#233654", border: "1px solid #d4c5a9" }}>+ Add Candidate</Link>
          </div>
        )}
      </div>

      {loading ? (
        <p style={styles.muted}>Loading…</p>
      ) : !stats ? (
        <p style={styles.muted}>Could not load statistics.</p>
      ) : (
        <>
          {/* Primary KPI row */}
          <div style={styles.kpiGrid}>
            <KpiCard
              label="Examinations"
              value={stats.examinations.total}
              accent="#233654"
              sub={[
                { label: "Active", value: stats.examinations.active, color: "#276749" },
                { label: "Draft", value: stats.examinations.draft, color: "#b79a62" },
                { label: "Closed", value: stats.examinations.closed, color: "#718096" },
              ]}
              href="/examinations"
            />
            <KpiCard
              label="Candidates"
              value={stats.candidates.total}
              accent="#ba3c3c"
              sub={[
                { label: "Enrolled in batches", value: stats.enrolled.total, color: "#233654" },
              ]}
              href="/candidates"
            />
            <KpiCard
              label="Papers"
              value={stats.papers.total}
              accent="#2b6cb0"
              sub={[
                { label: "Active", value: stats.papers.active, color: "#276749" },
                { label: "Draft", value: stats.papers.draft, color: "#b79a62" },
                { label: "Closed", value: stats.papers.closed, color: "#718096" },
              ]}
              href="/exams"
            />
            <KpiCard
              label="Submissions"
              value={stats.submissions.total}
              accent="#6b46c1"
              sub={[
                { label: "Results graded", value: stats.results.total, color: "#233654" },
              ]}
            />
          </div>

          {/* Secondary metrics row */}
          <div style={styles.metricRow}>
            <MetricTile icon="📋" label="Subjects" value={stats.subjects.total} href="/examinations" />
            <MetricTile icon="❓" label="Questions" value={stats.questions.total} />
            <MetricTile icon="🗂️" label="Batches" value={stats.batches.total} />
            <MetricTile icon="👥" label="Enrolled Members" value={stats.enrolled.total} />
          </div>

          {/* Examination status breakdown */}
          <div style={styles.rowTwoCols}>
            {/* Recent examinations */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h2 style={styles.h2}>Recent Examinations</h2>
                <Link to="/examinations" style={styles.seeAll}>See all →</Link>
              </div>
              {stats.recent_examinations.length === 0 ? (
                <p style={styles.muted}>No examinations yet.</p>
              ) : (
                <div style={styles.examList}>
                  {stats.recent_examinations.map((e) => (
                    <Link key={e.id} to={`/examinations/${e.id}`} style={styles.examRow}>
                      <div style={styles.examRowLeft}>
                        <span style={styles.examTitle}>{e.title}</span>
                        {e.exam_date && (
                          <span style={styles.examDate}>
                            {new Date(e.exam_date).toLocaleDateString("en-GB", {
                              day: "numeric", month: "short", year: "numeric",
                            })}
                          </span>
                        )}
                      </div>
                      <span style={{ ...styles.statusBadge, ...statusStyle(e.status) }}>
                        {e.status}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Entity summary */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h2 style={styles.h2}>System Overview</h2>
              </div>
              <div style={styles.overviewList}>
                <OverviewRow
                  label="Examinations"
                  total={stats.examinations.total}
                  breakdown={[
                    { label: "draft", count: stats.examinations.draft, color: "#b79a62" },
                    { label: "active", count: stats.examinations.active, color: "#276749" },
                    { label: "closed", count: stats.examinations.closed, color: "#718096" },
                  ]}
                />
                <OverviewRow
                  label="Subjects"
                  total={stats.subjects.total}
                />
                <OverviewRow
                  label="Papers"
                  total={stats.papers.total}
                  breakdown={[
                    { label: "draft", count: stats.papers.draft, color: "#b79a62" },
                    { label: "active", count: stats.papers.active, color: "#276749" },
                    { label: "closed", count: stats.papers.closed, color: "#718096" },
                  ]}
                />
                <OverviewRow label="Questions" total={stats.questions.total} />
                <OverviewRow label="Candidates" total={stats.candidates.total} />
                <OverviewRow label="Batches" total={stats.batches.total} />
                <OverviewRow label="Enrolled Members" total={stats.enrolled.total} />
                <OverviewRow label="Submissions processed" total={stats.submissions.total} />
                <OverviewRow label="Results graded" total={stats.results.total} />
              </div>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface SubStat { label: string; value: number; color: string }

function KpiCard({
  label, value, accent, sub = [], href,
}: {
  label: string; value: number; accent: string;
  sub?: SubStat[]; href?: string;
}) {
  const inner = (
    <div style={{ ...styles.kpiCard, borderTopColor: accent }}>
      <div style={{ ...styles.kpiValue, color: accent }}>{value.toLocaleString()}</div>
      <div style={styles.kpiLabel}>{label}</div>
      {sub.length > 0 && (
        <div style={styles.kpiSub}>
          {sub.map((s) => (
            <span key={s.label} style={{ color: s.color, fontSize: 11, fontWeight: 600 }}>
              {s.label}: {s.value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
  return href
    ? <Link to={href} style={{ textDecoration: "none" }}>{inner}</Link>
    : inner;
}

function MetricTile({ icon, label, value, href }: { icon: string; label: string; value: number; href?: string }) {
  const inner = (
    <div style={styles.metricTile}>
      <span style={styles.metricIcon}>{icon}</span>
      <span style={styles.metricValue}>{value.toLocaleString()}</span>
      <span style={styles.metricLabel}>{label}</span>
    </div>
  );
  return href
    ? <Link to={href} style={{ textDecoration: "none", flex: 1 }}>{inner}</Link>
    : <div style={{ flex: 1 }}>{inner}</div>;
}

interface BreakdownItem { label: string; count: number; color: string }

function OverviewRow({ label, total, breakdown }: { label: string; total: number; breakdown?: BreakdownItem[] }) {
  return (
    <div style={styles.overviewRow}>
      <span style={styles.overviewLabel}>{label}</span>
      <span style={styles.overviewTotal}>{total.toLocaleString()}</span>
      {breakdown && breakdown.length > 0 && (
        <div style={styles.overviewBreakdown}>
          {breakdown.map((b) => (
            <span key={b.label} style={{ color: b.color, fontSize: 10, fontWeight: 700 }}>
              {b.label} {b.count}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function statusStyle(status: string): React.CSSProperties {
  const map: Record<string, [string, string]> = {
    draft:  ["#7b5e16", "#fef3c7"],
    active: ["#276749", "#c6f6d5"],
    closed: ["#4a5568", "#e2e8f0"],
  };
  const [color, bg] = map[status] ?? ["#4a5568", "#e2e8f0"];
  return { color, background: bg };
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  h1: { fontSize: 24, fontWeight: 700, color: "#233654", margin: 0 },
  h2: { fontSize: 15, fontWeight: 700, color: "#233654", margin: 0 },
  quickActions: { display: "flex", gap: 10 },
  actionBtn: {
    padding: "8px 18px", background: "#ba3c3c", color: "#fff",
    textDecoration: "none", borderRadius: 6, fontSize: 13, fontWeight: 600,
  },
  muted: { color: "#718096", fontSize: 14 },

  // KPI row
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 14 },
  kpiCard: {
    background: "#fff", borderRadius: 8, padding: "20px 22px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)", borderTop: "4px solid #233654",
  },
  kpiValue: { fontSize: 34, fontWeight: 800, lineHeight: 1 },
  kpiLabel: { fontSize: 12, color: "#718096", fontWeight: 600, marginTop: 6, textTransform: "uppercase" as const, letterSpacing: "0.04em" },
  kpiSub: { display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" as const },

  // Metric tiles
  metricRow: { display: "flex", gap: 14, marginBottom: 24 },
  metricTile: {
    flex: 1, background: "#fff", borderRadius: 8,
    padding: "14px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
    display: "flex", alignItems: "center", gap: 12,
    border: "1px solid #e8e0d0",
  },
  metricIcon: { fontSize: 22 },
  metricValue: { fontSize: 22, fontWeight: 700, color: "#233654" },
  metricLabel: { fontSize: 12, color: "#718096", fontWeight: 500 },

  // Two-column row
  rowTwoCols: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  card: { background: "#fff", borderRadius: 8, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  seeAll: { fontSize: 12, color: "#ba3c3c", textDecoration: "none", fontWeight: 600 },

  // Exam list
  examList: { display: "flex", flexDirection: "column" as const, gap: 2 },
  examRow: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "10px 12px", borderRadius: 6, textDecoration: "none", color: "inherit",
    borderBottom: "1px solid #f5f0e8",
  },
  examRowLeft: { display: "flex", flexDirection: "column" as const, gap: 2 },
  examTitle: { fontSize: 14, fontWeight: 600, color: "#233654" },
  examDate: { fontSize: 11, color: "#a0aec0" },
  statusBadge: { fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 99, textTransform: "uppercase" as const },

  // Overview list
  overviewList: { display: "flex", flexDirection: "column" as const },
  overviewRow: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "9px 0", borderBottom: "1px solid #f5f0e8",
  },
  overviewLabel: { flex: 1, fontSize: 13, color: "#4a5568", fontWeight: 500 },
  overviewTotal: { fontSize: 15, fontWeight: 700, color: "#233654", minWidth: 32, textAlign: "right" as const },
  overviewBreakdown: { display: "flex", gap: 8, minWidth: 160 },
};
