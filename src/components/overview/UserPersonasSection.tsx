"use client";

export function UserPersonasSection() {
  const personas = [
    {
      role: "FinOps engineers",
      headline: "Spend visibility and commitment planning",
      desc: "Track account-level billing anomalies and simulate savings opportunities before month-end.",
    },
    {
      role: "DevOps and platform teams",
      headline: "Reviewable Terraform changes",
      desc: "Turn telemetry findings into safe pull requests and maintenance-window runbooks without manual busywork.",
    },
    {
      role: "Product engineers",
      headline: "Right-sizing with usage proof",
      desc: "Inspect 14-to-30-day CPU, memory, and IOPS baselines before resizing shared instances or databases.",
    },
    {
      role: "Sustainability and leadership",
      headline: "Audit-ready emissions reporting",
      desc: "Export consistent monthly cost savings and energy-based carbon reports across cloud workloads.",
    },
  ];

  return (
    <section id="personas" className="scroll-mt-28 space-y-6 sm:space-y-7">
      <div className="gc-rv space-y-2 text-center lg:text-left">
        <h2 className="text-[28px] sm:text-[34px] font-bold tracking-[-0.02em] text-[#2E2B1A] leading-tight">
          Built for finance, engineering, and sustainability
        </h2>
        <p className="text-[15.5px] text-[#686450] leading-relaxed max-w-3xl mx-auto lg:mx-0">
          One shared workspace so finance and engineering teams work from the same usage numbers.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {personas.map((persona) => (
          <div
            key={persona.role}
            className="gc-rv gc-rv-pop gc-card-hover p-6 rounded-[24px] bg-[#FBF6E3] space-y-3"
          >
            <div>
              <h3 className="text-[17px] font-bold text-[#2E2B1A]">
                {persona.role}
              </h3>
              <div className="text-[13px] font-medium text-[#686450] mt-0.5">
                {persona.headline}
              </div>
            </div>
            <p className="text-[13.5px] text-[#686450] leading-relaxed">
              {persona.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
