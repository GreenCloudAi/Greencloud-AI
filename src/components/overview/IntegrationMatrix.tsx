"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HeroShapeMorph } from "@/components/overview/MotionPrimitives";

interface ProviderSpec {
  id: "aws" | "gcp" | "azure";
  shortName: string;
  name: string;
  status: string;
  active: boolean;
  iconSrc: string;
  carouselIconSrc: string;
  iconAlt: string;
  iconClass: string;
  shape: "sunny" | "flower" | "clover";
  desc: string;
  highlights: string[];
  ctaText: string;
  ctaHref: string;
  theme: {
    cardActiveBg: string;
    cardRestBg: string;
    focusRing: string;
    shapeColorActive: string;
    shapeColorRest: string;
    trayBg: string;
    titleInk: string;
    bodyInk: string;
    statusInk: string;
    dotColor: string;
    ctaBg: string;
    ctaInk: string;
  };
}

const PROVIDERS: ProviderSpec[] = [
  {
    id: "aws",
    shortName: "AWS",
    name: "Amazon Web Services",
    status: "Available now",
    active: true,
    iconSrc: "/icons/aws.svg",
    carouselIconSrc: "/icons/aws.svg",
    iconAlt: "Amazon Web Services",
    iconClass: "h-[22px] w-auto mt-0.5",
    shape: "sunny",
    desc: "Reads AWS Cost Explorer billing, CloudWatch utilization, and cross-account IAM roles safely.",
    highlights: [
      "AWS Cost Explorer and CUR 2.0",
      "CloudWatch metrics and utilization",
      "Read-only cross-account IAM STS",
    ],
    ctaText: "Connect AWS account",
    ctaHref: "/onboarding",
    theme: {
      cardActiveBg: "bg-[#FFF4D1]",
      cardRestBg: "bg-[#FFF8E3]",
      focusRing: "ring-2 ring-[#F59E0B]/55",
      shapeColorActive: "text-[#232F3E]",
      shapeColorRest: "text-[#232F3E]",
      trayBg: "bg-[#FFFDF8]/90",
      titleInk: "text-[#232F3E]",
      bodyInk: "text-[#5C533D]",
      statusInk: "text-[#8C5A00]",
      dotColor: "bg-[#FF9900]",
      ctaBg: "bg-[#FFB340] hover:bg-[#FFA31F]",
      ctaInk: "text-[#232F3E]",
    },
  },
  {
    id: "gcp",
    shortName: "Google Cloud",
    name: "Google Cloud Platform",
    status: "In roadmap",
    active: false,
    iconSrc: "/icons/gcp.svg",
    carouselIconSrc: "/icons/gcp.svg",
    iconAlt: "Google Cloud Platform",
    iconClass: "h-[28px] w-auto",
    shape: "flower",
    desc: "Planned support for BigQuery billing exports, Cloud Monitoring, and regional carbon reporting.",
    highlights: [
      "BigQuery billing export",
      "Cloud Monitoring metrics",
      "Carbon Footprint API",
    ],
    ctaText: "View roadmap details",
    ctaHref: "/how-it-works",
    theme: {
      cardActiveBg: "bg-[#E6F0FE]",
      cardRestBg: "bg-[#EFF5FE]",
      focusRing: "ring-2 ring-[#4285F4]/50",
      shapeColorActive: "text-[#D2E3FC]",
      shapeColorRest: "text-[#D8E7FD]",
      trayBg: "bg-white/90",
      titleInk: "text-[#17325C]",
      bodyInk: "text-[#4D6182]",
      statusInk: "text-[#174EA6]",
      dotColor: "bg-[#4285F4]",
      ctaBg: "bg-[#D2E3FC] hover:bg-[#BFD6FB]",
      ctaInk: "text-[#174EA6]",
    },
  },
  {
    id: "azure",
    shortName: "Azure",
    name: "Microsoft Azure",
    status: "In roadmap",
    active: false,
    iconSrc: "/icons/azure.svg",
    carouselIconSrc: "/icons/azure.svg",
    iconAlt: "Microsoft Azure",
    iconClass: "h-[26px] w-auto",
    shape: "clover",
    desc: "Planned support for Cost Management Blob exports, Azure Monitor telemetry, and emissions tracking.",
    highlights: [
      "Cost Management Blob exports",
      "Azure Monitor utilization",
      "Emissions impact metrics",
    ],
    ctaText: "View roadmap details",
    ctaHref: "/how-it-works",
    theme: {
      cardActiveBg: "bg-[#E0F2FE]",
      cardRestBg: "bg-[#ECF7FF]",
      focusRing: "ring-2 ring-[#0078D4]/50",
      shapeColorActive: "text-[#C7E8FF]",
      shapeColorRest: "text-[#D2ECFF]",
      trayBg: "bg-white/90",
      titleInk: "text-[#0D385C]",
      bodyInk: "text-[#47647D]",
      statusInk: "text-[#004E8C]",
      dotColor: "bg-[#0078D4]",
      ctaBg: "bg-[#C7E8FF] hover:bg-[#B2DEFF]",
      ctaInk: "text-[#004E8C]",
    },
  },
];

