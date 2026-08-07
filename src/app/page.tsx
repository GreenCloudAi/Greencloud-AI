"use client";

import { useEffect, useState } from "react";

interface Recommendation {
  id: string;
  title: string;
  category: string;
  status: string;
  estimatedMonthlySavings: number;
  estimatedGco2eSavings: number;
  riskScore: number;
  confidence: number;
  evidence: string;
  resource: {
    providerResourceId: string;
    resourceType: string;
    region: string;
  };
}

interface Summary {
  totalMonthlySavings: number;
  totalMonthlyCarbonSavings: number;
  totalCost: number;
  totalOperationalCarbon: number;
  totalEmbodiedCarbon: number;
  sciScore: number;
  functionalUnits: number;
  byServiceCosts: { service: string; total: number }[];
}

interface CloudAccount {
  id: string;
  provider: string;
  name: string;
  status: string;
  externalAccountId: string;
  syncFreshness: string | null;
  syncError: string | null;
}

export default function Dashboard() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [accounts, setAccounts] = useState<CloudAccount[]>([]);
  
  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedRecId, setSelectedRecId] = useState<string | null>(null);
  const [approvalMode, setApprovalMode] = useState<"ticket" | "pull_request">("ticket");
  const [approvalStatus, setApprovalStatus] = useState<{ id: string; path: string; mode: string } | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch accounts
      const accountsRes = await fetch("/api/cloud-accounts");
      const accountsData = await accountsRes.json();
      if (accountsData.error) throw new Error(accountsData.error.message);
      setAccounts(accountsData);

      // Fetch recommendations & summaries
      const recsRes = await fetch("/api/recommendations");
      const recsData = await recsRes.json();
      if (recsData.error) throw new Error(recsData.error.message);

      setRecommendations(recsData.recommendations);
      setSummary(recsData.summary);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const triggerSync = async (accountId: string) => {
    try {
      setSyncingAccountId(accountId);
      const res = await fetch(`/api/cloud-accounts/${accountId}/sync`, { method: "POST" });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      
      // Refresh dashboard
      await fetchData();
    } catch (err: any) {
      alert(`Sync failed: ${err.message}`);
    } finally {
      setSyncingAccountId(null);
    }
  };

  const executeApproval = async (recommendationId: string) => {
    try {
      const res = await fetch(`/api/recommendations/${recommendationId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: approvalMode, comment: `Approved via GreenCloud Dashboard` })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);

      setApprovalStatus({
        id: recommendationId,
        path: data.outputPath,
        mode: data.mode
      });

      // Refresh data
      await fetchData();
    } catch (err: any) {
      alert(`Remediation failed: ${err.message}`);
    }
  };

  const getRiskBadge = (score: number) => {
    if (score < 0.15) return <span className="badge badge-success">Minimal Risk ({score})</span>;
    if (score < 0.4) return <span className="badge badge-warning">Low Risk ({score})</span>;
    return <span className="badge badge-error">Medium Risk ({score})</span>;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <span className="badge badge-info">Active</span>;
      case "approved": return <span className="badge badge-success">Approved</span>;
      case "executed": return <span className="badge badge-success" style={{ filter: "brightness(0.9)" }}>Remediated</span>;
      default: return <span className="badge badge-secondary">{status}</span>;
    }
  };

  return (
    <div>
      <header className="page-header">
        <div className="page-title">
          <h1>FinOps & GreenOps Dashboard</h1>
          <p>Reconciled cloud financial costs and Software Carbon Intensity (SCI) metrics.</p>
        </div>
        <div>
          <button className="btn btn-secondary" onClick={fetchData} disabled={loading}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: "0.25rem" }}><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
            Refresh View
          </button>
        </div>
      </header>

      {error && (
        <div className="card" style={{ borderColor: "var(--accent-red)", marginBottom: "2rem" }}>
          <p style={{ color: "hsl(0, 85%, 60%)", fontWeight: 600 }}>Error: {error}</p>
        </div>
      )}

      {loading && !summary ? (
        <div style={{ textAlign: "center", padding: "4rem" }}>
          <p style={{ color: "var(--text-secondary)", fontSize: "1.2rem" }}>Analyzing cloud accounts and carbon grids...</p>
        </div>
      ) : (
        <>
          {/* Summary Panel */}
          <section className="grid-container">
            {/* Total spend */}
            <div className="card glow-green" style={{ borderLeft: "4px solid var(--accent-green)" }}>
              <span className="form-label">Monthly Cloud Cost</span>
              <h2 style={{ fontSize: "2.5rem", fontWeight: 800, marginTop: "0.5rem" }}>
                ${summary?.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.5rem" }}>
                <span className="pulse-dot green"></span> Reconciled to AWS Explorer / CUR
              </p>
            </div>

            {/* Total emissions */}
            <div className="card glow-purple" style={{ borderLeft: "4px solid var(--accent-purple)" }}>
              <span className="form-label">Operational Carbon</span>
              <h2 style={{ fontSize: "2.5rem", fontWeight: 800, marginTop: "0.5rem", color: "var(--text-primary)" }}>
                {((summary?.totalOperationalCarbon || 0) / 1000).toFixed(2)} <span style={{ fontSize: "1.2rem", fontWeight: 500 }}>kg CO2e</span>
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.5rem" }}>
                Embodied hardware load: {((summary?.totalEmbodiedCarbon || 0) / 1000).toFixed(2)} kg
              </p>
            </div>

            {/* Software Carbon Intensity Score */}
            <div className="card glow-purple" style={{ borderLeft: "4px solid var(--accent-purple)" }}>
              <span className="form-label">GSF SCI Score</span>
              <h2 style={{ fontSize: "2.5rem", fontWeight: 800, marginTop: "0.5rem", color: "var(--accent-purple)" }}>
                {summary?.sciScore.toFixed(4)}
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.5rem" }}>
                gCO2e per client API request ({summary?.functionalUnits.toLocaleString()} units)
              </p>
              <div className="progress-bar-container">
                <div 
                  className="progress-bar-fill" 
                  style={{ width: `${Math.min(100, (summary?.sciScore || 0) * 120000)}%`, backgroundColor: "var(--accent-purple)" }}
                ></div>
              </div>
            </div>

            {/* Potential Savings */}
            <div className="card" style={{ borderLeft: "4px solid var(--accent-orange)" }}>
              <span className="form-label">Remediation Pipeline</span>
              <h2 style={{ fontSize: "2.5rem", fontWeight: 800, marginTop: "0.5rem", color: "var(--accent-orange)" }}>
                +${summary?.totalMonthlySavings.toFixed(2)}
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.5rem" }}>
                Reduces Carbon by {((summary?.totalMonthlyCarbonSavings || 0) / 1000).toFixed(1)} kg CO2e/mo
              </p>
            </div>
          </section>

          {/* Sync & Cloud Accounts Status */}
          <section className="card" style={{ marginBottom: "2.5rem" }}>
            <h3 style={{ marginBottom: "1.25rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.75rem" }}>
              Connected Cloud Accounts
            </h3>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Account Name</th>
                    <th>Provider</th>
                    <th>AWS Account ID</th>
                    <th>Sync Status</th>
                    <th>Data Freshness</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map(acc => (
                    <tr key={acc.id}>
                      <td style={{ fontWeight: 600 }}>{acc.name}</td>
                      <td>
                        <span className="badge badge-info">{acc.provider.toUpperCase()}</span>
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}>
                        {acc.externalAccountId}
                      </td>
                      <td>
                        {acc.status === "active" && (
                          <span style={{ display: "flex", alignItems: "center" }}>
                            <span className="pulse-dot green"></span> Active
                          </span>
                        )}
                        {acc.status === "syncing" && (
                          <span style={{ display: "flex", alignItems: "center", color: "var(--accent-orange)" }}>
                            <span className="pulse-dot orange"></span> Ingesting...
                          </span>
                        )}
                        {acc.status === "sync_failed" && (
                          <span style={{ display: "flex", alignItems: "center", color: "var(--accent-red)" }}>
                            <span className="pulse-dot red"></span> Failed
                          </span>
                        )}
                        {acc.status === "pending_validation" && (
                          <span style={{ display: "flex", alignItems: "center", color: "var(--text-muted)" }}>
                            <span className="pulse-dot orange" style={{ animation: "none" }}></span> Not Synced
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                        {acc.syncFreshness ? new Date(acc.syncFreshness).toLocaleString() : "Never Synced"}
                      </td>
                      <td>
                        <button 
                          className="btn btn-action" 
                          onClick={() => triggerSync(acc.id)}
                          disabled={syncingAccountId !== null || acc.status === "syncing"}
                        >
                          {syncingAccountId === acc.id ? "Syncing..." : "Sync Billing & Assets"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Recommendations Sweep */}
          <section>
            <h3 style={{ fontSize: "1.5rem", marginBottom: "1.25rem" }}>
              Active Recommendations ({recommendations.filter(r => r.status === "active").length})
            </h3>
            
            {recommendations.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
                <p style={{ color: "var(--text-secondary)" }}>No active recommendations found. Trigger a sync above to scan cloud inventory.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                {recommendations.map(rec => {
                  const ev = JSON.parse(rec.evidence) as { calculation: string; reason: string; carbonImpact: string };
                  const isExpanded = selectedRecId === rec.id;

                  return (
                    <div 
                      key={rec.id} 
                      className={`card ${rec.status === "executed" ? "" : "glow-green"}`} 
                      style={{ 
                        opacity: rec.status === "executed" ? 0.6 : 1,
                        borderLeft: rec.status === "executed" ? "4px solid var(--text-muted)" : "4px solid var(--accent-green)"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                        <div>
                          <span className="form-label" style={{ fontSize: "0.75rem", display: "inline-flex", gap: "0.5rem", alignItems: "center" }}>
                            {rec.resource.region} | {rec.resource.resourceType.toUpperCase()} | {getStatusBadge(rec.status)}
                          </span>
                          <h4 style={{ fontSize: "1.2rem", fontWeight: 700, margin: "0.25rem 0" }}>{rec.title}</h4>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--accent-green)" }}>
                            ${rec.estimatedMonthlySavings.toFixed(2)}/mo
                          </span>
                          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                            Savings: {(rec.estimatedGco2eSavings / 1000).toFixed(1)} kg CO2e/mo
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "1rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
                        {getRiskBadge(rec.riskScore)}
                        <span className="badge badge-info" style={{ backgroundColor: "rgba(255,255,255,0.05)", color: "var(--text-secondary)" }}>
                          Confidence: {(rec.confidence * 100).toFixed(0)}%
                        </span>
                      </div>

                      {/* Expandable Evidence details */}
                      <div style={{ marginTop: "1rem", borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}
                          onClick={() => setSelectedRecId(isExpanded ? null : rec.id)}
                        >
                          {isExpanded ? "Hide Evidence Details" : "View Evidence & Calculation Details"}
                        </button>

                        {isExpanded && (
                          <div style={{ marginTop: "1rem", backgroundColor: "var(--bg-surface)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                            <p style={{ marginBottom: "0.75rem" }}>
                              <strong style={{ color: "var(--accent-green)" }}>Reason:</strong> {ev.reason}
                            </p>
                            <p style={{ marginBottom: "0.75rem" }}>
                              <strong style={{ color: "var(--accent-purple)" }}>Carbon Impact:</strong> {ev.carbonImpact}
                            </p>
                            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                              <strong style={{ color: "var(--text-primary)", fontFamily: "var(--font-sans)" }}>Trace Calculation:</strong> {ev.calculation}
                            </p>
                          </div>
                        )}
                      </div>

                      {rec.status === "active" && (
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "1.25rem", borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <label className="form-label" style={{ margin: 0, fontSize: "0.8rem" }}>Workflow Mode:</label>
                            <select 
                              className="form-input" 
                              style={{ padding: "0.35rem 0.5rem", width: "auto", fontSize: "0.8rem" }}
                              value={approvalMode}
                              onChange={(e) => setApprovalMode(e.target.value as any)}
                            >
                              <option value="ticket">Create Jira Ticket</option>
                              <option value="pull_request">Generate Terraform PR</option>
                            </select>
                          </div>

                          <button 
                            className="btn btn-primary" 
                            style={{ padding: "0.4rem 1rem", fontSize: "0.85rem", marginLeft: "auto" }}
                            onClick={() => executeApproval(rec.id)}
                          >
                            Approve & Remediate
                          </button>
                        </div>
                      )}

                      {approvalStatus?.id === rec.id && (
                        <div 
                          className="card" 
                          style={{ 
                            marginTop: "1rem", 
                            backgroundColor: "hsl(142, 70%, 45%, 0.05)", 
                            borderColor: "var(--accent-green)",
                            padding: "1rem" 
                          }}
                        >
                          <p style={{ color: "var(--accent-green)", fontWeight: 600, fontSize: "0.9rem" }}>
                            ✓ Opportunity Remediated Successfully!
                          </p>
                          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                            Generated {approvalStatus.mode === "ticket" ? "Jira Ticket markdown" : "Terraform PR diff"} at:
                          </p>
                          <code style={{ 
                            display: "block", 
                            fontFamily: "var(--font-mono)", 
                            fontSize: "0.75rem", 
                            backgroundColor: "var(--bg-surface)",
                            padding: "0.5rem",
                            borderRadius: "4px",
                            marginTop: "0.5rem",
                            border: "1px solid var(--border-color)"
                          }}>
                            {approvalStatus.path}
                          </code>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
