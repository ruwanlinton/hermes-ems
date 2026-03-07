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
        <Link to="/" style={styles.brandLink}>
          <img
            src="https://slmc.gov.lk/images/SLMClogonew2025.png"
            alt="SLMC Logo"
            style={styles.logo}
          />
          <div style={styles.brandText}>
            <span style={styles.brandTitle}>Sri Lanka Medical Council</span>
            <span style={styles.brandSub}>OMR Exam System</span>
          </div>
        </Link>
      </div>
      <div style={styles.links}>
        <Link to="/" style={styles.link}>Dashboard</Link>
        <Link to="/exams" style={styles.link}>Exams</Link>
        <Link to="/settings" style={styles.link}>Settings</Link>
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
    padding: "0 32px",
    height: 68,
    background: "#233654",
    color: "#fff",
    position: "sticky",
    top: 0,
    zIndex: 100,
    boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
    borderBottom: "3px solid #b79a62",
    fontFamily: "Roboto, sans-serif",
  },
  brand: { display: "flex", alignItems: "center" },
  brandLink: { display: "flex", alignItems: "center", gap: 12, textDecoration: "none" },
  logo: { height: 48, width: "auto", objectFit: "contain" },
  brandText: { display: "flex", flexDirection: "column", gap: 1 },
  brandTitle: { color: "#fff", fontWeight: 700, fontSize: 15, letterSpacing: 0.3 },
  brandSub: { color: "#b79a62", fontWeight: 400, fontSize: 11, letterSpacing: 0.5 },
  links: { display: "flex", gap: 8 },
  link: {
    color: "#cbd5e0",
    textDecoration: "none",
    fontSize: 14,
    padding: "6px 14px",
    borderRadius: 4,
    transition: "color 0.2s",
    fontWeight: 500,
  },
  user: { display: "flex", alignItems: "center", gap: 12 },
  username: { fontSize: 13, color: "#b79a62", fontWeight: 500 },
  signOutBtn: {
    padding: "6px 14px",
    background: "transparent",
    border: "1px solid #b79a62",
    color: "#b79a62",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
  },
};