export function IntegrationMatrix() {
  const [activeIndex, setActiveIndex] = useState<number | null>(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!autoPlay || isHovered) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(() => {
      setActiveIndex((prev) =>
        prev === null ? 0 : (prev + 1) % PROVIDERS.length
      );
    }, 4200);

    return () => window.clearInterval(timer);
  }, [autoPlay, isHovered]);

  const handleToggleProvider = (idx: number) => {
    setAutoPlay(false);
    setActiveIndex((prev) => (prev === idx ? null : idx));
  };

  return (
    <section
      className="scroll-mt-28 space-y-6 sm:space-y-7"
      id="integrations"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header + Synced Material 3 Icon Carousel Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 lg:gap-6 items-center text-center lg:text-left">
        <div className="flex-1 min-w-0 space-y-2">
          <h2 className="text-[28px] sm:text-[34px] font-bold tracking-[-0.02em] text-[#2E2B1A] leading-tight">
            Multi-cloud API ingestion
          </h2>
          <p className="text-[15.5px] text-[#686450] leading-relaxed max-w-2xl mx-auto lg:mx-0">
            Connect directly to provider billing and usage APIs without installing host agents.
          </p>
        </div>

        {/* Interactive Material 3 Expressive Shape Icon Carousel */}
        <div
          className="inline-flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 p-2 rounded-[26px] bg-[#FAF6E8]"
          role="tablist"
          aria-label="Highlight cloud provider card"
        >
          {PROVIDERS.map((provider, idx) => {
            const isSelected = idx === activeIndex;
            const morphTarget = isSelected ? "sunny" : provider.shape;

            return (
              <button
                key={provider.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-label={`${provider.name} (click to ${isSelected ? "show all" : "focus"})`}
                onClick={() => handleToggleProvider(idx)}
                className="relative flex items-center gap-2.5 pr-3 pl-1.5 py-1 rounded-[20px] border-0 cursor-pointer transition-all duration-300"
                style={{
                  backgroundColor: isSelected ? "#FFFDF4" : "transparent",
                }}
              >
                <div
                  className="relative w-11 h-11 shrink-0 flex items-center justify-center transition-transform duration-500 ease-out"
                  style={{
                    transform: isSelected ? "scale(1.08)" : "scale(0.94)",
                  }}
                >
                  <div
                    className={`absolute inset-0 transition-colors duration-300 ${
                      isSelected
                        ? provider.theme.shapeColorActive
                        : provider.theme.shapeColorRest
                    }`}
                  >
                    <HeroShapeMorph shape={morphTarget} />
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={provider.carouselIconSrc}
                    alt={provider.iconAlt}
                    className={`relative z-10 pointer-events-none object-contain ${
                      provider.id === "aws"
                        ? "h-[16px] w-auto mt-0.5"
                        : provider.id === "gcp"
                          ? "h-[20px] w-auto"
                          : "h-[19px] w-auto"
                    }`}
                    draggable={false}
                  />
                </div>
                <span
                  className={`text-[13px] font-semibold transition-colors ${
                    isSelected ? "text-[#2E2B1A]" : "text-[#686450]"
                  }`}
                >
                  {provider.shortName}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* All 3 Dynamic Provider-Themed Cards always fully visible (unselect shows all equally) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        {PROVIDERS.map((provider, idx) => {
          const isSelected = idx === activeIndex;
          const t = provider.theme;
          const cardMorphShape = isSelected ? "sunny" : provider.shape;

          return (
            <div
              key={provider.id}
              onClick={() => handleToggleProvider(idx)}
              className={`rounded-[30px] p-6 sm:p-7 flex flex-col justify-between gap-6 cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isSelected
                  ? `${t.cardActiveBg} ${t.focusRing} shadow-warm-lg -translate-y-1`
                  : `${t.cardRestBg} shadow-warm-sm hover:-translate-y-0.5`
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    {/* Provider Brand Icon inside M3 Expressive Shape */}
                    <div
                      className="relative w-14 h-14 shrink-0 flex items-center justify-center transition-transform duration-500 ease-out"
                      style={{
                        transform: isSelected ? "scale(1.08)" : "scale(1)",
                      }}
                    >
                      <div
                        className={`absolute inset-0 transition-colors duration-300 ${
                          isSelected ? t.shapeColorActive : t.shapeColorRest
                        }`}
                      >
                        <HeroShapeMorph shape={cardMorphShape} />
                      </div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={provider.iconSrc}
                        alt={provider.iconAlt}
                        className={`relative z-10 pointer-events-none object-contain ${provider.iconClass}`}
                        draggable={false}
                      />
                    </div>

                    <div>
                      <h3 className={`text-[18.5px] font-bold leading-snug ${t.titleInk}`}>
                        {provider.name}
                      </h3>
                      <div className={`text-[12.5px] font-semibold mt-0.5 ${t.statusInk}`}>
                        {provider.status}
                      </div>
                    </div>
                  </div>
                </div>

                <p className={`text-[14px] leading-relaxed ${t.bodyInk}`}>
                  {provider.desc}
                </p>

                {/* M3 Sub-Container Highlight Tray */}
                <div className={`p-3.5 rounded-[20px] ${t.trayBg}`}>
                  <ul className="space-y-2 text-[13px]">
                    {provider.highlights.map((item) => (
                      <li
                        key={item}
                        className={`flex items-center gap-2.5 font-medium ${t.titleInk}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${t.dotColor}`} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <Link
                href={provider.ctaHref}
                onClick={(e) => e.stopPropagation()}
                className={`m3-btn w-full group ${t.ctaBg} ${t.ctaInk}`}
              >
                <span>{provider.ctaText}</span>
                {provider.active && (
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                )}
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
