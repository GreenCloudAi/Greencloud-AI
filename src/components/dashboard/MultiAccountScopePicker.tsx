"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, Layers, Plus, Upload } from "lucide-react";
import { CloudAccountSummary, CloudProviderId } from "./types";

interface MultiAccountScopePickerProps {
  allAccounts: CloudAccountSummary[];
  selectedAccountIds: string[];
  onChangeAccountIds: (ids: string[]) => void;
  selectedProviders: CloudProviderId[];
  onChangeProviders: (providers: CloudProviderId[]) => void;
  onOpenFocusImport: () => void;
  isReadOnly: boolean;
}

const PROVIDER_ICON: Record<CloudProviderId, { src: string; label: string }> = {
  aws: { src: "/icons/aws-dark.svg", label: "AWS" },
  gcp: { src: "/icons/gcp.svg", label: "GCP" },
  azure: { src: "/icons/azure.svg", label: "Azure" },
};

export function MultiAccountScopePicker({
  allAccounts,
  selectedAccountIds,
  onChangeAccountIds,
  selectedProviders,
  onChangeProviders,
  onOpenFocusImport,
  isReadOnly,
}: MultiAccountScopePickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  const allProvidersActive = selectedProviders.length === 3;
  const isAllAccounts =
    allAccounts.length > 0 && selectedAccountIds.length === allAccounts.length;

  const activeAccountsList = allAccounts.filter(
    (a) => selectedAccountIds.includes(a.id) && selectedProviders.includes(a.provider)
  );
  const activeProvidersInScope = Array.from(
    new Set(activeAccountsList.map((a) => a.provider))
  );

  const summaryLabel = (() => {
    if (allAccounts.length === 0) return "No accounts";
    if (activeAccountsList.length === 1) return activeAccountsList[0].name;
    if (isAllAccounts && allProvidersActive) {
      return `All Accounts (${allAccounts.length})`;
    }
    return `${activeAccountsList.length} of ${allAccounts.length} accounts`;
  })();

  const toggleProvider = (prov: CloudProviderId) => {
    const exists = selectedProviders.includes(prov);
    const next = exists
      ? selectedProviders.filter((p) => p !== prov)
      : [...selectedProviders, prov];
    if (next.length === 0) return;
    onChangeProviders(next);
  };

  const toggleAccount = (accId: string) => {
    const exists = selectedAccountIds.includes(accId);
    if (exists && selectedAccountIds.length === 1) return; // keep >= 1 selected
    const next = exists
      ? selectedAccountIds.filter((id) => id !== accId)
      : [...selectedAccountIds, accId];
    onChangeAccountIds(next);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="cursor-pointer rounded-full bg-[#FAF6E8] hover:bg-[#F5EED6] px-3.5 py-2 text-[12.5px] font-semibold text-[#2E2B1A] flex items-center gap-2 transition-colors"
      >
        {activeProvidersInScope.length > 0 ? (
          <span className="flex items-center -space-x-1">
            {activeProvidersInScope.map((p) => (
              <img
                key={p}
                src={PROVIDER_ICON[p].src}
                alt={PROVIDER_ICON[p].label}
                className="h-3.5 w-auto object-contain"
              />
            ))}
          </span>
        ) : (
          <Layers className="w-3.5 h-3.5 text-[#686450]" />
        )}
        <span className="max-w-[150px] truncate">{summaryLabel}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#686450] transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="gc-panel-swap absolute left-0 sm:left-auto sm:right-0 mt-2 w-[310px] sm:w-[340px] z-50 rounded-[24px] bg-[#FAF6E8] p-4 shadow-warm-xl space-y-3.5">
          {/* Provider Filter Row */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#686450]">
              <span>Cloud Providers</span>
              {!allProvidersActive && (
                <button
                  type="button"
                  onClick={() => onChangeProviders(["aws", "gcp", "azure"])}
                  className="text-[#155E4B] hover:underline cursor-pointer"
                >
                  Show all
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {(["aws", "gcp", "azure"] as CloudProviderId[]).map((prov) => {
                const active = selectedProviders.includes(prov);
                const count = allAccounts.filter((a) => a.provider === prov).length;
                return (
                  <button
                    key={prov}
                    type="button"
                    onClick={() => toggleProvider(prov)}
                    className={`cursor-pointer rounded-xl px-2.5 py-2 flex items-center justify-center gap-1.5 text-[11.5px] font-bold transition-colors ${
                      active
                        ? "bg-[#FFF3A8] text-[#2E2B1A]"
                        : "bg-[#FFFDF4] text-[#8D8975] opacity-70"
                    }`}
                  >
                    <img
                      src={PROVIDER_ICON[prov].src}
                      alt={PROVIDER_ICON[prov].label}
                      className="h-3.5 w-auto object-contain"
                    />
                    <span>{PROVIDER_ICON[prov].label}</span>
                    {count > 0 && <span className="tabular-nums">({count})</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Account Multi-Select List */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#686450]">
              <span>Select Accounts ({activeAccountsList.length} active)</span>
              {allAccounts.length > 1 && (
                <button
                  type="button"
                  onClick={() => onChangeAccountIds(allAccounts.map((a) => a.id))}
                  className="text-[#155E4B] hover:underline cursor-pointer"
                >
                  Select all
                </button>
              )}
            </div>

            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-0.5">
              {allAccounts.length > 0 ? (
                allAccounts.map((acc) => {
                  const checked = selectedAccountIds.includes(acc.id);
                  const provOk = selectedProviders.includes(acc.provider);
                  return (
                    <div
                      key={acc.id}
                      className={`rounded-[16px] p-2.5 flex items-center justify-between gap-2 transition-colors ${
                        checked && provOk
                          ? "bg-[#FFFDF4] shadow-warm-sm"
                          : "bg-[#FFFDF4]/55 opacity-75"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleAccount(acc.id)}
                        className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                      >
                        <span
                          className={`w-4.5 h-4.5 w-[18px] h-[18px] rounded-md flex items-center justify-center shrink-0 transition-colors ${
                            checked
                              ? "bg-[#155E4B] text-[#FFFDF4]"
                              : "bg-[#FAF6E8] ring-1 ring-[#C9BFA0]"
                          }`}
                        >
                          {checked && <Check className="w-3 h-3 stroke-[3]" />}
                        </span>
                        <img
                          src={PROVIDER_ICON[acc.provider].src}
                          alt={acc.provider}
                          className="h-4 w-auto object-contain shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-[12.5px] font-bold text-[#2E2B1A] truncate">
                            {acc.name}
                          </div>
                          <div className="text-[11px] text-[#8D8975] code-font truncate">
                            {acc.externalAccountId}
                          </div>
                        </div>
                      </button>

                      {allAccounts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (!selectedProviders.includes(acc.provider)) {
                              onChangeProviders([...selectedProviders, acc.provider]);
                            }
                            onChangeAccountIds([acc.id]);
                          }}
                          className="text-[11px] font-semibold text-[#686450] hover:text-[#2E2B1A] px-2 py-1 rounded-lg hover:bg-[#FAF6E8] shrink-0 cursor-pointer"
                        >
                          Only
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="rounded-[16px] bg-[#FFFDF4] p-3 text-[12px] text-[#686450]">
                  No cloud accounts connected yet.
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          {!isReadOnly && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Link
                href="/onboarding"
                prefetch={true}
                onClick={() => setOpen(false)}
                className="m3-btn m3-btn-compact m3-pastel-sun text-[12px] px-3"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Connect AWS</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onOpenFocusImport();
                }}
                className="m3-btn m3-btn-compact m3-pastel-oat text-[12px] px-3"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import FOCUS</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
