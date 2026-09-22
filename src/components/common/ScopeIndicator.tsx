"use client";

interface ScopeIndicatorProps {
  accountName?: string;
  externalAccountId?: string;
  syncFreshness?: string | null;
  readOnly?: boolean;
}

export function ScopeIndicator({
  accountName = "Production AWS",
  externalAccountId = "793168138593",
  syncFreshness,
  readOnly = true,
}: ScopeIndicatorProps) {
  const formattedFreshness = syncFreshness
    ? `Synced ${new Date(syncFreshness).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : "Live 2m ago";

  return (
    <div className="bg-[#FAF6E8] border-y border-[#ECE5CC] py-2 px-4 sm:px-6 mb-8 text-xs font-mono">
      <div className="max-w-[1360px] mx-auto flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Active Scope */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFFDF4] border border-[#ECE5CC] text-[#2E2B1A] shadow-warm-sm">
            <span className="w-2 h-2 rounded-full bg-[#1F8A70]"></span>
            <span className="text-[#8D8975]">Scope:</span>
            <strong className="font-bold text-[#2E2B1A]">{accountName}</strong>
            <span className="text-[#8D8975] text-[10px]">({externalAccountId})</span>
          </div>
          <span className="hidden sm:inline text-[#DFD6B5]">•</span>
          <span className="hidden sm:inline text-[#686450]">
            Profile: <strong className="text-[#2E2B1A]">All Workloads & VPCs</strong>
          </span>
        </div>

        {/* Right: Security & Freshness Badges */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          {readOnly && (
            <span className="inline-flex items-center gap-1 text-[#1F8A70] bg-[#E2F5EF] px-2.5 py-0.5 rounded-full border border-[#1F8A70]/20 font-semibold text-[11px]">
              <span className="material-symbols-outlined text-[13px] leading-none">lock</span>
              Read-Only Mode
            </span>
          )}
          <span className="text-[#DFD6B5] hidden md:inline">|</span>
          <span className="text-[#686450] hidden md:inline">UTC-4 Live</span>
          <span className="text-[#DFD6B5] hidden md:inline">|</span>
          <span className="text-[#2E2B1A] font-semibold flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1F8A70] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1F8A70]"></span>
            </span>
            <span>{formattedFreshness}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
