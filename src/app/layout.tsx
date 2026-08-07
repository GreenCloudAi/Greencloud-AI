import type { Metadata } from "next";
import "@/styles/globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "GreenCloud AI — FinOps & GreenOps Control Plane",
  description: "Evidence-backed cloud cost and carbon optimization workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="app-container">
          <aside className="sidebar">
            <div className="brand-section">
              <div className="brand-logo">G</div>
              <span className="brand-name">GreenCloud AI</span>
            </div>
            
            <nav className="nav-links">
              <Link href="/" className="nav-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
                <span>Dashboard</span>
              </Link>
              <Link href="/onboarding" className="nav-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <span>Connect Account</span>
              </Link>
              <Link href="/audit-history" className="nav-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>
                <span>Audit History</span>
              </Link>
            </nav>

            <div className="sidebar-footer">
              <p>v0.1.0 (MVP)</p>
              <p style={{ marginTop: "0.25rem", display: "flex", alignItems: "center" }}>
                <span className="pulse-dot green"></span> Connected
              </p>
            </div>
          </aside>

          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
