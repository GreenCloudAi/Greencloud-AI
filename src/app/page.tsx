"use client";

import React, { useState, useEffect } from "react";
import { 
  DollarSign, 
  Leaf, 
  Zap, 
  TrendingDown, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  Database,
  ExternalLink,
  ShieldAlert,
  Sparkles
} from "lucide-react";

export default function Dashboard() {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [expandedRecId, setExpandedRecId] = useState<string | null>(null);
  const [actionAlert, setActionAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [recRes, accRes] = await Promise.all([
        fetch("/api/recommendations"),
        fetch("/api/cloud-accounts")
      ]);

      const recData = await recRes.json();
      const accData = await accRes.json();

      if (recData.success) setRecommendations(recData.recommendations || []);
      if (accData.success) setAccounts(accData.accounts || []);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setActionAlert({ type: "success", message: "Demo data seeded successfully!" });
        await fetchData();
      }
    } catch (err) {
      setActionAlert({ type: "error", message: "Failed to seed demo data." });
    } finally {
      setSeeding(false);
    }
  };

  const handleSync = async (accountId: string) => {
    setSyncing(true);
    try {
      const res = await fetch(`/api/cloud-accounts/${accountId}/sync`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setActionAlert({ type: "success", message: `Ingestion sync complete! Ingested ${data.ingestedCount} resources.` });
        await fetchData();
      } else {
        setActionAlert({ type: "error", message: data.error || "Sync failed" });
      }
    } catch (err) {
      setActionAlert({ type: "error", message: "Sync execution failed." });
    } finally {
      setSyncing(false);
    }
  };

  const handleApprove = async (id: string, decision: "approved" | "dismissed") => {
    try {
      const res = await fetch(`/api/recommendations/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approver: "devops-lead@company.com", decision })
      });
      const data = await res.json();
      if (data.success) {
        const ticketMsg = data.ticket ? ` Created ${data.ticket.system.toUpperCase()} (${data.ticket.ticketId})` : "";
        setActionAlert({
          type: "success",
          message: `Recommendation ${decision}!${ticketMsg}`
        });
        await fetchData();
      }
    } catch (err) {
      setActionAlert({ type: "error", message: "Approval process failed." });
    }
  };

  // Metric Aggregations
  const activeRecs = recommendations.filter((r) => r.status === "active");
  const totalSavings = activeRecs.reduce((sum, r) => sum + (r.estimatedMonthlySavings || 0), 0);
  const totalCarbonSavings = activeRecs.reduce((sum, r) => sum + (r.estimatedGco2eSavings || 0), 0);
  const activeAccount = accounts[0];

  // Chart Mock Data
  const chartData = [
    { date: "Aug 3", cost: 195, carbon: 410 },
    { date: "Aug 4", cost: 198, carbon: 425 },
    { date: "Aug 5", cost: 192, carbon: 395 },
    { date: "Aug 6", cost: 201, carbon: 440 },
    { date: "Aug 7", cost: 196, carbon: 415 },
    { date: "Aug 8", cost: 189, carbon: 390 },
    { date: "Aug 9", cost: 197, carbon: 405 },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }} className="animate-fade-in">
      {/* Header Banner */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h2 style={{ fontSize: "1.6rem", fontWeight: 700, color: "#fff" }}>FinOps & GreenOps Command Center</h2>
          <p style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
            Reconciled Cloud Billing, Telemetry & Carbon Footprint Evidence
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {activeAccount && (
            <button
              onClick={() => handleSync(activeAccount.id)}
              disabled={syncing}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                borderRadius: "10px",
                background: "rgba(16, 185, 129, 0.15)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                color: "#10b981",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: syncing ? "not-allowed" : "pointer",
              }}
            >
              <RefreshCw style={{ width: "15px", height: "15px", animation: syncing ? "spin 1s linear infinite" : "none" }} />
              {syncing ? "Syncing AWS..." : "Sync Cloud Accounts"}
            </button>
          )}

          <button
            onClick={handleSeed}
            disabled={seeding}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              borderRadius: "10px",
              background: "rgba(6, 182, 212, 0.15)",
              border: "1px solid rgba(6, 182, 212, 0.3)",
              color: "#06b6d4",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: seeding ? "not-allowed" : "pointer",
            }}
          >
            <Sparkles style={{ width: "15px", height: "15px" }} />
            {seeding ? "Seeding..." : "Seed Demo Data"}
          </button>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionAlert && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "10px",
            background: actionAlert.type === "success" ? "rgba(16, 185, 129, 0.1)" : "rgba(244, 63, 94, 0.1)",
            border: `1px solid ${actionAlert.type === "success" ? "rgba(16, 185, 129, 0.3)" : "rgba(244, 63, 94, 0.3)"}`,
            color: actionAlert.type === "success" ? "#34d399" : "#fb7185",
            fontSize: "0.88rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>{actionAlert.message}</span>
          <button onClick={() => setActionAlert(null)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer" }}>
            ✕
          </button>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "16px" }}>
        {/* Card 1: Monthly Cost */}
        <div className="glass-panel" style={{ padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ fontSize: "0.82rem", color: "#9ca3af", fontWeight: 500 }}>Billed Monthly Cost</span>
            <div style={{ padding: "8px", borderRadius: "8px", background: "rgba(245, 158, 11, 0.12)", color: "#f59e0b" }}>
              <DollarSign style={{ width: "18px", height: "18px" }} />
            </div>
          </div>
          <h3 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#fff" }}>$197.06</h3>
          <p style={{ fontSize: "0.75rem", color: "#10b981", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
            <TrendingDown style={{ width: "14px", height: "14px" }} /> -4.2% vs last cycle
          </p>
        </div>

        {/* Card 2: Carbon Footprint */}
        <div className="glass-panel" style={{ padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ fontSize: "0.82rem", color: "#9ca3af", fontWeight: 500 }}>Carbon Footprint</span>
            <div style={{ padding: "8px", borderRadius: "8px", background: "rgba(16, 185, 129, 0.12)", color: "#10b981" }}>
              <Leaf style={{ width: "18px", height: "18px" }} />
            </div>
          </div>
          <h3 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#fff" }}>405 <span style={{ fontSize: "1rem", fontWeight: 500, color: "#9ca3af" }}>gCO2e</span></h3>
          <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "4px" }}>
            385 gCO2e/kWh US Grid Avg
          </p>
        </div>

        {/* Card 3: SCI Score */}
        <div className="glass-panel" style={{ padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ fontSize: "0.82rem", color: "#9ca3af", fontWeight: 500 }}>SCI Rating</span>
            <div style={{ padding: "8px", borderRadius: "8px", background: "rgba(6, 182, 212, 0.12)", color: "#06b6d4" }}>
              <Zap style={{ width: "18px", height: "18px" }} />
            </div>
          </div>
          <h3 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#fff" }}>1.42 <span style={{ fontSize: "1rem", fontWeight: 500, color: "#9ca3af" }}>gCO2e/req</span></h3>
          <p style={{ fontSize: "0.75rem", color: "#06b6d4", marginTop: "4px" }}>
            Grade A (Green Standard)
          </p>
        </div>

        {/* Card 4: Actionable Savings */}
        <div className="glass-panel" style={{ padding: "20px", border: "1px solid rgba(16, 185, 129, 0.3)", background: "rgba(16, 185, 129, 0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ fontSize: "0.82rem", color: "#34d399", fontWeight: 600 }}>Actionable Monthly Savings</span>
            <div style={{ padding: "8px", borderRadius: "8px", background: "rgba(16, 185, 129, 0.2)", color: "#34d399" }}>
              <DollarSign style={{ width: "18px", height: "18px" }} />
            </div>
          </div>
          <h3 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#34d399" }}>${totalSavings.toFixed(2)}</h3>
          <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "4px" }}>
            {activeRecs.length} Active Recommendations
          </p>
        </div>
      </div>

      {/* Chart Section */}
      <div className="glass-panel" style={{ padding: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}>Reconciled Cost vs. Carbon Trend</h3>
            <p style={{ fontSize: "0.8rem", color: "#9ca3af" }}>Daily AWS Cost Explorer reconciled with Grid Intensity metrics</p>
          </div>
        </div>

        <div style={{ height: "240px", width: "100%", position: "relative", marginTop: "12px" }}>
          <svg viewBox="0 0 700 200" style={{ width: "100%", height: "100%", overflow: "visible" }}>
            <defs>
              <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4"/>
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0"/>
              </linearGradient>
              <linearGradient id="carbonGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.4"/>
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0"/>
              </linearGradient>
            </defs>

            {/* Grid lines */}
            <line x1="40" y1="30" x2="680" y2="30" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
            <line x1="40" y1="80" x2="680" y2="80" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
            <line x1="40" y1="130" x2="680" y2="130" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
            <line x1="40" y1="180" x2="680" y2="180" stroke="rgba(255,255,255,0.08)" />

            {/* Carbon Area & Line */}
            <polygon points="40,180 40,70 146,55 253,85 360,40 466,65 573,90 680,75 680,180" fill="url(#carbonGradient)" />
            <polyline points="40,70 146,55 253,85 360,40 466,65 573,90 680,75" fill="none" stroke="#10b981" strokeWidth="2.5" />

            {/* Cost Area & Line */}
            <polygon points="40,180 40,110 146,105 253,115 360,100 466,108 573,120 680,106 680,180" fill="url(#costGradient)" />
            <polyline points="40,110 146,105 253,115 360,100 466,108 573,120 680,106" fill="none" stroke="#06b6d4" strokeWidth="2.5" />

            {/* Data Dots */}
            {[
              { x: 40, c: 110, carb: 70, d: "Aug 3" },
              { x: 146, c: 105, carb: 55, d: "Aug 4" },
              { x: 253, c: 115, carb: 85, d: "Aug 5" },
              { x: 360, c: 100, carb: 40, d: "Aug 6" },
              { x: 466, c: 108, carb: 65, d: "Aug 7" },
              { x: 573, c: 120, carb: 90, d: "Aug 8" },
              { x: 680, c: 106, carb: 75, d: "Aug 9" },
            ].map((p, idx) => (
              <g key={idx}>
                <circle cx={p.x} cy={p.c} r="4" fill="#06b6d4" />
                <circle cx={p.x} cy={p.carb} r="4" fill="#10b981" />
                <text x={p.x} y="196" fill="#6b7280" fontSize="11" textAnchor="middle">{p.d}</text>
              </g>
            ))}
          </svg>

          {/* Legend */}
          <div style={{ display: "flex", gap: "20px", justifyContent: "center", marginTop: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.8rem", color: "#9ca3af" }}>
              <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: "#06b6d4" }} />
              <span>Cost ($ / Day)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.8rem", color: "#9ca3af" }}>
              <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: "#10b981" }} />
              <span>Carbon (gCO2e / Day)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations Section */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#fff" }}>Evidence-Backed Recommendations</h3>
            <p style={{ fontSize: "0.8rem", color: "#9ca3af" }}>Safe, traceable actions requiring human approval</p>
          </div>
        </div>

        {loading ? (
          <div className="glass-panel" style={{ padding: "40px", textTransform: "uppercase", textAlign: "center", color: "#6b7280" }}>
            Loading evidence-backed opportunities...
          </div>
        ) : recommendations.length === 0 ? (
          <div className="glass-panel" style={{ padding: "40px", textAlign: "center" }}>
            <p style={{ color: "#9ca3af", marginBottom: "16px" }}>No recommendations found. Click "Seed Demo Data" to populate realistic cloud opportunities.</p>
            <button
              onClick={handleSeed}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                background: "#10b981",
                color: "#0a0d14",
                fontWeight: 600,
                border: "none",
                cursor: "pointer"
              }}
            >
              Seed Demo Data
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {recommendations.map((rec) => {
              let evidence: any = {};
              try {
                evidence = typeof rec.evidence === "string" ? JSON.parse(rec.evidence) : rec.evidence;
              } catch (e) {}

              const isExpanded = expandedRecId === rec.id;
              const isApproved = rec.status === "approved";
              const isDismissed = rec.status === "dismissed";

              return (
                <div 
                  key={rec.id} 
                  className="glass-panel"
                  style={{
                    padding: "20px",
                    borderLeft: `4px solid ${isApproved ? "#10b981" : isDismissed ? "#6b7280" : rec.riskScore < 0.2 ? "#10b981" : "#f59e0b"}`,
                    opacity: isDismissed ? 0.6 : 1
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
                    <div style={{ flex: 1, minWidth: "280px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                        <span 
                          style={{
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            background: rec.category === "idle_cleanup" ? "rgba(244, 63, 94, 0.15)" : "rgba(6, 182, 212, 0.15)",
                            color: rec.category === "idle_cleanup" ? "#fb7185" : "#06b6d4",
                            border: `1px solid ${rec.category === "idle_cleanup" ? "rgba(244, 63, 94, 0.3)" : "rgba(6, 182, 212, 0.3)"}`
                          }}
                        >
                          {rec.category.replace("_", " ")}
                        </span>

                        <span
                          style={{
                            fontSize: "0.7rem",
                            fontWeight: 600,
                            padding: "3px 8px",
                            borderRadius: "6px",
                            background: "rgba(255,255,255,0.05)",
                            color: rec.riskScore < 0.2 ? "#34d399" : "#fbbf24"
                          }}
                        >
                          Risk Score: {(rec.riskScore * 10).toFixed(1)}/10
                        </span>

                        <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                          Confidence: {(rec.confidence * 100).toFixed(0)}%
                        </span>
                      </div>

                      <h4 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#fff", marginBottom: "4px" }}>
                        {rec.title}
                      </h4>
                      <p style={{ fontSize: "0.82rem", color: "#9ca3af" }}>
                        {evidence.metricsSummary || "Traceable recommendation based on CloudWatch 7-day usage heuristics."}
                      </p>
                    </div>

                    {/* Savings Pills */}
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Monthly Savings</p>
                        <p style={{ fontSize: "1.2rem", fontWeight: 700, color: "#10b981" }}>
                          +${rec.estimatedMonthlySavings.toFixed(2)}
                        </p>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Carbon Reduction</p>
                        <p style={{ fontSize: "1.1rem", fontWeight: 700, color: "#06b6d4" }}>
                          -{rec.estimatedGco2eSavings.toFixed(1)} <span style={{ fontSize: "0.75rem" }}>gCO2e</span>
                        </p>
                      </div>

                      {/* Actions */}
                      {rec.status === "active" ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "12px" }}>
                          <button
                            onClick={() => handleApprove(rec.id, "approved")}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "8px 14px",
                              borderRadius: "8px",
                              background: "#10b981",
                              color: "#0a0d14",
                              fontSize: "0.82rem",
                              fontWeight: 700,
                              border: "none",
                              cursor: "pointer"
                            }}
                          >
                            <CheckCircle2 style={{ width: "15px", height: "15px" }} />
                            Approve
                          </button>

                          <button
                            onClick={() => handleApprove(rec.id, "dismissed")}
                            style={{
                              padding: "8px",
                              borderRadius: "8px",
                              background: "rgba(255,255,255,0.05)",
                              color: "#9ca3af",
                              border: "1px solid var(--border-subtle)",
                              cursor: "pointer"
                            }}
                          >
                            <XCircle style={{ width: "16px", height: "16px" }} />
                          </button>
                        </div>
                      ) : (
                        <span
                          style={{
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            padding: "6px 12px",
                            borderRadius: "8px",
                            textTransform: "uppercase",
                            background: isApproved ? "rgba(16, 185, 129, 0.15)" : "rgba(255,255,255,0.05)",
                            color: isApproved ? "#34d399" : "#6b7280",
                            border: `1px solid ${isApproved ? "rgba(16, 185, 129, 0.3)" : "var(--border-subtle)"}`
                          }}
                        >
                          {rec.status}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expand Evidence Trace toggle */}
                  <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <button
                      onClick={() => setExpandedRecId(isExpanded ? null : rec.id)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#06b6d4",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                    >
                      {isExpanded ? <ChevronUp style={{ width: "14px", height: "14px" }} /> : <ChevronDown style={{ width: "14px", height: "14px" }} />}
                      {isExpanded ? "Hide Trace Evidence" : "View Trace Calculation Evidence"}
                    </button>
                  </div>

                  {/* Expanded Evidence Drawer */}
                  {isExpanded && evidence && (
                    <div 
                      style={{
                        marginTop: "12px",
                        padding: "16px",
                        borderRadius: "8px",
                        background: "rgba(0, 0, 0, 0.3)",
                        border: "1px solid rgba(255, 255, 255, 0.05)",
                        fontSize: "0.82rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px"
                      }}
                    >
                      <div>
                        <strong style={{ color: "#9ca3af" }}>Rule Applied:</strong>{" "}
                        <code style={{ color: "#34d399", background: "rgba(16, 185, 129, 0.1)", padding: "2px 6px", borderRadius: "4px" }}>
                          {evidence.ruleApplied || "rule_evaluator_v1"}
                        </code>
                      </div>
                      <div>
                        <strong style={{ color: "#9ca3af" }}>Calculation Formula:</strong>{" "}
                        <span style={{ color: "#f3f4f6" }}>{evidence.calculationFormula}</span>
                      </div>
                      <div>
                        <strong style={{ color: "#9ca3af" }}>Suggested Action:</strong>{" "}
                        <span style={{ color: "#06b6d4" }}>{evidence.suggestedAction}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
