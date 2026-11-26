"use client";

import Link from "next/link";
import React, { Suspense, useEffect, useRef, useState } from "react";
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
  const latestRequest = useRef(0);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const refreshDashboard = () => setRefreshVersion((version) => version + 1);
  const [error, setError] = useState<string | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);
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

  const [roleReady, setRoleReady] = useState(false);
  useEffect(() => {
    const stored = window.sessionStorage.getItem("gc_selected_role");
    if (stored && Object.hasOwn(ROLE_META, stored)) setRoleFilter(stored as RoleFilter);
    setRoleReady(true);
  }, []);

  useEffect(() => {
    if (!roleReady) return;
    const requestId = ++latestRequest.current;
    const controller = new AbortController();
    const params = new URLSearchParams({
      accountIds: selectedAccountIds.join(",") || "all",
      providers: selectedProviders.join(","),
      window: timeWindow,
      role: roleFilter,
    });
    setError(null);

    async function loadDashboard() {
      try {
        const res = await fetch(`/api/dashboard?${params}`, {
          cache: "no-store", signal: controller.signal,
        });
        const json = await res.json();
        if (controller.signal.aborted || requestId !== latestRequest.current) return;
        setNeedsSignIn(res.status === 401);
        if (!res.ok || json.error) {
          if (res.status === 401 || res.status === 403) {
            setData(null);
            setHasAccount(false);
          }
          throw new Error(json.error?.message || "Failed to load dashboard telemetry");
        }
        setData(json);
        setHasAccount(json.allAccounts.length > 0);
        if (!window.sessionStorage.getItem("gc_selected_role")
          && Object.hasOwn(ROLE_META, json.workspaceConfig.activeRole)
          && json.workspaceConfig.activeRole !== roleFilter) {
          setRoleFilter(json.workspaceConfig.activeRole);
        }
      } catch (error) {
        if (!controller.signal.aborted && requestId === latestRequest.current) {
          setError(error instanceof Error ? error.message : "Unable to load workspace telemetry.");
        }
      } finally {
        if (!controller.signal.aborted && requestId === latestRequest.current) setLoading(false);
      }
    }

    void loadDashboard();
    return () => controller.abort();
  }, [roleReady, roleFilter, selectedAccountIds, selectedProviders, setHasAccount, timeWindow, refreshVersion]);

  const handleSelectTab = (tab: DashboardTab) => {
    const nextUrl = tab === "overview" ? "/dashboard" : `/dashboard?tab=${tab}`;
    router.push(nextUrl, { scroll: true });
  };

  const handleChangeRole = async (nextRole: RoleFilter) => {
    setRoleFilter(nextRole);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("gc_selected_role", nextRole);
    }
    if (data?.accessMode === "local_demo") void fetch("/api/workspace/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activeRole: nextRole }),
    }).catch(() => {});
  };

  const handleChangeAccountIds = (ids: string[]) => {
    setSelectedAccountIds(ids);
  };

  const handleChangeProviders = (provs: CloudProviderId[]) => {
    setSelectedProviders(provs);
  };

  const handleChangeWindow = (w: TimeWindow) => {
    setTimeWindow(w);
  };

  const scopedSelection = data?.allAccounts.filter((account) =>
    (selectedAccountIds.length === 0 || selectedAccountIds.includes(account.id)) && selectedProviders.includes(account.provider)
  ) ?? [];
  const syncableAccounts = scopedSelection.filter((account) => account.canSync);
  const canSync = data?.accessMode === "scoped" ? syncableAccounts.length > 0 : scopedSelection.length > 0 && roleFilter !== "viewer";

  const handleBatchSync = async () => {
    if (!data?.allAccounts.length || !canSync) return;
    setSyncing(true);
    setSyncNotice(null);
    setError(null);
    try {
      if (data.accessMode === "scoped") {
        const outcomes = [];
        for (const account of syncableAccounts) {
          try {
            const res = await fetch("/api/cloud-accounts/" + encodeURIComponent(account.id) + "/sync", { method: "POST" });
            const result = await res.json();
            outcomes.push(account.name + " " + (res.ok ? result.status : result.error?.message ?? "failed"));
          } catch {
            outcomes.push(account.name + " failed");
          }
        }
        refreshDashboard();
        setSyncNotice(outcomes.join(" · "));
        return;
      }
      const targetIds = scopedSelection.map((account) => account.id);

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
      refreshDashboard();
      const results = json.results as Array<{ name: string; success: boolean; errors: string[] }>;
      setSyncNotice(results.map((result) => result.name + " " +
        (!result.success ? "failed" : result.errors.length ? "partially synced" : "synced")
      ).join(" · "));
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
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      const message = json?.error?.message ?? "Unable to save SCI settings.";
      setError(message);
      throw new Error(message);
    }
    refreshDashboard();
  };

  const handleExportJson = async () => {
    if (!data?.canExportBilling) return;
    try {
      let blob: Blob;
      let filename: string;
      if (data.accessMode === "scoped") {
        const params = new URLSearchParams({
          accountIds: selectedAccountIds.join(",") || "all",
          providers: selectedProviders.join(","),
          window: timeWindow,
        });
        const response = await fetch(`/api/dashboard/export?${params}`, { cache: "no-store" });
        if (!response.ok) {
          const result = await response.json().catch(() => null);
          throw new Error(result?.error?.message ?? "Unable to export billing data.");
        }
        blob = await response.blob();
        filename = "greencloud-billing.json";
      } else {
        blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        filename = `greencloud-multicloud-${timeWindow}-${new Date().toISOString().slice(0, 10)}.json`;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to export billing data.");
    }
  };

  const isReadOnly = data?.accessMode !== "local_demo" || roleFilter === "viewer";

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
      selectedAccountIds={selectedAccountIds.length ? selectedAccountIds : data?.allAccounts.map(({ id }) => id) ?? []}
      onChangeAccountIds={handleChangeAccountIds}
      selectedProviders={selectedProviders}
      onChangeProviders={handleChangeProviders}
      onSync={handleBatchSync}
      canSync={canSync}
      syncing={syncing}
      onExportJson={data?.canExportBilling ? handleExportJson : undefined}
      restrictMutations={data?.accessMode !== "local_demo"}
      onOpenKeysModal={() => setKeysModalOpen(true)}
      onOpenSettingsModal={() => setSettingsModalOpen(true)}
      onOpenFocusImport={() => setFocusModalOpen(true)}
      activeActionsCount={data?.recommendations.activeCount ?? 0}
    >
      {error && (
        <div className="mb-4 rounded-[20px] bg-[#FEE2E2] px-4 py-3 text-[13px] font-semibold text-[#991B1B]">
          {error}
          {needsSignIn && <Link href="/workspace-sign-in" className="ml-2 underline">Sign in</Link>}
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
              roleFilter={isReadOnly ? "viewer" : roleFilter}
              onRefresh={refreshDashboard}
            />
          )}
        </>
      ) : null}

      <AccountKeysModal
        account={data?.account ?? null}
        open={keysModalOpen}
        onClose={() => setKeysModalOpen(false)}
        onUpdated={refreshDashboard}
      />

      <FocusImportModal
        open={focusModalOpen}
        onClose={() => setFocusModalOpen(false)}
        onImported={() => {
          setSelectedAccountIds([]);
          refreshDashboard();
        }}
      />

      <WorkspaceSettingsModal
        open={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        monthlyBudget={data?.workspaceConfig.monthlyBudget ?? 150}
        functionalUnits={data?.workspaceConfig.functionalUnits ?? 100000}
        isReadOnly={isReadOnly}
        onSaved={refreshDashboard}
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
