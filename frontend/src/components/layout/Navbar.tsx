import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, hasRole } from "../../auth/AuthContext";

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = () => {
    setMenuOpen(false);
    logout();
    navigate("/login");
  };

  const displayName = user?.name || user?.username || "";
  const initials = displayName
    ? displayName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "";

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
        <Link to="/examinations" style={styles.link}>Examinations</Link>
        <Link to="/exams" style={styles.link}>Papers</Link>
        <Link to="/candidates" style={styles.link}>Candidates</Link>
        {hasRole(user, "admin") && <Link to="/admin/users" style={styles.link}>Users</Link>}
        <Link to="/settings" style={styles.link}>Settings</Link>
      </div>
      <div style={styles.user} ref={menuRef}>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          style={styles.avatarBtn}
          aria-label="User menu"
        >
          <span style={styles.avatar}>{initials}</span>
          {displayName && <span style={styles.displayName}>{displayName}</span>}
          <span style={styles.chevron}>{menuOpen ? "▲" : "▼"}</span>
        </button>

        {menuOpen && (
          <div style={styles.dropdown}>
            <div style={styles.dropdownHeader}>
              <span style={styles.dropdownName}>{displayName}</span>
            </div>
            <div style={styles.dropdownDivider} />
            <Link
              to="/profile"
              style={styles.dropdownItem}
              onClick={() => setMenuOpen(false)}
            >
              My Profile
            </Link>
            <button onClick={handleSignOut} style={styles.dropdownItemBtn}>
              Sign Out
            </button>
          </div>
        )}
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
  user: { position: "relative" },
  avatarBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: "4px 8px",
    borderRadius: 6,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "#b79a62",
    color: "#233654",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
  },
  displayName: { fontSize: 13, color: "#b79a62", fontWeight: 500 },
  chevron: { fontSize: 9, color: "#b79a62" },
  dropdown: {
    position: "absolute",
    top: "calc(100% + 10px)",
    right: 0,
    background: "#fff",
    borderRadius: 8,
    boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
    minWidth: 180,
    overflow: "hidden",
    zIndex: 200,
  },
  dropdownHeader: { padding: "12px 16px 10px" },
  dropdownName: { fontSize: 13, fontWeight: 600, color: "#2d3748" },
  dropdownDivider: { borderTop: "1px solid #e2e8f0" },
  dropdownItem: {
    display: "block",
    padding: "10px 16px",
    fontSize: 13,
    color: "#2d3748",
    textDecoration: "none",
    fontWeight: 500,
  },
  dropdownItemBtn: {
    display: "block",
    width: "100%",
    padding: "10px 16px",
    fontSize: 13,
    color: "#c53030",
    fontWeight: 500,
    background: "transparent",
    border: "none",
    textAlign: "left",
    cursor: "pointer",
  },
};
