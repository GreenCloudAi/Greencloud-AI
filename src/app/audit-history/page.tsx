"use client";

import React, { useState, useEffect } from "react";
import { History, Shield, CheckCircle2, RefreshCw, AlertTriangle, UserCheck, Search } from "lucide-react";

export default function AuditHistory() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/audit-logs");
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(
    (log) =>
      log.actor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.objectType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }} className="animate-fade-in">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h2 style={{ fontSize: "1.6rem", fontWeight: 700, color: "#fff" }}>Multi-Tenant Audit History</h2>
          <p style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
            Immutable event log tracking cloud syncs, ingestion events, and human approval decisions.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            borderRadius: "10px",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid var(--border-subtle)",
            color: "#f3f4f6",
            fontSize: "0.85rem",
            cursor: "pointer"
          }}
        >
          <RefreshCw style={{ width: "15px", height: "15px" }} />
          Refresh Log
        </button>
      </div>

      {/* Search Input */}
      <div className="glass-panel" style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: "12px" }}>
        <Search style={{ width: "18px", height: "18px", color: "#6b7280" }} />
        <input
          type="text"
          placeholder="Filter audit log by actor, action, or object..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            background: "none",
            border: "none",
            outline: "none",
            color: "#fff",
            fontSize: "0.9rem",
            width: "100%"
          }}
        />
      </div>

      {/* Log List */}
      {loading ? (
        <div className="glass-panel" style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
          Loading immutable audit timeline...
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="glass-panel" style={{ padding: "40px", textAlign: "center", color: "#9ca3af" }}>
          No audit log entries found. Trigger a sync or approve a recommendation on the dashboard to populate logs.
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: "8px 0" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {filteredLogs.map((log, index) => {
              let metadataObj: any = {};
              try {
                metadataObj = JSON.parse(log.metadata || "{}");
              } catch (e) {}

              const isApproval = log.action.includes("approved");
              const isSync = log.action.includes("sync");

              return (
                <div
                  key={log.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "16px 20px",
                    borderBottom: index < filteredLogs.length - 1 ? "1px solid var(--border-subtle)" : "none",
                    flexWrap: "wrap",
                    gap: "12px"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        background: isApproval
                          ? "rgba(16, 185, 129, 0.15)"
                          : isSync
                          ? "rgba(6, 182, 212, 0.15)"
                          : "rgba(255,255,255,0.05)",
                        color: isApproval ? "#10b981" : isSync ? "#06b6d4" : "#9ca3af",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      {isApproval ? <UserCheck style={{ width: "18px", height: "18px" }} /> : <History style={{ width: "18px", height: "18px" }} />}
                    </div>

                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#fff" }}>
                          {log.action.replace("_", " ").toUpperCase()}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "#9ca3af", background: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: "6px" }}>
                          {log.objectType}
                        </span>
                      </div>
                      <p style={{ fontSize: "0.8rem", color: "#9ca3af", marginTop: "2px" }}>
                        Actor: <strong style={{ color: "#e5e7eb" }}>{log.actor}</strong> • ID: <code style={{ color: "#6b7280" }}>{log.objectId}</code>
                      </p>
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "0.78rem", color: "#6b7280" }}>
                      {new Date(log.ts).toLocaleString()}
                    </span>
                    {metadataObj && Object.keys(metadataObj).length > 0 && (
                      <p style={{ fontSize: "0.75rem", color: "#06b6d4", marginTop: "2px" }}>
                        {JSON.stringify(metadataObj).substring(0, 45)}...
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
