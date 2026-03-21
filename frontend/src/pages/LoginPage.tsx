import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function LoginPage() {
  const { token, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) navigate("/");
  }, [token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      navigate("/");
    } catch {
      setError("Invalid username or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <img
          src="https://slmc.gov.lk/images/SLMClogonew2025.png"
          alt="SLMC Logo"
          style={styles.logo}
        />
        <h1 style={styles.title}>Sri Lanka Medical Council</h1>
        <div style={styles.divider} />
        <h2 style={styles.subtitle}>OMR Exam Management System</h2>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={styles.input}
            autoComplete="username"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            autoComplete="current-password"
            required
          />
          {error && <p style={styles.errorText}>{error}</p>}
          <button type="submit" disabled={loading} style={styles.signInBtn}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    background: "#233654",
    fontFamily: "Roboto, sans-serif",
  },
  card: {
    background: "#fff",
    borderRadius: 8,
    boxShadow: "0 8px 40px rgba(0,0,0,0.25)",
    padding: "48px 44px",
    maxWidth: 440,
    width: "100%",
    textAlign: "center",
    borderTop: "4px solid #b79a62",
  },
  logo: { height: 72, width: "auto", objectFit: "contain", marginBottom: 16 },
  title: { fontSize: 20, fontWeight: 700, color: "#233654", marginBottom: 0 },
  divider: { width: 48, height: 3, background: "#b79a62", margin: "12px auto" },
  subtitle: { fontSize: 15, fontWeight: 500, color: "#4a5568", marginBottom: 24 },
  form: { display: "flex", flexDirection: "column", gap: 12 },
  input: {
    padding: "11px 14px",
    border: "1px solid #e2e8f0",
    borderRadius: 4,
    fontSize: 14,
    color: "#2d3748",
    outline: "none",
  },
  errorText: { fontSize: 13, color: "#c53030", margin: 0 },
  signInBtn: {
    padding: "12px 32px",
    background: "#ba3c3c",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    width: "100%",
    letterSpacing: 0.3,
    marginTop: 4,
  },
};
