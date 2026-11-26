"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Download,
  History,
  KeyRound,
  Menu,
  Plus,
  RefreshCw,
  Settings,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  CloudAccountSummary,
  CloudProviderId,
  DashboardTab,
  ROLE_META,
  RoleFilter,
  TimeWindow,
} from "./types";
import { MultiAccountScopePicker } from "./MultiAccountScopePicker";

interface DashboardShellProps {
  activeTab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  timeWindow: TimeWindow;
  onChangeTimeWindow: (w: TimeWindow) => void;
  roleFilter: RoleFilter;
  onChangeRoleFilter: (role: RoleFilter) => void;
  account: CloudAccountSummary | null;
  allAccounts: CloudAccountSummary[];
  selectedAccountIds: string[];
  onChangeAccountIds: (ids: string[]) => void;
  selectedProviders: CloudProviderId[];
  onChangeProviders: (providers: CloudProviderId[]) => void;
  onSync: () => void;
  canSync: boolean;
  syncing: boolean;
  onExportJson?: () => void;
  restrictMutations: boolean;
  onOpenKeysModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenFocusImport: () => void;
  activeActionsCount: number;
  children: React.ReactNode;
}

const RAIL_TABS: Array<{
  id: DashboardTab;
  label: string;
  icon: string;
  subtitle: string;
}> = [
  { id: "overview", label: "Overview", icon: "grid_view", subtitle: "Role workspace" },
  { id: "costs", label: "Costs", icon: "payments", subtitle: "Spend & budgets" },
  { id: "carbon", label: "Carbon", icon: "eco", subtitle: "Grid & SCI" },
  { id: "resources", label: "Resources", icon: "dns", subtitle: "Compute & storage" },
  { id: "actions", label: "Actions", icon: "tune", subtitle: "Terraform fixes" },
];

