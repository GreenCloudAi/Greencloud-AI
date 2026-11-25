"use client";

export function WhyGreenOps() {
  const pillars = [
    {
      title: "Idle servers draw real power",
      desc: "Data center servers consume 50 to 70% of peak electricity even near zero utilization, so shutting down idle capacity cuts bills and emissions together.",
      metric: "50–70%",
      metricLabel: "Baseline power drawn when idle",
      toneBg: "bg-[#FBE7CB]",
      toneText: "text-[#6B4814]",
    },
    {
      title: "Direct energy reduction",
      desc: "Stopping unused instances and rightsizing oversized databases lowers the kilowatt-hours needed to power and cool cloud infrastructure.",
      metric: "Up to 40%",
      metricLabel: "Measurable energy and carbon reduction",
      toneBg: "bg-[#D7F0E4]",
      toneText: "text-[#155E4B]",
    },
    {
      title: "Evidence before action",
      desc: "Every finding pairs 14-to-30-day CloudWatch utilization history with explicit risk scoring so teams approve fixes with confidence.",
      metric: "100%",
      metricLabel: "Telemetry-backed recommendations",
      toneBg: "bg-[#FFF3A8]",
      toneText: "text-[#524305]",
    },
  ];

  return (
    <section id="why-greenops" className="scroll-mt-28">
      <div className="gc-rv bg-[#FAF6E8] rounded-[32px] p-6 sm:p-8 space-y-6 sm:space-y-7">
        <div className="gc-rv space-y-2 text-center lg:text-left">
          <h2 className="text-[28px] sm:text-[34px] font-bold text-[#2E2B1A] tracking-[-0.02em] leading-tight">
            Why cloud cost and carbon belong together
          </h2>
          <p className="text-[15.5px] text-[#686450] leading-relaxed max-w-3xl mx-auto lg:mx-0">
            Cloud waste drives both unnecessary spend and avoidable data center electricity use.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {pillars.map((pillar) => (
            <div
              key={pillar.title}
              className="gc-rv gc-rv-pop gc-card-hover bg-[#FFFDF4] p-6 rounded-[24px] flex flex-col justify-between gap-6"
            >
              <div className="space-y-2">
                <h3 className="text-[18px] font-bold text-[#2E2B1A] leading-snug">
                  {pillar.title}
                </h3>
                <p className="text-[14px] text-[#686450] leading-relaxed">
                  {pillar.desc}
                </p>
              </div>

              <div className={`p-4 rounded-2xl ${pillar.toneBg}`}>
                <div className={`text-[22px] lg:text-[26px] font-bold tabular-nums leading-none ${pillar.toneText}`}>
                  {pillar.metric}
                </div>
                <div className={`text-[12.5px] font-medium mt-1 ${pillar.toneText}`}>
                  {pillar.metricLabel}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
