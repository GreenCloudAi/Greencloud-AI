"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  CountUpNumber,
  HeroShapeMorph,
} from "@/components/overview/MotionPrimitives";
import {
  ChartRange,
  SpendCarbonChart,
  useHeroTelemetryDatasets,
} from "@/components/overview/SpendCarbonChart";

const CLOUD_ICONS = [
  { src: "/icons/aws.svg", alt: "AWS", className: "h-[30px] w-auto" },
  { src: "/icons/gcp.svg", alt: "Google Cloud", className: "h-[34px] w-auto" },
  { src: "/icons/azure.svg", alt: "Microsoft Azure", className: "h-[30px] w-auto" },
] as const;

const CAROUSEL_CLOUDS = [
  {
    id: "gcp",
    name: "Google Cloud",
    status: "BigQuery & Carbon · Next",
    src: "/icons/gcp.svg",
    iconClass: "h-[26px] w-auto",
    bgClass: "text-[#FBE7CB]",
  },
  {
    id: "aws",
    name: "Amazon Web Services",
    status: "Billing & CloudWatch · Live",
    src: "/icons/aws-dark.svg",
    iconClass: "h-[20px] w-auto mt-0.5",
    bgClass: "text-[#FFF3A8]",
  },
  {
    id: "azure",
    name: "Microsoft Azure",
    status: "Cost & Monitor · Next",
    src: "/icons/azure.svg",
    iconClass: "h-[24px] w-auto",
    bgClass: "text-[#D7F0E4]",
  },
] as const;

const SEQUENCE_REPEATS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

