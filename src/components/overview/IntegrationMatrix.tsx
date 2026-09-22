"use client";

import Link from "next/link";

export function IntegrationMatrix() {
  return (
    <section className="mb-20 pt-6" id="integrations">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FBF6E3] border border-[#ECE5CC] mb-3 shadow-warm-sm">
            <span className="text-[11px] font-mono font-bold tracking-wider text-[#9A6B00] uppercase">
              DIRECT TELEMETRY INGESTION
            </span>
          </div>
          <h2 className="text-[30px] sm:text-[36px] font-black tracking-[-0.02em] text-[#2E2B1A]">
            Infrastructure Integration Matrix
          </h2>
          <p className="text-[14.5px] sm:text-[15px] text-[#686450] mt-1 max-w-[620px]">
            Zero agents required. Direct ingestion via native cloud provider billing, telemetry, and carbon APIs.
          </p>
        </div>
        <div className="text-[11.5px] font-mono text-[#8D8975] bg-[#FBF6E3] border border-[#ECE5CC] px-3.5 py-1.5 rounded-full shadow-warm-sm self-start md:self-auto">
          Architecture: Multi-Cloud API Ingestion
        </div>
      </div>

      {/* 3 Provider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. AWS (Available) */}
        <div className="bg-[#FFFDF4] rounded-[24px] border-2 border-[#FFF76A] p-6 sm:p-7 shadow-warm-md flex flex-col justify-between ring-1 ring-[#DFD6B5]">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="w-12 h-12 rounded-2xl bg-[#FFF76A] flex items-center justify-center text-[#2E2B1A] border border-[#DFD6B5] shadow-warm-sm">
                <span className="material-symbols-outlined text-[26px]">dns</span>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF76A] text-[#2E2B1A] text-[11px] font-mono font-bold tracking-wide border border-[#DFD6B5]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1F8A70] animate-pulse"></span>
                AVAILABLE
              </span>
            </div>
            <h3 className="text-[20px] font-bold text-[#2E2B1A] mb-1">Amazon Web Services</h3>
            <p className="text-[13px] text-[#686450] mb-6 leading-relaxed">
              Full billing, resource telemetry, and carbon footprint telemetry sync.
            </p>
            <div className="space-y-2.5 mb-8 text-[12.5px] font-mono">
              <div className="flex items-center gap-2.5 text-[#2E2B1A]">
                <span className="material-symbols-outlined text-[#1F8A70] text-[18px]">check_circle</span>
                <span>AWS Cost Explorer & CUR 2.0</span>
              </div>
              <div className="flex items-center gap-2.5 text-[#2E2B1A]">
                <span className="material-symbols-outlined text-[#1F8A70] text-[18px]">check_circle</span>
                <span>CloudWatch Metrics & Traces</span>
              </div>
              <div className="flex items-center gap-2.5 text-[#2E2B1A]">
                <span className="material-symbols-outlined text-[#1F8A70] text-[18px]">check_circle</span>
                <span>Cross-Account Read-Only STS</span>
              </div>
            </div>
          </div>
          <Link
            href="/onboarding"
            className="w-full py-3 rounded-full bg-[#FFF76A] hover:bg-[#F5EC50] text-[#2E2B1A] font-bold text-[14px] flex items-center justify-center gap-2 border border-[#DFD6B5] shadow-sm hover:shadow-sunshine-glow transition-all"
          >
            <span>Connect AWS Account</span>
            <span className="material-symbols-outlined text-[16px] leading-none">arrow_forward</span>
          </Link>
        </div>

        {/* 2. Microsoft Azure (Coming Soon) */}
        <div className="bg-[#FBF6E3]/50 rounded-[24px] border border-[#ECE5CC] p-6 sm:p-7 flex flex-col justify-between opacity-90 hover:opacity-100 transition-opacity">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="w-12 h-12 rounded-2xl bg-[#FFFDF4] border border-[#ECE5CC] flex items-center justify-center text-[#8D8975]">
                <span className="material-symbols-outlined text-[26px]">grid_view</span>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#FFFDF4] text-[#8D8975] text-[11px] font-mono font-semibold border border-[#ECE5CC]">
                COMING SOON
              </span>
            </div>
            <h3 className="text-[20px] font-bold text-[#2E2B1A] mb-1">Microsoft Azure</h3>
            <p className="text-[13px] text-[#686450] mb-6 leading-relaxed">
              Enterprise agreement cost management and emissions impact dashboard.
            </p>
            <div className="space-y-2.5 mb-8 text-[12.5px] font-mono text-[#8D8975]">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px]">schedule</span>
                <span>Cost Management Exports (Blob)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px]">schedule</span>
                <span>Azure Monitor Telemetry</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px]">schedule</span>
                <span>Emissions Impact Dashboard API</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="w-full py-3 rounded-full bg-[#FFFDF4] border border-[#ECE5CC] text-[#8D8975] font-semibold text-[13.5px] flex items-center justify-center gap-1.5 cursor-not-allowed"
            disabled
          >
            <span>Roadmap Integration</span>
            <span className="material-symbols-outlined text-[15px] leading-none">lock</span>
          </button>
        </div>

        {/* 3. Google Cloud Platform (Coming Soon) */}
        <div className="bg-[#FBF6E3]/50 rounded-[24px] border border-[#ECE5CC] p-6 sm:p-7 flex flex-col justify-between opacity-90 hover:opacity-100 transition-opacity">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="w-12 h-12 rounded-2xl bg-[#FFFDF4] border border-[#ECE5CC] flex items-center justify-center text-[#8D8975]">
                <span className="material-symbols-outlined text-[26px]">hub</span>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#FFFDF4] text-[#8D8975] text-[11px] font-mono font-semibold border border-[#ECE5CC]">
                COMING SOON
              </span>
            </div>
            <h3 className="text-[20px] font-bold text-[#2E2B1A] mb-1">Google Cloud Platform</h3>
            <p className="text-[13px] text-[#686450] mb-6 leading-relaxed">
              BigQuery billing export and regional carbon footprint indexing.
            </p>
            <div className="space-y-2.5 mb-8 text-[12.5px] font-mono text-[#8D8975]">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px]">schedule</span>
                <span>BigQuery Detailed Billing Export</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px]">schedule</span>
                <span>Google Cloud Monitoring</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px]">schedule</span>
                <span>Carbon Footprint API</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="w-full py-3 rounded-full bg-[#FFFDF4] border border-[#ECE5CC] text-[#8D8975] font-semibold text-[13.5px] flex items-center justify-center gap-1.5 cursor-not-allowed"
            disabled
          >
            <span>Roadmap Integration</span>
            <span className="material-symbols-outlined text-[15px] leading-none">lock</span>
          </button>
        </div>
      </div>
    </section>
  );
}
