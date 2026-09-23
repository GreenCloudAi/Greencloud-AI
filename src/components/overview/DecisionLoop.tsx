"use client";

export function DecisionLoop() {
  const steps = [
    {
      num: "01",
      title: "Connect Safely",
      headline: "100% Read-Only IAM Role",
      desc: "Connect your AWS account in under 2 minutes using AWS STS AssumeRole with an External ID. GreenCloud AI operates with strictly read-only permissions—zero static credentials or secret keys are ever stored.",
      icon: "lock",
      iconBg: "bg-[#FFF3D6]",
      iconColor: "text-[#9A6B00]",
      specs: ["STS AssumeRole", "External ID Protection", "Zero Write Access"],
    },
    {
      num: "02",
      title: "Detect Cloud Waste",
      headline: "Telemetry & Billing Ingestion",
      desc: "Ingests CloudWatch utilization metrics (CPU, memory, disk IOPS) and Cost Explorer billing lines. The engine computes 14-to-30-day statistical baselines to identify idle virtual machines, oversized databases, and abandoned storage.",
      icon: "query_stats",
      iconBg: "bg-[#E2F5EF]",
      iconColor: "text-[#1F8A70]",
      specs: ["CloudWatch Metrics", "P95 Utilization", "Billing Line Ingestion"],
    },
    {
      num: "03",
      title: "Score & Prioritize",
      headline: "Cost ROI & Carbon Impact",
      desc: "Maps resource waste to local power grid emissions. Every opportunity is ranked by monthly dollar savings, carbon reduction, and low-risk safety confidence.",
      icon: "psychology",
      iconBg: "bg-[#EFEBFC]",
      iconColor: "text-[#6C63B6]",
      specs: ["Cost Explorer Data", "Grid Carbon Intensity", "Safety Scoring"],
    },
    {
      num: "04",
      title: "Safe Review & Apply",
      headline: "Terraform PRs & Jira Sync",
      desc: "Zero unexpected changes. Approved recommendations generate production-ready GitHub Pull Requests with Terraform changes or Jira tickets for engineering sign-off.",
      icon: "verified",
      iconBg: "bg-[#EDF4EA]",
      iconColor: "text-[#7C9A6D]",
      specs: ["Terraform PR Generator", "Jira Issue Sync", "Complete Audit Trail"],
    },
  ];

  return (
    <section id="how-it-works" className="mb-20 pt-6 scroll-mt-28">
      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FBF6E3] border border-[#ECE5CC] mb-3 shadow-warm-sm">
          <span className="w-2 h-2 rounded-full bg-[#1F8A70]"></span>
          <span className="text-[11px] font-mono font-bold tracking-wider text-[#9A6B00] uppercase">
            OPTIMIZATION LIFECYCLE
          </span>
        </div>
        <h2 className="text-[28px] sm:text-[36px] font-black tracking-tight text-[#2E2B1A] leading-tight mb-3">
          How GreenCloud AI Works
        </h2>
        <p className="text-[15px] sm:text-[16px] text-[#686450] leading-relaxed">
          A four-step lifecycle built on least-privilege cloud security, transparent telemetry evidence, and human-in-the-loop control.
        </p>
      </div>

      {/* 4-Step Architecture Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {steps.map((step) => (
          <div
            key={step.num}
            className="p-6 rounded-[22px] bg-[#FFFDF4] border border-[#ECE5CC] hover:border-[#DFD6B5] transition-all shadow-warm-sm flex flex-col justify-between group hover:shadow-warm-md"
          >
            <div>
              {/* Step Counter & Icon */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-[12px] font-mono font-extrabold text-[#8D8975] bg-[#FAF6E8] px-2.5 py-1 rounded-full border border-[#ECE5CC]">
                  STEP {step.num}
                </span>
                <div
                  className={`w-10 h-10 rounded-2xl ${step.iconBg} ${step.iconColor} flex items-center justify-center border border-[#ECE5CC] group-hover:scale-105 transition-transform`}
                >
                  <span className="material-symbols-outlined text-[20px] leading-none">
                    {step.icon}
                  </span>
                </div>
              </div>

              {/* Title & Headline */}
              <h3 className="text-[17px] font-bold text-[#2E2B1A] mb-1">
                {step.title}
              </h3>
              <div className="text-[12px] font-semibold text-[#9A6B00] mb-3">
                {step.headline}
              </div>

              {/* Description */}
              <p className="text-[12.5px] text-[#686450] leading-relaxed mb-6">
                {step.desc}
              </p>
            </div>

            {/* Technical Specs Tags */}
            <div className="pt-3.5 border-t border-[#ECE5CC]">
              <div className="flex flex-wrap gap-1.5">
                {step.specs.map((spec) => (
                  <span
                    key={spec}
                    className="text-[10px] font-mono text-[#686450] bg-[#FAF6E8] border border-[#ECE5CC] px-2 py-0.5 rounded-md"
                  >
                    {spec}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