function CloudShapesCarousel() {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let intervalId: number | undefined;
    const initialTimeoutId = window.setTimeout(() => {
      setStep((prev) => prev + 1);
      intervalId = window.setInterval(() => {
        setStep((prev) => prev + 1);
      }, 2400);
    }, 950);

    return () => {
      window.clearTimeout(initialTimeoutId);
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, [paused]);

  const activeIdx =
    ((step + 1) % CAROUSEL_CLOUDS.length + CAROUSEL_CLOUDS.length) %
    CAROUSEL_CLOUDS.length;
  const activeCloud = CAROUSEL_CLOUDS[activeIdx];
  const visibleWindow = [step - 1, step, step + 1, step + 2, step + 3];

  return (
    <div
      className="gc-hero-enter mb-5 flex flex-wrap min-[430px]:flex-nowrap items-center justify-center lg:justify-start gap-3 sm:gap-3.5 select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative h-[82px] w-[228px] shrink-0 overflow-hidden">
        {visibleWindow.map((k) => {
          const itemIdx =
            ((k % CAROUSEL_CLOUDS.length) + CAROUSEL_CLOUDS.length) %
            CAROUSEL_CLOUDS.length;
          const item = CAROUSEL_CLOUDS[itemIdx];
          const slot = k - step; // 0 = left, 1 = center spotlight, 2 = right
          const isCenter = slot === 1;
          const isHidden = slot < 0 || slot > 2;
          const x = 4 + slot * 75;
          const scale = isCenter ? 1.1 : isHidden ? 0.68 : 0.82;
          const opacity = isCenter ? 1 : isHidden ? 0 : 0.78;
          const morphShape = isCenter
            ? "sunny"
            : slot === 0
              ? "clover"
              : "flower";

          return (
            <button
              key={k}
              type="button"
              onClick={() => {
                if (slot === 0) setStep((s) => s - 1);
                if (slot === 2) setStep((s) => s + 1);
              }}
              aria-label={`${item.name} (${item.status})`}
              className="absolute top-1.5 left-0 w-[70px] h-[70px] flex items-center justify-center cursor-pointer border-0 bg-transparent p-0 focus:outline-none"
              style={{
                transform: `translate3d(${x}px, 0, 0) scale(${scale})`,
                opacity,
                zIndex: isCenter ? 10 : isHidden ? 0 : 5,
                transition:
                  "transform 560ms cubic-bezier(0.34, 1.32, 0.42, 1), opacity 380ms ease",
              }}
            >
              <div className={`absolute inset-0 w-full h-full ${item.bgClass}`}>
                <HeroShapeMorph shape={morphShape} />
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.src}
                alt={item.name}
                className={`relative z-10 pointer-events-none object-contain ${item.iconClass}`}
                style={{
                  transform: isCenter ? "scale(1.06)" : "scale(0.9)",
                  transition: "transform 500ms cubic-bezier(0.34, 1.32, 0.42, 1)",
                }}
                draggable={false}
              />
            </button>
          );
        })}
      </div>

      {/* Inline Active Provider Status + Minimal M3 Dots */}
      <div className="min-w-0 space-y-1.5 text-left">
        <div className="text-[12.5px] leading-snug">
          <div className="font-semibold text-[#2E2B1A] truncate">{activeCloud.name}</div>
          <div className="text-[11.5px] text-[#686450] truncate">{activeCloud.status}</div>
        </div>

        <div className="flex items-center gap-1.5" role="tablist" aria-label="Cloud provider carousel">
          {CAROUSEL_CLOUDS.map((cloud, idx) => {
            const isSelected = idx === activeIdx;
            return (
              <button
                key={cloud.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-label={`Show ${cloud.name}`}
                onClick={() => {
                  const shortestDelta = ((idx - activeIdx + 4) % 3) - 1;
                  setStep((s) => s + shortestDelta);
                }}
                className={`h-1.5 rounded-full border-0 transition-all duration-300 cursor-pointer ${
                  isSelected ? "w-4 bg-[#2E2B1A]" : "w-1.5 bg-[#DFD6B5] hover:bg-[#B5AD8E]"
                }`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CloudIconSequence({ keyPrefix }: { keyPrefix: string }) {
  return (
    <div className="flex shrink-0 items-center gap-14 sm:gap-16 pr-14 sm:pr-16">
      {SEQUENCE_REPEATS.map((repeatIdx) =>
        CLOUD_ICONS.map((icon) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${keyPrefix}-${repeatIdx}-${icon.alt}`}
            src={icon.src}
            alt={icon.alt}
            className={`${icon.className} shrink-0 select-none object-contain`}
            draggable={false}
          />
        ))
      )}
    </div>
  );
}

export function HeroSection() {
  const [timeRange, setTimeRange] = useState<ChartRange>("30D");
  const [hoveredSeries, setHoveredSeries] = useState<"spend" | "carbon" | null>(null);
  const [hoveredResource, setHoveredResource] = useState<"compute" | "database" | "storage" | null>(null);
  const [hasAccount, setHasAccount] = useState<boolean>(false);

  const chartDatasets = useHeroTelemetryDatasets();
  const activeDataset = chartDatasets[timeRange];

  useEffect(() => {
    fetch("/api/cloud-accounts")
      .then((r) => r.json())
      .then((accs) => {
        if (Array.isArray(accs) && accs.length > 0) setHasAccount(true);
      })
      .catch(() => { });
  }, []);

  const heroTopShape = timeRange === "7D" ? "clover" : timeRange === "30D" ? "sunny" : "flower";
  const heroBottomShape = timeRange === "7D" ? "sunny" : timeRange === "30D" ? "cookie9" : "clover";

  return (
    <section id="overview" className="relative pt-3 sm:pt-6 pb-0">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 lg:gap-10 xl:gap-12 items-center">
        {/* LEFT COLUMN: Centered on mobile/tablet stacked layouts, left-aligned in 2-col desktop */}
        <div className="lg:col-span-5 flex flex-col justify-center items-center text-center lg:items-start lg:text-left">
          <CloudShapesCarousel />

          <h1 className="gc-hero-enter text-[30px] min-[400px]:text-[34px] sm:text-[42px] lg:text-[34px] xl:text-[43px] 2xl:text-[46px] font-extrabold text-[#2E2B1A] leading-[1.08] tracking-[-0.02em] mb-4">
              <span className="xl:whitespace-nowrap">Understand your cloud.</span>
              <br />
              <span className="relative inline-block z-10 xl:whitespace-nowrap">
                Control its cost.
                <span className="hero-underline absolute bottom-1 left-0 w-full h-[6px] bg-[#FFF76A] -z-10 rounded-sm"></span>
              </span>
              <br />
              <span className="text-[#1F8A70] xl:whitespace-nowrap">Reduce its footprint.</span>
            </h1>

          <p className="gc-hero-enter-delay-1 text-[16px] text-[#686450] leading-relaxed mb-6 max-w-[48ch] mx-auto lg:mx-0">
            Connect your AWS account to see daily spend and carbon emissions in one place. Catch idle resources early and review Terraform fixes before applying changes.
          </p>

            {/* Symmetrical Connected Action Pair + Clean Full-Capsule Action */}
            <div className="gc-hero-enter-delay-1 m3-hero-cluster mb-5 mx-auto lg:mx-0">
              {hasAccount ? (
                <>
                  <div className="m3-hero-row">
                    <Link href="/dashboard" className="m3-hero-btn-left m3-pastel-sun">
                      <span className="material-symbols-outlined icon-filled text-[19px] leading-none">
                        dashboard
                      </span>
                      <span>Go to dashboard</span>
                    </Link>
                    <Link href="/onboarding" className="m3-hero-btn-right m3-pastel-oat">
                      <span className="material-symbols-outlined text-[19px] leading-none">
                        link
                      </span>
                      <span>Connect AWS</span>
                    </Link>
                  </div>
                  <a href="#optimization" className="m3-hero-btn-pill m3-pastel-mint group">
                    <span className="material-symbols-outlined text-[19px] leading-none">
                      trending_down
                    </span>
                    <span>Explore recommendations</span>
                    <span className="relative w-6 h-6 inline-flex items-center justify-center shrink-0">
                      <span className="absolute inset-0 text-[#C3E9DB]">
                        <HeroShapeMorph shape="clover" />
                      </span>
                      <span className="relative z-10 text-[#155E4B] text-[11.5px] font-bold tabular-nums leading-none">
                        4
                      </span>
                    </span>
                  </a>
                </>
              ) : (
                <>
                  <div className="m3-hero-row">
                    <Link href="/onboarding" className="m3-hero-btn-left m3-pastel-sun">
                      <span className="material-symbols-outlined icon-filled text-[19px] leading-none">
                        rocket_launch
                      </span>
                      <span>Start setup</span>
                    </Link>
                    <Link href="/dashboard" className="m3-hero-btn-right m3-pastel-oat">
                      <span className="material-symbols-outlined text-[19px] leading-none">
                        play_circle
                      </span>
                      <span>Live demo</span>
                    </Link>
                  </div>
                  <a href="#optimization" className="m3-hero-btn-pill m3-pastel-mint group">
                    <span className="material-symbols-outlined text-[19px] leading-none">
                      trending_down
                    </span>
                    <span>Explore optimization actions</span>
                    <span className="relative w-6 h-6 inline-flex items-center justify-center shrink-0">
                      <span className="absolute inset-0 text-[#C3E9DB]">
                        <HeroShapeMorph shape="clover" />
                      </span>
                      <span className="relative z-10 text-[#155E4B] text-[11.5px] font-bold tabular-nums leading-none">
                        4
                      </span>
                    </span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </a>
                </>
              )}
            </div>

          <p className="gc-hero-enter-delay-2 text-[13px] text-[#686450] max-w-[46ch] mx-auto lg:mx-0">
            Read-only IAM access · Zero write permissions · Reviewable Terraform PRs
          </p>

          {/* Running Black Tape lifted close below trust line, spanning across the backdrop behind the right card */}
          <div className="relative w-full mt-6 h-[68px] z-0" aria-hidden="true">
            <div className="pointer-events-none select-none absolute inset-y-0 -left-[50vw] w-[200vw] bg-[#181711] flex items-center overflow-hidden">
              <div className="gc-tape-track">
                <CloudIconSequence keyPrefix="bot-a" />
                <CloudIconSequence keyPrefix="bot-b" />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Animated Telemetry Console */}
        <div className="lg:col-span-7 relative z-10 w-full max-w-[740px] mx-auto lg:max-w-none flex flex-col justify-center gc-hero-enter-delay-2 group/stage">
          <div className="hidden sm:block pointer-events-none select-none absolute -top-8 -right-8 w-44 h-44 text-[#FBF2CA] opacity-90 transition-transform duration-700 group-hover/stage:rotate-6 group-hover/stage:scale-105">
            <HeroShapeMorph shape={heroTopShape} />
          </div>
          <div className="hidden sm:block pointer-events-none select-none absolute -bottom-7 -right-8 w-36 h-36 text-[#E2F5EF] opacity-90 transition-transform duration-700 group-hover/stage:-rotate-6 group-hover/stage:scale-105">
            <HeroShapeMorph shape={heroBottomShape} />
          </div>
          <div className="hidden sm:block pointer-events-none select-none absolute top-1/2 -right-6 w-24 h-24 text-[#F5EED6] opacity-90 transition-transform duration-700 group-hover/stage:rotate-12 group-hover/stage:scale-110">
            <HeroShapeMorph shape="flower" />
          </div>

          <div className="relative z-10 bg-[#FAF6E8] rounded-[28px] shadow-warm-lg p-5 sm:p-6 space-y-4">
            {/* Scope Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
              <span className="font-semibold text-[#2E2B1A]">
                Production AWS · 0912-prod-us-east
              </span>
              <span className="text-[#686450]">
                Read-only IAM · UTC-4
              </span>
            </div>

            {/* 3 Dynamic Pastel Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="gc-card-hover p-4 rounded-[20px] bg-[#FFF3A8] hover:bg-[#FFEC8A] transition-colors flex flex-col justify-between gap-1.5">
                <span className="text-[12.5px] font-medium text-[#524305]">Potential savings</span>
                <div className="text-[26px] font-bold text-[#2E2B1A] tracking-[-0.02em] leading-none">
                  <CountUpNumber target={activeDataset.savingsVal} prefix="$" />
                  <span className="text-[13px] font-medium text-[#524305]"> {activeDataset.savingsUnit}</span>
                </div>
              </div>

              <div
                onMouseEnter={() => setHoveredSeries("spend")}
                onMouseLeave={() => setHoveredSeries(null)}
                className="gc-card-hover p-4 rounded-[20px] bg-[#FBE7CB] hover:bg-[#F7DAB3] transition-colors flex flex-col justify-between gap-1.5 cursor-default"
              >
                <span className="text-[12.5px] font-medium text-[#6B4814]">Cloud spend</span>
                <div className="text-[26px] font-bold text-[#3A2506] tracking-[-0.02em] leading-none">
                  <CountUpNumber target={activeDataset.spendVal} prefix="$" />
                </div>
              </div>

              <div
                onMouseEnter={() => setHoveredSeries("carbon")}
                onMouseLeave={() => setHoveredSeries(null)}
                className="gc-card-hover p-4 rounded-[20px] bg-[#D7F0E4] hover:bg-[#C6E8D8] transition-colors flex flex-col justify-between gap-1.5 cursor-default"
              >
                <span className="text-[12.5px] font-medium text-[#185B48]">Carbon footprint</span>
                <div className="text-[26px] font-bold text-[#114234] tracking-[-0.02em] leading-none">
                  <CountUpNumber target={activeDataset.carbonVal} decimals={1} />
                  <span className="text-[13px] font-medium text-[#185B48]"> tCO₂e</span>
                </div>
              </div>
            </div>

            {/* Real Data-Driven Dual-Axis Monotone Spline Chart */}
            <SpendCarbonChart
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
              hoveredSeries={hoveredSeries}
              dataset={activeDataset}
            />

            {/* Animated Resource Breakdown */}
            <div className="p-4 sm:p-5 rounded-[22px] bg-white space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[14px] font-semibold text-[#2E2B1A]">
                  Resource breakdown
                </span>
                <a
                  href="#optimization"
                  className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#2E2B1A] hover:text-[#686450] group transition-colors"
                >
                  <span>Check actions</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </a>
              </div>

              <div className="w-full h-2.5 rounded-lg bg-[#FAF6E8] overflow-hidden flex gap-0.5">
                <div
                  onMouseEnter={() => setHoveredResource("compute")}
                  onMouseLeave={() => setHoveredResource(null)}
                  className={`h-full bg-[#9A6B00] chart-segment-grow transition-opacity duration-150 cursor-pointer ${hoveredResource && hoveredResource !== "compute" ? "opacity-45" : "opacity-100"
                    }`}
                  style={{ width: "42%", animationDelay: "100ms" }}
                  title="Compute: 42% ($2,696/mo)"
                />
                <div
                  onMouseEnter={() => setHoveredResource("database")}
                  onMouseLeave={() => setHoveredResource(null)}
                  className={`h-full bg-[#2E2B1A] chart-segment-grow transition-opacity duration-150 cursor-pointer ${hoveredResource && hoveredResource !== "database" ? "opacity-45" : "opacity-100"
                    }`}
                  style={{ width: "38%", animationDelay: "180ms" }}
                  title="Database: 38% ($2,440/mo)"
                />
                <div
                  onMouseEnter={() => setHoveredResource("storage")}
                  onMouseLeave={() => setHoveredResource(null)}
                  className={`h-full bg-[#1F8A70] chart-segment-grow transition-opacity duration-150 cursor-pointer ${hoveredResource && hoveredResource !== "storage" ? "opacity-45" : "opacity-100"
                    }`}
                  style={{ width: "20%", animationDelay: "260ms" }}
                  title="Storage: 20% ($1,284/mo)"
                />
              </div>

              <div className="grid grid-cols-1 min-[420px]:grid-cols-3 gap-2.5 text-[12px]">
                <div
                  onMouseEnter={() => setHoveredResource("compute")}
                  onMouseLeave={() => setHoveredResource(null)}
                  className={`gc-card-hover p-2.5 sm:p-3 rounded-xl transition-colors ${hoveredResource === "compute" ? "bg-[#F5EED6]" : "bg-[#FAF6E8]"
                    }`}
                >
                  <div className="text-[#686450] font-medium mb-0.5">Compute</div>
                  <div className="font-bold text-[#2E2B1A] text-[13.5px] sm:text-[14px] tabular-nums">
                    $2,696 <span className="font-normal text-[11px] text-[#686450]">/mo</span>
                  </div>
                </div>

                <div
                  onMouseEnter={() => setHoveredResource("database")}
                  onMouseLeave={() => setHoveredResource(null)}
                  className={`gc-card-hover p-2.5 sm:p-3 rounded-xl transition-colors ${hoveredResource === "database" ? "bg-[#F5EED6]" : "bg-[#FAF6E8]"
                    }`}
                >
                  <div className="text-[#686450] font-medium mb-0.5">Database</div>
                  <div className="font-bold text-[#2E2B1A] text-[13.5px] sm:text-[14px] tabular-nums">
                    $2,440 <span className="font-normal text-[11px] text-[#686450]">/mo</span>
                  </div>
                </div>

                <div
                  onMouseEnter={() => setHoveredResource("storage")}
                  onMouseLeave={() => setHoveredResource(null)}
                  className={`gc-card-hover p-2.5 sm:p-3 rounded-xl transition-colors ${hoveredResource === "storage" ? "bg-[#F5EED6]" : "bg-[#FAF6E8]"
                    }`}
                >
                  <div className="text-[#686450] font-medium mb-0.5">Storage</div>
                  <div className="font-bold text-[#2E2B1A] text-[13.5px] sm:text-[14px] tabular-nums">
                    $1,284 <span className="font-normal text-[11px] text-[#686450]">/mo</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
