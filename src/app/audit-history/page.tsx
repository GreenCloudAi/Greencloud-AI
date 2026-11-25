"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { NavigationBar } from "@/components/common/NavigationBar";
import { ComplianceFooter } from "@/components/common/ComplianceFooter";
import { HeroShapeMorph } from "@/components/overview/MotionPrimitives";

interface AuditLog {
  id: string;
  actor: string;
  action: string;
  objectType: string;
  objectId: string;
  ts: string;
  metadata: string | null;
}

interface ParsedMetadata {
  name?: string;
  provider?: string;
  success?: boolean;
  syncedResourceCount?: number;
  recommendationCount?: number;
  title?: string;
  savings?: number | string;
  mode?: string;
  outputPath?: string;
}

const ACTION_BADGE_MAP: Record<string, { label: string; style: string }> = {
  connect_account: {
    label: "Account connected",
    style: "bg-[#E2F5EF] text-[#155E4B]",
  },
  sync_triggered: {
    label: "Sync started",
    style: "bg-[#FBF6E3] text-[#6B4814]",
  },
  sync_completed: {
    label: "Sync completed",
    style: "bg-[#E2F5EF] text-[#155E4B]",
  },
  recommendation_approved: {
    label: "Fix approved",
    style: "bg-[#FFF3A8] text-[#524305]",
  },
  recommendation_executed: {
    label: "Fix executed",
    style: "bg-[#FFE985] text-[#2E2B1A]",
  },
};

function getActionBadge(action: string) {
  if (ACTION_BADGE_MAP[action]) {
    return ACTION_BADGE_MAP[action];
  }
  const readable = action.replace(/_/g, " ");
  return {
    label: readable.charAt(0).toUpperCase() + readable.slice(1),
    style: "bg-[#F3EEDB] text-[#2E2B1A]",
  };
}

function parseAuditMetadata(raw: string | null): ParsedMetadata | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ParsedMetadata;
  } catch {
    return null;
  }
}

function formatMetadataSummary(meta: ParsedMetadata | null, raw: string | null): string[] {
  if (!meta) {
    return raw ? [raw] : [];
  }

  const parts: string[] = [];
  if (meta.name) parts.push(`Account: ${meta.name}`);
  if (meta.provider) parts.push(`Provider: ${meta.provider.toUpperCase()}`);
  if (typeof meta.success === "boolean") {
    parts.push(meta.success ? "Status: Succeeded" : "Status: Failed");
  }
  if (typeof meta.syncedResourceCount === "number") {
    parts.push(`${meta.syncedResourceCount} resources synced`);
  }
  if (typeof meta.recommendationCount === "number") {
    parts.push(`${meta.recommendationCount} recommendations`);
  }
  if (meta.title) parts.push(meta.title);
  if (meta.savings !== undefined && meta.savings !== null) {
    parts.push(`Savings: $${meta.savings}/mo`);
  }
  if (meta.mode) parts.push(`Mode: ${meta.mode}`);
  if (meta.outputPath) parts.push(`Path: ${meta.outputPath}`);
  return parts;
}

