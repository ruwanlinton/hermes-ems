import { useAuthContext } from "@asgardeo/auth-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export function LoginPage() {
  const { state, signIn } = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (state.isAuthenticated) navigate("/");
  }, [state.isAuthenticated, navigate]);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Sri Lanka Medical Council</h1>
        <h2 style={styles.subtitle}>OMR Exam Management System</h2>
        <p style={styles.description}>
          Manage MCQ licensing exams, generate answer sheets, and process OMR results.
        </p>
        <button onClick={() => signIn()} style={styles.signInBtn}>
          Sign in with Asgardeo
        </button>
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
    background: "#edf2f7",
  },
  card: {
    background: "#fff",
    borderRadius: 8,
    boxShadow: "0 4px 24px rgba(0,0,0,0.1)",
    padding: "48px 40px",
    maxWidth: 440,
    width: "100%",
    textAlign: "center",
  },
  title: { fontSize: 22, fontWeight: 700, color: "#1a365d", marginBottom: 8 },
  subtitle: { fontSize: 16, fontWeight: 600, color: "#2d3748", marginBottom: 16 },
  description: { fontSize: 14, color: "#718096", marginBottom: 32 },
  signInBtn: {
    padding: "12px 32px",
    background: "#2b6cb0",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    width: "100%",
  },
};
