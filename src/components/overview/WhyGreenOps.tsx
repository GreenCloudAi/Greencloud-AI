"use client";

export function WhyGreenOps() {
  const pillars = [
    {
      title: "Idle Servers Burn Real Power",
      tagline: "Energy physics in data centers",
      desc: "Physical servers in cloud data centers draw 50–70% of their peak electricity even when running at 0% CPU. Stopping an unused EC2 instance or deleting an orphaned EBS disk eliminates cloud bill costs and fossil-fuel grid emissions at the exact same moment.",
      metric: "50–70%",
      metricLabel: "Power drawn by idle servers",
      color: "text-[#9A6B00]",
      bg: "bg-[#FFF3D6]",
      border: "border-[#ECE5CC]",
      icon: "bolt",
    },
    {
      title: "Real Electricity & Energy Reduction",
      tagline: "Data center power & hardware efficiency",
      desc: "Cloud servers consume electricity directly from local power grids. Eliminating unused instances and rightsizing oversized databases immediately cuts the kilowatt-hours needed to power and cool data center racks.",
      metric: "Up to 40%",
      metricLabel: "Measured energy & carbon cut",
      color: "text-[#1F8A70]",
      bg: "bg-[#E2F5EF]",
      border: "border-[#ECE5CC]",
      icon: "eco",
    },
    {
      title: "Evidence-First Engineering Trust",
      tagline: "Never guess if an instance is safe to modify",
      desc: "Engineers ignore black-box alerts. GreenCloud AI presents 14-to-30-day CloudWatch telemetry trends, peak vs. average utilization metrics, and explicit risk scores so engineering teams approve changes with zero fear of breaking production.",
      metric: "100%",
      metricLabel: "Transparent evidence backed",
      color: "text-[#6C63B6]",
      bg: "bg-[#EFEBFC]",
      border: "border-[#ECE5CC]",
      icon: "fact_check",
    },
  ];

  return (
    <section id="why-greenops" className="mb-20 pt-6 scroll-mt-28">
      <div className="bg-[#FAF6E8] rounded-[24px] sm:rounded-[28px] border border-[#ECE5CC] p-6 sm:p-10 shadow-warm-sm">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFFDF4] border border-[#ECE5CC] mb-3 shadow-warm-sm">
            <span className="w-2 h-2 rounded-full bg-[#1F8A70]"></span>
            <span className="text-[11px] font-mono font-bold tracking-wider text-[#1F8A70] uppercase">
              WHY GREENOPS?
            </span>
          </div>
          <h2 className="text-[26px] sm:text-[34px] font-black text-[#2E2B1A] tracking-tight leading-tight mb-2">
            Why Cloud Cost & Carbon Belong Together
          </h2>
          <p className="text-[14px] sm:text-[15px] text-[#686450] leading-relaxed">
            Cloud efficiency is not just about dollars,every unneeded server burns real electricity and emits measurable greenhouse gases.
          </p>
        </div>

        {/* 3 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pillars.map((pillar) => (
            <div
              key={pillar.title}
              className="bg-[#FFFDF4] p-6 rounded-[22px] border border-[#ECE5CC] flex flex-col justify-between shadow-warm-sm hover:border-[#DFD6B5] transition-all hover:shadow-warm-md"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-10 h-10 rounded-2xl ${pillar.bg} ${pillar.color} flex items-center justify-center border border-[#ECE5CC]`}
                  >
                    <span className="material-symbols-outlined text-[20px] leading-none">
                      {pillar.icon}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-[#8D8975] uppercase">
                    {pillar.tagline}
                  </span>
                </div>
                <h3 className="text-[17px] font-bold text-[#2E2B1A] mb-2 leading-snug">
                  {pillar.title}
                </h3>
                <p className="text-[12.5px] text-[#686450] leading-relaxed mb-6">
                  {pillar.desc}
                </p>
              </div>

              <div className="pt-4 border-t border-[#ECE5CC] flex items-baseline justify-between">
                <div>
                  <div className={`text-[26px] font-black font-mono leading-none ${pillar.color} mb-1`}>
                    {pillar.metric}
                  </div>
                  <div className="text-[11px] font-medium text-[#686450]">
                    {pillar.metricLabel}
                  </div>
                </div>
                <span className="material-symbols-outlined text-[18px] text-[#8D8975]">
                  arrow_forward
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
