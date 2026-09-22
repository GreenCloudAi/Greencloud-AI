"use client";

export function UserPersonasSection() {
  const personas = [
    {
      role: "FinOps Engineers",
      headline: "Cost Allocation & Anomaly Control",
      goal: "Eliminate unexpected month-end cloud bill spikes and allocate spend accurately.",
      features: [
        "Automated multi-account billing normalization",
        "Cost anomaly detection with root-cause traces",
        "Commitment simulation (RI / Savings Plans)",
      ],
      icon: "account_balance_wallet",
      iconBg: "bg-[#FFF3D6]",
      iconColor: "text-[#9A6B00]",
    },
    {
      role: "DevOps & Platform Teams",
      headline: "Automated PRs & Safe Guardrails",
      goal: "Implement optimizations with zero manual busywork and zero production risk.",
      features: [
        "Auto-generated Terraform & OpenTofu PRs",
        "Jira & GitHub ticket sync",
        "Safe dry-run checks before any execution",
      ],
      icon: "terminal",
      iconBg: "bg-[#E2F5EF]",
      iconColor: "text-[#1F8A70]",
    },
    {
      role: "Developers",
      headline: "Evidence-Backed Trust",
      goal: "Understand resource utilization without disrupting active feature development.",
      features: [
        "14-to-30-day CloudWatch telemetry graphs",
        "Peak vs. average resource comparisons",
        "Pre-deployment cost & carbon impact alerts",
      ],
      icon: "code",
      iconBg: "bg-[#EFEBFC]",
      iconColor: "text-[#6C63B6]",
    },
    {
      role: "Executives & Sustainability",
      headline: "Audit-Ready ESG Carbon Accounting",
      goal: "Track and report measurable emissions reductions for corporate compliance.",
      features: [
        "Accurate data center power and emissions tracking",
        "Green software efficiency score tracking",
        "Exportable PDF/CSV reports for stakeholders",
      ],
      icon: "public",
      iconBg: "bg-[#EDF4EA]",
      iconColor: "text-[#7C9A6D]",
    },
  ];

  return (
    <section id="personas" className="mb-20 pt-6">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FBF6E3] border border-[#ECE5CC] mb-3 shadow-warm-sm">
          <span className="w-2 h-2 rounded-full bg-[#1F8A70]"></span>
          <span className="text-[11px] font-mono font-bold tracking-wider text-[#9A6B00] uppercase">
            WHO USES GREENCLOUD AI
          </span>
        </div>
        <h2 className="text-[28px] sm:text-[36px] font-black tracking-tight text-[#2E2B1A] leading-tight mb-3">
          Built for Cross-Functional Cloud Teams
        </h2>
        <p className="text-[15px] sm:text-[16px] text-[#686450] leading-relaxed">
          Unifying finance, engineering, and sustainability on a single evidence-backed optimization control plane.
        </p>
      </div>

      {/* 4 Personas Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {personas.map((persona) => (
          <div
            key={persona.role}
            className="p-6 rounded-[22px] bg-[#FFFDF4] border border-[#ECE5CC] hover:border-[#DFD6B5] transition-all shadow-warm-sm flex flex-col justify-between group hover:shadow-warm-md"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`w-10 h-10 rounded-2xl ${persona.iconBg} ${persona.iconColor} flex items-center justify-center border border-[#ECE5CC] group-hover:scale-105 transition-transform`}
                >
                  <span className="material-symbols-outlined text-[20px] leading-none">
                    {persona.icon}
                  </span>
                </div>
                <span className="text-[11px] font-mono font-bold text-[#8D8975] uppercase">
                  Persona
                </span>
              </div>

              <h3 className="text-[17px] font-bold text-[#2E2B1A] mb-1">
                {persona.role}
              </h3>
              <div className="text-[12px] font-semibold text-[#9A6B00] mb-3">
                {persona.headline}
              </div>
              <p className="text-[12.5px] text-[#686450] leading-relaxed mb-5">
                {persona.goal}
              </p>
            </div>

            <div className="pt-3.5 border-t border-[#ECE5CC]">
              <div className="text-[11px] font-bold font-mono text-[#8D8975] uppercase tracking-wider mb-2">
                Key Capabilities:
              </div>
              <ul className="space-y-1.5 text-[11.5px] text-[#686450]">
                {persona.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-1.5">
                    <span className="material-symbols-outlined text-[14px] text-[#1F8A70] shrink-0 mt-0.5">
                      check_circle
                    </span>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
