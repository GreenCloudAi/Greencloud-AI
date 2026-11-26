"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAccountStatus } from "@/components/common/AccountStatusContext";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { OverviewTab } from "@/components/dashboard/OverviewTab";
import { CostsTab } from "@/components/dashboard/CostsTab";
import { CarbonTab } from "@/components/dashboard/CarbonTab";
import { ResourcesTab } from "@/components/dashboard/ResourcesTab";
import { ActionsTab } from "@/components/dashboard/ActionsTab";
import { AccountKeysModal } from "@/components/dashboard/AccountKeysModal";
import { FocusImportModal } from "@/components/dashboard/FocusImportModal";
import { WorkspaceSettingsModal } from "@/components/dashboard/WorkspaceSettingsModal";
import {
  CloudProviderId,
  DashboardData,
  DashboardTab,
  ROLE_META,
  RoleFilter,
  TimeWindow,
} from "@/components/dashboard/types";

const VALID_TABS: DashboardTab[] = ["overview", "costs", "carbon", "resources", "actions"];

function DashboardWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setHasAccount } = useAccountStatus();

  const tabParam = searchParams.get("tab") as DashboardTab | null;
  const activeTab: DashboardTab =
    tabParam && VALID_TABS.includes(tabParam) ? tabParam : "overview";

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [selectedProviders, setSelectedProviders] = useState<CloudProviderId[]>([
    "aws",
    "gcp",
    "azure",
  ]);
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("30d");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("admin");

  const [keysModalOpen, setKeysModalOpen] = useState(false);
  const [focusModalOpen, setFocusModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  // Sync persisted workspace config (role, budget, SCI functional units) on initial mount
  useEffect(() => {
    fetch("/api/workspace/config", { cache: "no-store" })
      .then((r) => r.json())
      .then((cfg) => {
        const storedSessionRole =
          typeof window !== "undefined"
            ? (window.sessionStorage.getItem("gc_selected_role") as RoleFilter | null)
            : null;
        if (storedSessionRole && storedSessionRole in ROLE_META) {
          setRoleFilter(storedSessionRole);
        } else if (cfg?.activeRole && cfg.activeRole in ROLE_META) {
          setRoleFilter(cfg.activeRole as RoleFilter);
        }
      })
      .catch(() => {});
  }, []);

  const fetchDashboard = useCallback(
    async (
      accountIdsOverride?: string[],
      providersOverride?: CloudProviderId[],
      windowOverride?: TimeWindow,
      roleOverride?: RoleFilter
    ) => {
      try {
        setError(null);
        const accIds = accountIdsOverride ?? selectedAccountIds;
        const provs = providersOverride ?? selectedProviders;
        const win = windowOverride ?? timeWindow;
        const role = roleOverride ?? roleFilter;

        const params = new URLSearchParams();
        if (accIds.length > 0) params.set("accountIds", accIds.join(","));
        else params.set("accountIds", "all");

        params.set("providers", provs.join(","));
        params.set("window", win);
        params.set("role", role);

        const res = await fetch(`/api/dashboard?${params.toString()}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok || json.error) {
          throw new Error(json.error?.message || "Failed to load dashboard telemetry");
        }
        setData(json);
        setHasAccount(Boolean(json.allAccounts?.length > 0));
        if (accIds.length === 0 && Array.isArray(json.allAccounts) && json.allAccounts.length > 0) {
          setSelectedAccountIds(json.allAccounts.map((a: any) => a.id));
        }
      } catch (err: any) {
        setError(err.message || "Unable to load workspace telemetry.");
      } finally {
        setLoading(false);
      }
    },
    [roleFilter, selectedAccountIds, selectedProviders, setHasAccount, timeWindow]
  );

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleSelectTab = (tab: DashboardTab) => {
    const nextUrl = tab === "overview" ? "/dashboard" : `/dashboard?tab=${tab}`;
    router.push(nextUrl, { scroll: true });
  };

  const handleChangeRole = async (nextRole: RoleFilter) => {
    setRoleFilter(nextRole);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("gc_selected_role", nextRole);
    }
    fetch("/api/workspace/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activeRole: nextRole }),
    }).catch(() => {});
    fetchDashboard(undefined, undefined, undefined, nextRole);
  };

  const handleChangeAccountIds = (ids: string[]) => {
    setSelectedAccountIds(ids);
    fetchDashboard(ids, selectedProviders, timeWindow, roleFilter);
  };

  const handleChangeProviders = (provs: CloudProviderId[]) => {
    setSelectedProviders(provs);
    fetchDashboard(selectedAccountIds, provs, timeWindow, roleFilter);
  };

  const handleChangeWindow = (w: TimeWindow) => {
    setTimeWindow(w);
    fetchDashboard(selectedAccountIds, selectedProviders, w, roleFilter);
  };

  const handleBatchSync = async () => {
    if (!data?.allAccounts.length || roleFilter === "viewer") return;
    setSyncing(true);
    setSyncNotice(null);
    setError(null);
    try {
      const targetIds =
        selectedAccountIds.length > 0
          ? selectedAccountIds
          : data.allAccounts.map((a) => a.id);

      const res = await fetch("/api/dashboard/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-greencloud-role": roleFilter,
        },
        body: JSON.stringify({ accountIds: targetIds }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error?.message || "Sync failed.");
      }
      await fetchDashboard();
      setSyncNotice(
        `Synced ${json.syncedAccounts} account(s). ${json.recommendationCount || 0} recommendation(s) evaluated.`
      );
    } catch (err: any) {
      setError(err.message || "Sync failed. Check IAM Role permissions.");
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveUnits = async (units: number) => {
    const res = await fetch("/api/workspace/config", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-greencloud-role": roleFilter,
      },
      body: JSON.stringify({ functionalUnits: units }),
    });
    if (res.ok) {
      await fetchDashboard();
    }
  };

  const handleExportJson = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `greencloud-multicloud-${timeWindow}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isReadOnly = roleFilter === "viewer";

  return (
    <DashboardShell
      activeTab={activeTab}
      onSelectTab={handleSelectTab}
      timeWindow={timeWindow}
      onChangeTimeWindow={handleChangeWindow}
      roleFilter={roleFilter}
      onChangeRoleFilter={handleChangeRole}
      account={data?.account ?? null}
      allAccounts={data?.allAccounts ?? []}
      selectedAccountIds={selectedAccountIds}
      onChangeAccountIds={handleChangeAccountIds}
      selectedProviders={selectedProviders}
      onChangeProviders={handleChangeProviders}
      onSync={handleBatchSync}
      syncing={syncing}
      onExportJson={handleExportJson}
      onOpenKeysModal={() => setKeysModalOpen(true)}
      onOpenSettingsModal={() => setSettingsModalOpen(true)}
      onOpenFocusImport={() => setFocusModalOpen(true)}
      activeActionsCount={data?.recommendations.activeCount ?? 0}
    >
      {error && (
        <div className="mb-4 rounded-[20px] bg-[#FEE2E2] px-4 py-3 text-[13px] font-semibold text-[#991B1B]">
          {error}
        </div>
      )}

      {syncNotice && (
        <div className="mb-4 rounded-[20px] bg-[#E2F5EF] px-4 py-3 text-[13px] font-semibold text-[#155E4B]">
          {syncNotice}
        </div>
      )}

      {loading && !data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((idx) => (
              <div key={idx} className="h-32 rounded-[24px] bg-[#FAF6E8] animate-pulse" />
            ))}
          </div>
          <div className="h-72 rounded-[28px] bg-[#FAF6E8] animate-pulse" />
        </div>
      ) : data ? (
        <>
          {activeTab === "overview" && (
            <OverviewTab
              data={data}
              timeWindow={timeWindow}
              roleFilter={roleFilter}
              onSelectTab={handleSelectTab}
              onSync={handleBatchSync}
              syncing={syncing}
              onOpenFocusImport={() => setFocusModalOpen(true)}
            />
          )}
          {activeTab === "costs" && <CostsTab data={data} />}
          {activeTab === "carbon" && (
            <CarbonTab
              data={data}
              isReadOnly={isReadOnly}
              onSaveUnits={handleSaveUnits}
            />
          )}
          {activeTab === "resources" && (
            <ResourcesTab data={data} onSelectTab={handleSelectTab} />
          )}
          {activeTab === "actions" && (
            <ActionsTab
              data={data}
              roleFilter={roleFilter}
              onRefresh={() => fetchDashboard()}
            />
          )}
        </>
      ) : null}

      <AccountKeysModal
        account={data?.account ?? null}
        open={keysModalOpen}
        onClose={() => setKeysModalOpen(false)}
        onUpdated={() => fetchDashboard()}
      />

      <FocusImportModal
        open={focusModalOpen}
        onClose={() => setFocusModalOpen(false)}
        onImported={() => {
          setSelectedAccountIds([]);
          fetchDashboard([]);
        }}
      />

      <WorkspaceSettingsModal
        open={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        monthlyBudget={data?.workspaceConfig.monthlyBudget ?? 150}
        functionalUnits={data?.workspaceConfig.functionalUnits ?? 100000}
        isReadOnly={isReadOnly}
        onSaved={() => fetchDashboard()}
      />
    </DashboardShell>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FFFDF4] text-[#686450] flex items-center justify-center text-[14px] font-semibold">
          Loading multi-cloud dashboard...
        </div>
      }
    >
      <DashboardWorkspace />
    </Suspense>
  );
}
