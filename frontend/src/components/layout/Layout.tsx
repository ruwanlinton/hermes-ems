import type { ReactNode } from "react";
import { Navbar } from "./Navbar";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div style={{ minHeight: "100vh", background: "#f7fafc" }}>
      <Navbar />
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
        {children}
      </main>
    </div>
  );
}
