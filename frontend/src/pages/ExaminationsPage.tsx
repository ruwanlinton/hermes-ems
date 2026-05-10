import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../components/layout/Layout";
import { examinationsApi, type Examination } from "../api/examinations";
import { useAuth, hasRole } from "../auth/AuthContext";

export function ExaminationsPage() {
  const { user } = useAuth();
  const canCreate = hasRole(user, "admin", "creator");

  const [items, setItems] = useState<Examination[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    examinationsApi.list().then((r) => {
      setItems(r.data);
      setLoading(false);
    });
  }, []);

  return (
    <Layout>
      <div style={styles.header}>
        <div>
          <h1 style={styles.h1}>Examinations</h1>
          <p style={styles.sub}>Manage examination sittings and their subjects</p>
        </div>
        {canCreate && (
          <Link to="/examinations/new" style={styles.createBtn}>+ New Examination</Link>
        )}
      </div>

      {loading ? (
        <p style={{ color: "#718096" }}>Loading…</p>
      ) : items.length === 0 ? (
        <div style={styles.empty}>
          <p>No examinations yet.</p>
          {canCreate && <Link to="/examinations/new" style={styles.emptyLink}>Create the first examination</Link>}
        </div>
      ) : (
        <div style={styles.grid}>
          {items.map((e) => (
            <Link key={e.id} to={`/examinations/${e.id}`} style={styles.card}>
              <div style={styles.cardTop}>
                <span style={{ ...styles.badge, ...badgeStyle(e.status) }}>{e.status}</span>
              </div>
              <div style={styles.cardTitle}>{e.title}</div>
              {e.description && <div style={styles.cardDesc}>{e.description}</div>}
              <div style={styles.cardMeta}>
                {e.exam_date
                  ? new Date(e.exam_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
                  : "No date set"}
              </div>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}

function badgeStyle(status: string): React.CSSProperties {
  const map: Record<string, [string, string]> = {
    draft: ["#4a5568", "#e2e8f0"],
    active: ["#276749", "#c6f6d5"],
    closed: ["#fff", "#233654"],
  };
  const [color, bg] = map[status] ?? ["#2d3748", "#e2e8f0"];
  return { color, background: bg };
}

const styles: Record<string, React.CSSProperties> = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 },
  h1: { fontSize: 24, fontWeight: 700, color: "#233654", margin: 0 },
  sub: { fontSize: 13, color: "#718096", margin: "4px 0 0" },
  createBtn: {
    padding: "10px 20px",
    background: "#ba3c3c",
    color: "#fff",
    textDecoration: "none",
    borderRadius: 6,
    fontWeight: 600,
    fontSize: 14,
  },
  empty: { textAlign: "center" as const, padding: "48px 0", color: "#718096" },
  emptyLink: { color: "#ba3c3c", display: "block", marginTop: 8 },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 16,
  },
  card: {
    background: "#fff",
    borderRadius: 10,
    padding: "20px 24px",
    textDecoration: "none",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
    border: "1px solid #e8e0d0",
    display: "flex",
    flexDirection: "column" as const,
    gap: 6,
    transition: "box-shadow 0.15s",
  },
  cardTop: { display: "flex", justifyContent: "flex-end" },
  badge: {
    display: "inline-block",
    padding: "2px 10px",
    borderRadius: 99,
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  cardTitle: { fontSize: 16, fontWeight: 700, color: "#233654", marginTop: 4 },
  cardDesc: { fontSize: 13, color: "#718096", lineHeight: 1.4 },
  cardMeta: { fontSize: 12, color: "#a0aec0", marginTop: 4 },
};
