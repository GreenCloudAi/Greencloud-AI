"use client";

interface ExecutiveKpiBarProps {
  cloudSpend?: number;
  potentialSavings?: number;
  carbonFootprint?: number;
  opportunityCount?: number;
  highConfidenceCount?: number;
}

export function ExecutiveKpiBar({
  cloudSpend,
  potentialSavings,
  carbonFootprint,
  opportunityCount,
  highConfidenceCount,
}: ExecutiveKpiBarProps) {
  return (
    <div className="mb-14">
      <div className="text-center max-w-2xl mx-auto mb-8">
        <span className="text-[11px] font-mono font-bold text-[#9A6B00] uppercase tracking-wider block mb-1.5">
          TYPICAL CLOUD WASTE & MEASURABLE IMPACT
        </span>
        <h2 className="text-[24px] sm:text-[28px] font-black text-[#2E2B1A] tracking-tight">
          Why Cloud Optimization Matters
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* 1. Average Cloud Waste */}
        <div className="bg-[#FFFDF4] p-6 sm:p-7 rounded-[22px] border border-[#ECE5CC] hover:border-[#DFD6B5] transition-all flex flex-col justify-between shadow-warm-sm group hover:shadow-warm-md">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11.5px] font-bold text-[#686450] uppercase tracking-wider font-mono">
              Average Cloud Waste
            </span>
            <span className="w-9 h-9 rounded-xl bg-[#FFF3D6] text-[#9A6B00] flex items-center justify-center border border-[#ECE5CC] shrink-0">
              <span className="material-symbols-outlined text-[19px] leading-none">delete_sweep</span>
            </span>
          </div>
          <div>
            <div className="text-[32px] sm:text-[34px] font-black text-[#9A6B00] font-mono tracking-tight leading-none mb-2.5">
              35–45%
            </div>
            <div className="text-[12.5px] text-[#686450] leading-relaxed">
              Wasted on idle VMs, oversized databases & forgotten disks
            </div>
          </div>
        </div>

        {/* 2. Recoverable Cloud Spend (Spotlight Card) */}
        <div className="bg-[#FFFDF4] p-6 sm:p-7 rounded-[22px] border-2 border-[#FFF76A] shadow-warm-sm flex flex-col justify-between relative overflow-hidden ring-1 ring-[#DFD6B5] hover:shadow-sunshine-glow transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11.5px] font-bold text-[#2E2B1A] uppercase tracking-wider font-mono">
              Potential Savings
            </span>
            <span className="text-[10px] font-bold font-mono tracking-wider bg-[#FFF76A] text-[#2E2B1A] px-2.5 py-0.5 rounded-full border border-[#DFD6B5] uppercase">
              RECOVERABLE
            </span>
          </div>
          <div>
            <div className="text-[32px] sm:text-[34px] font-black text-[#2E2B1A] font-mono tracking-tight leading-none mb-2.5">
              $4,250+
              <span className="text-[14px] font-normal text-[#686450]">/mo</span>
            </div>
            <div className="text-[12.5px] text-[#7C9A6D] font-medium leading-relaxed flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] leading-none">savings</span>
              <span>Identified in typical multi-workload accounts</span>
            </div>
          </div>
        </div>

        {/* 3. Carbon Emissions Cut */}
        <div className="bg-[#FFFDF4] p-6 sm:p-7 rounded-[22px] border border-[#ECE5CC] hover:border-[#DFD6B5] transition-all flex flex-col justify-between shadow-warm-sm group hover:shadow-warm-md">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11.5px] font-bold text-[#686450] uppercase tracking-wider font-mono">
              Carbon Footprint Cut
            </span>
            <span className="w-9 h-9 rounded-xl bg-[#E2F5EF] text-[#1F8A70] flex items-center justify-center border border-[#ECE5CC] shrink-0">
              <span className="material-symbols-outlined text-[19px] leading-none">co2</span>
            </span>
          </div>
          <div>
            <div className="text-[32px] sm:text-[34px] font-black text-[#1F8A70] font-mono tracking-tight leading-none mb-2.5">
              30–40%
            </div>
            <div className="text-[12.5px] text-[#686450] leading-relaxed">
              Idle servers draw 50–70% power even at 0% CPU utilization
            </div>
          </div>
        </div>

        {/* 4. Safe Remediation Guarantee */}
        <div className="bg-[#FFFDF4] p-6 sm:p-7 rounded-[22px] border border-[#ECE5CC] hover:border-[#DFD6B5] transition-all flex flex-col justify-between shadow-warm-sm group hover:shadow-warm-md">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11.5px] font-bold text-[#686450] uppercase tracking-wider font-mono">
              Safe Engineering
            </span>
            <span className="w-9 h-9 rounded-xl bg-[#EFEBFC] text-[#6C63B6] flex items-center justify-center border border-[#ECE5CC] shrink-0">
              <span className="material-symbols-outlined text-[19px] leading-none">verified_user</span>
            </span>
          </div>
          <div>
            <div className="text-[32px] sm:text-[34px] font-black text-[#6C63B6] font-mono tracking-tight leading-none mb-2.5">
              100%
            </div>
            <div className="text-[12.5px] text-[#686450] leading-relaxed">
              Human-approved via Terraform PRs & Jira tickets
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
