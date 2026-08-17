import "@/styles/globals.css";
import React from "react";
import Link from "next/link";
import { LayoutDashboard, UserPlus, History, Leaf, ShieldCheck, Zap, Server } from "lucide-react";

export const metadata = {
  title: "GreenCloud AI — Enterprise FinOps & GreenOps Platform",
  description: "Connect cloud billing, inventory, telemetry, and carbon-intensity data into evidence-backed recommendations.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div style={{ display: "flex", minHeight: "100vh" }}>
          {/* Sidebar Navigation */}
          <aside
            className="glass-panel"
            style={{
              width: "260px",
              margin: "12px",
              padding: "24px 16px",
              display: "flex",
              flexDirection: "column",
              gap: "32px",
              borderRadius: "16px",
              zIndex: 10,
            }}
          >
            {/* Logo Brand */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "0 8px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #10b981 0%, #06b6d4 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 0 20px rgba(16, 185, 129, 0.4)",
                }}
              >
                <Leaf style={{ width: "20px", height: "20px", color: "#0a0d14" }} />
              </div>
              <div>
                <h1 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>
                  GreenCloud <span style={{ color: "#10b981" }}>AI</span>
                </h1>
                <p style={{ fontSize: "0.72rem", color: "#9ca3af", fontWeight: 500 }}>FinOps + GreenOps</p>
              </div>
            </div>

            {/* Navigation Menu */}
            <nav style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <p style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280", paddingLeft: "12px", marginBottom: "4px" }}>
                Core Platform
              </p>
              <Link
                href="/"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  color: "#f3f4f6",
                  textDecoration: "none",
                  fontSize: "0.9rem",
                  fontWeight: 500,
                  background: "rgba(16, 185, 129, 0.12)",
                  border: "1px solid rgba(16, 185, 129, 0.25)",
                }}
              >
                <LayoutDashboard style={{ width: "18px", height: "18px", color: "#10b981" }} />
                Dashboard
              </Link>

              <Link
                href="/onboarding"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  color: "#9ca3af",
                  textDecoration: "none",
                  fontSize: "0.9rem",
                  fontWeight: 500,
                  transition: "all 0.2s ease",
                }}
              >
                <UserPlus style={{ width: "18px", height: "18px" }} />
                Connect AWS
              </Link>

              <Link
                href="/audit-history"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  color: "#9ca3af",
                  textDecoration: "none",
                  fontSize: "0.9rem",
                  fontWeight: 500,
                  transition: "all 0.2s ease",
                }}
              >
                <History style={{ width: "18px", height: "18px" }} />
                Audit Logs
              </Link>
            </nav>

            {/* Footer / Tenant Card */}
            <div style={{ marginTop: "auto", padding: "12px", borderRadius: "10px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <ShieldCheck style={{ width: "16px", height: "16px", color: "#10b981" }} />
                <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#e5e7eb" }}>Acme Enterprise</span>
              </div>
              <p style={{ fontSize: "0.7rem", color: "#6b7280" }}>AWS Production • Read-Only IAM</p>
            </div>
          </aside>

          {/* Main Content Area */}
          <main style={{ flex: 1, padding: "20px 24px", overflowY: "auto" }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