export function DashboardShell({
  activeTab,
  onSelectTab,
  timeWindow,
  onChangeTimeWindow,
  roleFilter,
  onChangeRoleFilter,
  account,
  allAccounts,
  selectedAccountIds,
  onChangeAccountIds,
  selectedProviders,
  onChangeProviders,
  onSync,
  canSync,
  syncing,
  onExportJson,
  restrictMutations,
  onOpenKeysModal,
  onOpenSettingsModal,
  onOpenFocusImport,
  activeActionsCount,
  children,
}: DashboardShellProps) {
  const [mobileRailOpen, setMobileRailOpen] = useState(false);

  const currentTabMeta = RAIL_TABS.find((t) => t.id === activeTab) ?? RAIL_TABS[0];
  const isReadOnly = restrictMutations || roleFilter === "viewer";

  const renderRailContent = (compactMobile = false) => (
    <div className="flex flex-col h-full justify-between gap-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <Link href="/" prefetch={true} className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-2xl bg-[#FFF76A] flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105">
              <img src="/icons/eco-leaf.svg" alt="GreenCloud AI" className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[15.5px] font-extrabold tracking-tight text-[#2E2B1A] leading-none">
                GreenCloud AI
              </div>
              <div className="text-[11px] font-semibold text-[#8D8975] mt-1">
                {ROLE_META[roleFilter].label}
              </div>
            </div>
          </Link>

          {compactMobile && (
            <button
              type="button"
              onClick={() => setMobileRailOpen(false)}
              aria-label="Close navigation"
              className="w-9 h-9 rounded-full bg-[#FFFDF4] flex items-center justify-center text-[#2E2B1A]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 5 Focused Workspace Tabs */}
        <nav aria-label="Dashboard sections" className="space-y-1.5">
          {RAIL_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  onSelectTab(tab.id);
                  if (compactMobile) setMobileRailOpen(false);
                }}
                aria-current={isActive ? "page" : undefined}
                className={`w-full cursor-pointer rounded-[18px] px-3.5 py-2.5 text-left transition-all duration-150 flex items-center justify-between gap-2.5 active:scale-[0.99] ${
                  isActive
                    ? "bg-[#155E4B] text-[#FFFDF4] shadow-warm-sm"
                    : "text-[#2E2B1A] hover:bg-[#F5EED6]"
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`material-symbols-outlined icon-filled text-[20px] shrink-0 ${
                      isActive ? "text-[#FFF76A]" : "text-[#686450]"
                    }`}
                  >
                    {tab.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-bold leading-tight">
                      {tab.label}
                    </span>
                    <span
                      className={`block text-[11px] leading-tight mt-0.5 ${
                        isActive ? "text-[#E2F5EF]/80" : "text-[#8D8975]"
                      }`}
                    >
                      {tab.subtitle}
                    </span>
                  </span>
                </span>

                {tab.id === "actions" && activeActionsCount > 0 && (
                  <span
                    className={`min-w-[22px] h-[22px] px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center tabular-nums ${
                      isActive
                        ? "bg-[#FFF76A] text-[#2E2B1A]"
                        : "bg-[#FFF3A8] text-[#2E2B1A]"
                    }`}
                  >
                    {activeActionsCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Platform Utility Links */}
        <div className="pt-2 space-y-1">
          <div className="px-3.5 pb-1 text-[11px] font-bold text-[#8D8975]">
            Platform
          </div>
          {!isReadOnly && (
            <button
              type="button"
              onClick={() => {
                if (compactMobile) setMobileRailOpen(false);
                onOpenSettingsModal();
              }}
              className="w-full cursor-pointer flex items-center gap-2.5 rounded-[14px] px-3.5 py-2 text-[13px] font-semibold text-[#686450] hover:bg-[#F5EED6] hover:text-[#2E2B1A] transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4 shrink-0" />
              <span>Budget & SCI Config</span>
            </button>
          )}
          {!restrictMutations && <Link
            href="/audit-history"
            prefetch={true}
            className="flex items-center gap-2.5 rounded-[14px] px-3.5 py-2 text-[13px] font-semibold text-[#686450] hover:bg-[#F5EED6] hover:text-[#2E2B1A] transition-colors"
          >
            <History className="w-4 h-4 shrink-0" />
            <span>Audit History</span>
          </Link>}
          {!isReadOnly && (
            <Link
              href="/onboarding"
              prefetch={true}
              className="flex items-center gap-2.5 rounded-[14px] px-3.5 py-2 text-[13px] font-semibold text-[#686450] hover:bg-[#F5EED6] hover:text-[#2E2B1A] transition-colors"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Connect Account</span>
            </Link>
          )}
          <Link
            href="/docs"
            prefetch={true}
            className="flex items-center gap-2.5 rounded-[14px] px-3.5 py-2 text-[13px] font-semibold text-[#686450] hover:bg-[#F5EED6] hover:text-[#2E2B1A] transition-colors"
          >
            <Settings className="w-4 h-4 shrink-0" />
            <span>Setup Docs</span>
          </Link>
        </div>
      </div>

      {/* Bottom Connected Account Card */}
      <div className="rounded-[20px] bg-[#FFFDF4] p-3.5 space-y-2.5">
        {account ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={
                    account.provider === "gcp"
                      ? "/icons/gcp.svg"
                      : account.provider === "azure"
                      ? "/icons/azure.svg"
                      : "/icons/aws-dark.svg"
                  }
                  alt={account.provider}
                  className="h-5 w-auto object-contain shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-[13px] font-bold text-[#2E2B1A] truncate">
                    {account.name}
                  </div>
                  <div className="text-[11px] text-[#8D8975] code-font truncate">
                    {account.externalAccountId}
                  </div>
                </div>
              </div>
              {allAccounts.length > 1 && (
                <span className="text-[11px] font-bold text-[#155E4B] tabular-nums shrink-0">
                  +{allAccounts.length - 1}
                </span>
              )}
            </div>
            {!isReadOnly && (
              <button
                type="button"
                onClick={onOpenKeysModal}
                className="w-full cursor-pointer rounded-xl bg-[#FAF6E8] hover:bg-[#F5EED6] px-3 py-1.5 text-[12px] font-semibold text-[#2E2B1A] flex items-center justify-center gap-1.5 transition-colors"
              >
                <KeyRound className="w-3.5 h-3.5 text-[#686450]" />
                <span>Manage keys & role</span>
              </button>
            )}
          </>
        ) : (
          <div className="space-y-2">
            <div className="text-[12.5px] font-bold text-[#2E2B1A]">
              {allAccounts.length ? "No accounts match this selection" : "No cloud account linked"}
            </div>
            {!isReadOnly && allAccounts.length === 0 && <Link
              href="/onboarding"
              prefetch={true}
              className="m3-btn m3-btn-compact m3-pastel-sun w-full text-[12px]"
            >
              Connect Cloud
            </Link>}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FFFDF4] text-[#2E2B1A] flex flex-col lg:flex-row selection:bg-[#FFF76A] selection:text-[#2E2B1A]">
      {/* Desktop Left Rail */}
      <aside className="hidden lg:flex w-[248px] shrink-0 bg-[#FAF6E8] p-4 sticky top-0 h-screen overflow-y-auto flex-col">
        {renderRailContent(false)}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileRailOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden bg-[#2E2B1A]/35 backdrop-blur-sm flex"
          onClick={() => setMobileRailOpen(false)}
        >
          <div
            className="w-[272px] max-w-[85vw] h-full bg-[#FAF6E8] p-4 shadow-warm-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {renderRailContent(true)}
          </div>
        </div>
      )}

      {/* Main Content Area + Slim Top Control Bar */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-[#FFFDF4]/90 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="max-w-[1280px] mx-auto flex flex-wrap items-center justify-between gap-3">
            {/* Left: Mobile Menu + Tab Title */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileRailOpen(true)}
                aria-label="Open menu"
                className="lg:hidden w-9 h-9 rounded-full bg-[#FAF6E8] flex items-center justify-center text-[#2E2B1A]"
              >
                <Menu className="w-4 h-4" />
              </button>

              <div className="min-w-0">
                <h1 className="text-[20px] sm:text-[22px] font-extrabold tracking-[-0.02em] text-[#2E2B1A] truncate">
                  {currentTabMeta.label}
                </h1>
                <p className="text-[12.5px] text-[#686450] hidden sm:block">
                  {ROLE_META[roleFilter].summary}
                </p>
              </div>
            </div>

            {/* Right: Multi-Account/Provider Picker, Role Switcher, Time Window, Export, Batch Sync */}
            <div className="flex flex-wrap items-center gap-2">
              <MultiAccountScopePicker
                allAccounts={allAccounts}
                selectedAccountIds={selectedAccountIds}
                onChangeAccountIds={onChangeAccountIds}
                selectedProviders={selectedProviders}
                onChangeProviders={onChangeProviders}
                onOpenFocusImport={onOpenFocusImport}
                isReadOnly={isReadOnly}
              />

              <select
                aria-label="Role dashboard view"
                value={roleFilter}
                onChange={(e) => onChangeRoleFilter(e.target.value as RoleFilter)}
                className="rounded-full bg-[#FAF6E8] px-3.5 py-2 text-[12.5px] font-semibold text-[#2E2B1A] focus:outline-none cursor-pointer"
              >
                <option value="admin">Role: Workspace Admin</option>
                <option value="finops">Role: FinOps Engineer</option>
                <option value="devops">Role: DevOps Engineer</option>
                <option value="architect">Role: Solutions Architect</option>
                <option value="sustainability">Role: Sustainability Lead</option>
                <option value="viewer">Role: Read-Only Viewer</option>
              </select>

              <div className="m3-connected-h bg-[#FAF6E8] p-1 rounded-full">
                {(["7d", "30d", "90d"] as TimeWindow[]).map((w) => {
                  const selected = timeWindow === w;
                  return (
                    <button
                      key={w}
                      type="button"
                      data-selected={selected ? "true" : "false"}
                      onClick={() => onChangeTimeWindow(w)}
                      className={`m3-seg uppercase text-[11.5px] min-h-[30px] px-2.5 ${
                        selected
                          ? "bg-[#FFF76A] text-[#2E2B1A]"
                          : "bg-transparent text-[#686450] hover:text-[#2E2B1A]"
                      }`}
                    >
                      {w}
                    </button>
                  );
                })}
              </div>

              {onExportJson && <button
                type="button"
                onClick={onExportJson}
                className="m3-btn m3-btn-compact m3-pastel-oat text-[12.5px]"
                title="Download JSON telemetry snapshot"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export</span>
              </button>}

              {allAccounts.length > 0 && canSync && (
                <button
                  type="button"
                  onClick={onSync}
                  disabled={syncing}
                  className="m3-btn m3-btn-compact m3-pastel-sun text-[12.5px]"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
                  <span>
                    {syncing
                      ? "Syncing..."
                      : !restrictMutations && selectedAccountIds.length > 1
                      ? `Sync (${selectedAccountIds.length})`
                      : "Sync"}
                  </span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Main Workspace Canvas */}
        <main className="flex-1 max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-3">
          {children}
        </main>
      </div>
    </div>
  );
}
