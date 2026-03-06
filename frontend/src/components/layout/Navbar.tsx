import { useAuthContext } from "@asgardeo/auth-react";
import { Link, useNavigate } from "react-router-dom";

export function Navbar() {
  const { state, signOut } = useAuthContext();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <nav style={styles.nav}>
      <div style={styles.brand}>
        <Link to="/" style={styles.brandLink}>SLMC OMR</Link>
      </div>
      <div style={styles.links}>
        <Link to="/" style={styles.link}>Dashboard</Link>
        <Link to="/exams" style={styles.link}>Exams</Link>
      </div>
      <div style={styles.user}>
        {state.username && <span style={styles.username}>{state.username}</span>}
        <button onClick={handleSignOut} style={styles.signOutBtn}>Sign Out</button>
      </div>
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 24px",
    height: 56,
    background: "#1a365d",
    color: "#fff",
    position: "sticky",
    top: 0,
    zIndex: 100,
    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
  },
  brand: { fontWeight: 700, fontSize: 18 },
  brandLink: { color: "#fff", textDecoration: "none" },
  links: { display: "flex", gap: 24 },
  link: { color: "#cbd5e0", textDecoration: "none", fontSize: 14 },
  user: { display: "flex", alignItems: "center", gap: 12 },
  username: { fontSize: 13, color: "#cbd5e0" },
  signOutBtn: {
    padding: "6px 14px",
    background: "transparent",
    border: "1px solid #4a5568",
    color: "#e2e8f0",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 13,
  },
};
