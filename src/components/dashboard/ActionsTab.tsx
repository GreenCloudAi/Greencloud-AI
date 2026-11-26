"use client";

import React, { useMemo, useState } from "react";
import { Check, ChevronDown, Code2, GitPullRequest, Ticket } from "lucide-react";
import { DashboardData, RecommendationItem, RoleFilter } from "./types";

interface ActionsTabProps {
  data: DashboardData;
  roleFilter: RoleFilter;
  onRefresh: () => void;
}

export function ActionsTab({ data, roleFilter, onRefresh }: ActionsTabProps) {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [expandedCodeId, setExpandedCodeId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const items = data.recommendations.items || [];
  const isReadOnly = roleFilter === "viewer";

  const categories = useMemo(() => {
    const set = new Set(items.map((r) => r.category.toLowerCase()));
    return ["all", ...Array.from(set)];
  }, [items]);

  const filteredItems = useMemo(() => {
    if (categoryFilter === "all") return items;
    return items.filter((r) => r.category.toLowerCase() === categoryFilter);
  }, [categoryFilter, items]);

  const handleApprove = async (rec: RecommendationItem, mode: "pull_request" | "ticket") => {
    if (isReadOnly) return;
    setBusyId(rec.id);
    setFeedback(null);
    try {
      const res = await fetch(`/api/recommendations/${rec.id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-greencloud-role": roleFilter,
        },
        body: JSON.stringify({
          mode,
          approver: roleFilter,
          comment: `Approved via dashboard (${mode})`,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error?.message || "Failed to execute approval.");
      }
      setFeedback({
        type: "ok",
        text: `${mode === "pull_request" ? "Terraform proposal file" : "Ticket draft"} generated for ${rec.title}`,
      });
      onRefresh();
    } catch (err: any) {
      setFeedback({ type: "err", text: err.message });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="gc-panel-swap space-y-5">
      <div className="rounded-[24px] bg-[#FAF6E8] p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="m3-connected-h">
          {categories.map((cat) => {
            const selected = categoryFilter === cat;
            return (
              <button
                key={cat}
                type="button"
                data-selected={selected ? "true" : "false"}
                onClick={() => setCategoryFilter(cat)}
                className={`m3-seg capitalize ${
                  selected
                    ? "bg-[#FFF76A] text-[#2E2B1A]"
                    : "bg-[#FFFDF4] text-[#686450] hover:text-[#2E2B1A]"
                }`}
              >
                {cat.replace("_", " ")}
              </button>
            );
          })}
        </div>

        <div className="text-[12.5px] font-bold text-[#155E4B] tabular-nums">
          Total active savings: ${(data.recommendations.totalSavings || 0).toFixed(2)}/mo
        </div>
      </div>

      {isReadOnly && (
        <div className="rounded-[20px] bg-[#FBE7CB] px-4 py-3 text-[12.5px] font-semibold text-[#6B4814]">
          Recommendation actions are unavailable in this view.
        </div>
      )}

      {feedback && (
        <div
          className={`gc-panel-swap rounded-[20px] px-4 py-3 text-[13px] font-semibold flex items-center gap-2 ${
            feedback.type === "ok"
              ? "bg-[#E2F5EF] text-[#155E4B]"
              : "bg-[#FEE2E2] text-[#991B1B]"
          }`}
        >
          {feedback.type === "ok" && <Check className="w-4 h-4 shrink-0" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {filteredItems.length > 0 ? (
        <div className="space-y-4">
          {filteredItems.map((rec) => {
            const isExecuted = rec.status === "executed";
            const isExpanded = expandedCodeId === rec.id;
            return (
              <div key={rec.id} className="rounded-[26px] bg-[#FAF6E8] p-5 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2.5 text-[11.5px] font-bold">
                      <span className="text-[#686450] uppercase tracking-wide">
                        {rec.provider} · {rec.accountName}
                      </span>
                      <span className="text-[#8D8975] uppercase">{rec.category.replace("_", " ")}</span>
                      {rec.resource && (
                        <span className="code-font text-[#8D8975]">
                          {rec.resource.providerResourceId} · {rec.resource.region}
                        </span>
                      )}
                      <span className={isExecuted ? "text-[#155E4B]" : "text-[#9A6B00]"}>
                        {isExecuted ? "Artifact generated" : "Pending review"}
                      </span>
                    </div>
                    <h3 className="text-[17px] font-bold text-[#2E2B1A]">{rec.title}</h3>
                    {rec.description && (
                      <p className="text-[13px] text-[#686450] leading-relaxed">{rec.description}</p>
                    )}
                  </div>

                  <div className="rounded-[18px] bg-[#FFFDF4] px-4 py-3 text-right shrink-0 space-y-0.5 tabular-nums">
                    <div className="text-[17px] font-extrabold text-[#155E4B]">
                      +${rec.estimatedMonthlySavings.toFixed(2)}/mo
                    </div>
                    <div className="text-[11.5px] font-semibold text-[#686450]">
                      -{rec.estimatedGco2eSavings.toFixed(0)} g CO2e · Risk {rec.riskScore}/10
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setExpandedCodeId(isExpanded ? null : rec.id)}
                    className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#2E2B1A] hover:text-[#155E4B] cursor-pointer"
                  >
                    <Code2 className="w-4 h-4" />
                    <span>
                      {isExpanded ? "Hide Terraform & Evidence" : "Inspect Terraform & Evidence"}
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {!isReadOnly && !isExecuted && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={busyId === rec.id}
                        onClick={() => handleApprove(rec, "ticket")}
                        className="m3-btn m3-btn-compact m3-pastel-oat text-[12.5px]"
                      >
                        <Ticket className="w-3.5 h-3.5" />
                        <span>Create Ticket</span>
                      </button>
                      <button
                        type="button"
                        disabled={busyId === rec.id}
                        onClick={() => handleApprove(rec, "pull_request")}
                        className="m3-btn m3-btn-compact m3-pastel-sun text-[12.5px]"
                      >
                        <GitPullRequest className="w-3.5 h-3.5" />
                        <span>{busyId === rec.id ? "Generating..." : "Generate PR"}</span>
                      </button>
                    </div>
                  )}
                </div>

                {isExpanded && (
                  <div className="gc-panel-swap grid grid-cols-1 lg:grid-cols-2 gap-3 pt-1">
                    {rec.evidence && (
                      <div className="rounded-[18px] bg-[#FFFDF4] p-4 space-y-1.5">
                        <div className="text-[11.5px] font-bold text-[#686450]">
                          Telemetry Evidence
                        </div>
                        <pre className="text-[11.5px] code-font text-[#2E2B1A] whitespace-pre-wrap break-words">
                          {rec.evidence}
                        </pre>
                      </div>
                    )}
                    <div className="rounded-[18px] bg-[#181711] text-[#FFFDF4] p-4 space-y-1.5">
                      <div className="text-[11.5px] font-bold text-[#FFF3A8]">Terraform Diff</div>
                      <pre className="text-[11.5px] code-font text-[#E2F5EF] whitespace-pre-wrap break-words">
                        {rec.terraformHcl ||
                          `# Target resource: ${rec.resource?.providerResourceId || rec.id}`}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[24px] bg-[#FAF6E8] p-8 text-center text-[13.5px] text-[#686450]">
          No optimization actions match this filter.
        </div>
      )}
    </div>
  );
}