export default function AuditHistoryPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/audit-logs");
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setLogs(Array.isArray(data.logs) ? data.logs : []);
    } catch {
      setError("Could not load audit history right now.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  return (
    <div className="min-h-screen bg-[#FFFDF4] text-[#2E2B1A] flex flex-col justify-between selection:bg-[#FFF76A] selection:text-[#2E2B1A]">
      <NavigationBar />

      <main className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 w-full flex-grow space-y-7 sm:space-y-9 pt-4 sm:pt-6">
        {/* Header */}
        <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 items-center text-center lg:text-left">
          <div className="space-y-1.5">
            <h1 className="text-[28px] sm:text-[36px] font-extrabold tracking-[-0.02em] text-[#2E2B1A] leading-tight">
              Audit history
            </h1>
            <p className="text-[15px] text-[#686450] max-w-2xl mx-auto lg:mx-0">
              Chronological ledger of account connections, telemetry syncs, recommendation approvals, and Terraform exports.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => void loadLogs()}
              className="m3-btn m3-btn-compact m3-pastel-oat"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span>{loading ? "Refreshing..." : "Refresh"}</span>
            </button>
            <Link href="/dashboard" className="m3-btn m3-btn-compact m3-pastel-sun">
              <span>Open dashboard</span>
            </Link>
          </div>
        </section>

        {/* Audit Ledger Card */}
        <section className="rounded-[28px] bg-[#FAF6E8] p-4 sm:p-6 shadow-warm-sm">
          {loading ? (
            <div className="rounded-[22px] bg-[#FFFDF4] p-12 text-center space-y-2">
              <div className="text-[15px] font-semibold text-[#2E2B1A]">Loading audit events...</div>
              <p className="text-[13.5px] text-[#686450]">Fetching recent sync and execution records.</p>
            </div>
          ) : error ? (
            <div className="rounded-[22px] bg-[#FFFDF4] p-12 text-center space-y-4">
              <div className="text-[16px] font-bold text-[#2E2B1A]">{error}</div>
              <button
                type="button"
                onClick={() => void loadLogs()}
                className="m3-btn m3-btn-compact m3-pastel-oat"
              >
                <span>Try again</span>
              </button>
            </div>
          ) : logs.length === 0 ? (
            <div className="rounded-[22px] bg-[#FFFDF4] p-12 text-center flex flex-col items-center space-y-4">
              <div className="relative w-12 h-12 flex items-center justify-center">
                <div className="absolute inset-0 text-[#CEECE0]">
                  <HeroShapeMorph shape="flower" />
                </div>
                <span className="material-symbols-outlined icon-filled relative z-10 text-[22px] text-[#155E4B]">
                  history
                </span>
              </div>
              <div className="space-y-1 max-w-md">
                <h2 className="text-[18px] font-bold text-[#2E2B1A]">No audit events recorded yet</h2>
                <p className="text-[14px] text-[#686450]">
                  Connect an AWS account or run a telemetry sync in the dashboard to see immutable activity logs here.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                <Link href="/onboarding" className="m3-btn m3-btn-compact m3-pastel-sun">
                  <span>Connect AWS</span>
                </Link>
                <Link href="/dashboard" className="m3-btn m3-btn-compact m3-pastel-oat">
                  <span>Go to dashboard</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-[22px] bg-[#FFFDF4] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[720px]">
                  <thead>
                    <tr className="bg-[#FBF6E3]/80 text-[12px] font-semibold text-[#686450]">
                      <th className="py-3.5 px-5">Timestamp</th>
                      <th className="py-3.5 px-5">Actor</th>
                      <th className="py-3.5 px-5">Action</th>
                      <th className="py-3.5 px-5">Target</th>
                      <th className="py-3.5 px-5">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#FAF6E8] text-[13.5px]">
                    {logs.map((log) => {
                      const badge = getActionBadge(log.action);
                      const meta = parseAuditMetadata(log.metadata);
                      const detailParts = formatMetadataSummary(meta, log.metadata);
                      const formattedTime = Number.isNaN(Date.parse(log.ts))
                        ? log.ts
                        : new Date(log.ts).toLocaleString();

                      return (
                        <tr key={log.id} className="hover:bg-[#FAF6E8]/55 transition-colors">
                          <td className="py-4 px-5 text-[#686450] tabular-nums whitespace-nowrap align-top">
                            {formattedTime}
                          </td>
                          <td className="py-4 px-5 font-semibold text-[#2E2B1A] whitespace-nowrap align-top">
                            {log.actor}
                          </td>
                          <td className="py-4 px-5 whitespace-nowrap align-top">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-[12px] font-semibold ${badge.style}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="py-4 px-5 align-top">
                            <div className="font-semibold text-[#2E2B1A]">{log.objectType}</div>
                            <div className="code-font text-[12px] text-[#686450] mt-0.5">{log.objectId}</div>
                          </td>
                          <td className="py-4 px-5 text-[#686450] align-top">
                            {detailParts.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {detailParts.map((part) => (
                                  <span
                                    key={part}
                                    className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-[#FAF6E8] text-[12px] text-[#2E2B1A]"
                                  >
                                    {part}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[12.5px] text-[#8C8773]">No extra details</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </main>

      <ComplianceFooter />
    </div>
  );
}
