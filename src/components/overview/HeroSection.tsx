"use client";

import { useState, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Server,
  Database,
  HardDrive,
  FolderArchive,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingDown,
  Lock,
  Code2,
  PieChart,
  Zap,
  Leaf,
} from "lucide-react";

interface ChartPoint {
  x: number;
  ySpend: number;
  yCarbon: number;
  label: string;
  spend: string;
  carbon: string;
  status?: string;
}

export function HeroSection() {
  const [timeRange, setTimeRange] = useState<"7D" | "30D" | "90D">("30D");
  const [hoveredPoint, setHoveredPoint] = useState<ChartPoint | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Dynamic Date Generation based on current client date (Past -> Today in chronological order)
  const dynamicDates = useMemo(() => {
    const today = new Date();
    const formatDay = (d: Date) =>
      d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });

    // 7-day points
    const days7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      return i === 6 ? "Today" : formatDay(d);
    });

    // 30-day points (5 intervals in chronological order: past -> today)
    const days30 = [28, 21, 14, 7, 0].map((offset, idx) => {
      const d = new Date(today);
      d.setDate(today.getDate() - offset);
      return idx === 4 ? "Today" : formatDay(d);
    });

    // 90-day points (5 intervals in chronological order: past -> today)
    const days90 = [80, 60, 40, 20, 0].map((offset, idx) => {
      const d = new Date(today);
      d.setDate(today.getDate() - offset);
      return idx === 4 ? "Today" : formatDay(d);
    });

    return { days7, days30, days90, todayFormatted: formatDay(today) };
  }, []);

  // Multi-Range High-Fidelity Chart Datasets with interactive milestone points
  const chartDatasets = useMemo(() => {
    return {
      "7D": {
        title: "7-Day Run-Rate",
        labels: dynamicDates.days7,
        spendAvg: "$838 / day",
        carbonAvg: "0.41 tCO₂e",
        spendPath: "M 48 56 C 100 44, 150 48, 210 50 C 270 52, 330 68, 390 66 C 440 64, 490 50, 530 48",
        spendArea: "M 48 56 C 100 44, 150 48, 210 50 C 270 52, 330 68, 390 66 C 440 64, 490 50, 530 48 L 530 150 L 48 150 Z",
        carbonPath: "M 48 80 C 100 70, 150 74, 210 76 C 270 78, 330 96, 390 94 C 440 92, 490 78, 530 76",
        carbonArea: "M 48 80 C 100 70, 150 74, 210 76 C 270 78, 330 96, 390 94 C 440 92, 490 78, 530 76 L 530 150 L 48 150 Z",
        projSpendPath: "M 530 48 C 560 54, 595 76, 630 84",
        projCarbonPath: "M 530 76 C 560 84, 595 102, 630 110",
        points: [
          { x: 48, ySpend: 56, yCarbon: 80, label: dynamicDates.days7[0], spend: "$850", carbon: "0.43 t" },
          { x: 130, ySpend: 46, yCarbon: 72, label: dynamicDates.days7[1], spend: "$865", carbon: "0.44 t" },
          { x: 210, ySpend: 50, yCarbon: 76, label: dynamicDates.days7[2], spend: "$855", carbon: "0.43 t" },
          { x: 290, ySpend: 58, yCarbon: 84, label: dynamicDates.days7[3], spend: "$820", carbon: "0.40 t", status: "Weekend Dip" },
          { x: 370, ySpend: 66, yCarbon: 94, label: dynamicDates.days7[4], spend: "$795", carbon: "0.38 t", status: "Weekend Dip" },
          { x: 450, ySpend: 54, yCarbon: 82, label: dynamicDates.days7[5], spend: "$848", carbon: "0.42 t" },
          { x: 530, ySpend: 48, yCarbon: 76, label: "Today", spend: "$842", carbon: "0.42 t" },
        ] as ChartPoint[],
      },
      "30D": {
        title: "30-Day Trajectory",
        labels: dynamicDates.days30,
        spendAvg: "$842 / day",
        carbonAvg: "0.42 tCO₂e",
        spendPath: "M 48 72 C 100 56, 150 74, 200 62 C 260 48, 310 68, 360 54 C 420 44, 480 56, 530 48",
        spendArea: "M 48 72 C 100 56, 150 74, 200 62 C 260 48, 310 68, 360 54 C 420 44, 480 56, 530 48 L 530 150 L 48 150 Z",
        carbonPath: "M 48 96 C 100 82, 150 98, 200 88 C 260 76, 310 94, 360 82 C 420 72, 480 84, 530 76",
        carbonArea: "M 48 96 C 100 82, 150 98, 200 88 C 260 76, 310 94, 360 82 C 420 72, 480 84, 530 76 L 530 150 L 48 150 Z",
        projSpendPath: "M 530 48 C 560 54, 595 76, 630 84",
        projCarbonPath: "M 530 76 C 560 84, 595 102, 630 110",
        points: [
          { x: 48, ySpend: 72, yCarbon: 96, label: dynamicDates.days30[0], spend: "$810", carbon: "0.39 t" },
          { x: 170, ySpend: 62, yCarbon: 88, label: dynamicDates.days30[1], spend: "$830", carbon: "0.41 t" },
          { x: 290, ySpend: 54, yCarbon: 82, label: dynamicDates.days30[2], spend: "$855", carbon: "0.43 t" },
          { x: 410, ySpend: 50, yCarbon: 78, label: dynamicDates.days30[3], spend: "$865", carbon: "0.43 t" },
          { x: 530, ySpend: 48, yCarbon: 76, label: "Today", spend: "$842", carbon: "0.42 t" },
        ] as ChartPoint[],
      },
      "90D": {
        title: "90-Day Quarterly Trend",
        labels: dynamicDates.days90,
        spendAvg: "$815 / day",
        carbonAvg: "0.39 tCO₂e",
        spendPath: "M 48 88 C 120 80, 180 86, 250 72 C 320 58, 390 76, 460 56 C 495 48, 515 48, 530 48",
        spendArea: "M 48 88 C 120 80, 180 86, 250 72 C 320 58, 390 76, 460 56 C 495 48, 515 48, 530 48 L 530 150 L 48 150 Z",
        carbonPath: "M 48 110 C 120 102, 180 108, 250 94 C 320 82, 390 100, 460 82 C 495 74, 515 74, 530 76",
        carbonArea: "M 48 110 C 120 102, 180 108, 250 94 C 320 82, 390 100, 460 82 C 495 74, 515 74, 530 76 L 530 150 L 48 150 Z",
        projSpendPath: "M 530 48 C 560 54, 595 76, 630 84",
        projCarbonPath: "M 530 76 C 560 84, 595 102, 630 110",
        points: [
          { x: 48, ySpend: 88, yCarbon: 110, label: dynamicDates.days90[0], spend: "$760", carbon: "0.36 t" },
          { x: 170, ySpend: 80, yCarbon: 102, label: dynamicDates.days90[1], spend: "$795", carbon: "0.38 t" },
          { x: 290, ySpend: 70, yCarbon: 92, label: dynamicDates.days90[2], spend: "$835", carbon: "0.41 t" },
          { x: 420, ySpend: 54, yCarbon: 80, label: dynamicDates.days90[3], spend: "$850", carbon: "0.43 t" },
          { x: 530, ySpend: 48, yCarbon: 76, label: "Today", spend: "$842", carbon: "0.42 t" },
        ] as ChartPoint[],
      },
    };
  }, [dynamicDates]);

  const activeDataset = chartDatasets[timeRange];

  // Mouse scrub handler across SVG chart coordinates
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement | SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 640;

    let closestPoint = activeDataset.points[0];
    let minDistance = Math.abs(mouseX - closestPoint.x);

    for (const pt of activeDataset.points) {
      const dist = Math.abs(mouseX - pt.x);
      if (dist < minDistance) {
        minDistance = dist;
        closestPoint = pt;
      }
    }

    setHoveredPoint(closestPoint);
  };

  const currentDisplayPoint = hoveredPoint || activeDataset.points[activeDataset.points.length - 1];

  return (
    <section id="overview" className="pt-2 sm:pt-4">
      {/* 2-Column Split: Symmetrical, Balanced Heights, Zero Wasted Empty Spaces */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-start">
        {/* LEFT COLUMN: Clean, Anchored Value Proposition (Crisp & Short) */}
        <div className="lg:col-span-5 flex flex-col justify-between py-1">
          <div>
            {/* Top Eyebrow Tag */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FBF6E3] border border-[#ECE5CC] mb-4 shadow-warm-sm">
              <span className="w-2 h-2 rounded-full bg-[#1F8A70]"></span>
              <span className="text-[12px] font-bold text-[#2E2B1A] uppercase tracking-wider">
                Cloud Cost & Carbon Intelligence
              </span>
            </div>

            {/* Main Editorial Headline */}
            <h1 className="text-[38px] sm:text-[44px] lg:text-[46px] font-black text-[#2E2B1A] leading-[1.08] tracking-[-0.03em] mb-4">
              Understand your cloud.<br />
              <span className="relative inline-block z-10">
                Control its cost.
                <span className="absolute bottom-1 left-0 w-full h-[6px] bg-[#FFF76A] -z-10 rounded-sm"></span>
              </span><br />
              <span className="text-[#1F8A70]">Reduce its footprint.</span>
            </h1>

            {/* Subtitle Copy */}
            <p className="text-[15px] text-[#686450] leading-relaxed mb-5 font-normal">
              GreenCloud AI connects cloud billing, CloudWatch telemetry, and carbon intensity into a single executive dashboard — delivering evidence-backed optimizations with verified audit trails.
            </p>

            {/* 2 Summary KPI Cards */}
            <div className="grid grid-cols-2 gap-3.5 mb-5">
              <div className="p-4 rounded-[20px] bg-[#FBF6E3] border border-[#ECE5CC] shadow-warm-sm">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#8D8975] uppercase mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#9A6B00]"></span>
                  <span>Monthly Spend</span>
                </div>
                <div className="flex items-baseline gap-1.5 mb-0.5">
                  <span className="text-[24px] sm:text-[26px] font-black text-[#2E2B1A]">
                    $24,842
                  </span>
                  <span className="text-[12px] font-bold text-[#9A6B00]">
                    +4.8%
                  </span>
                </div>
                <div className="text-[11.5px] text-[#8D8975]">
                  Live AWS Billing Sync
                </div>
              </div>

              <div className="p-4 rounded-[20px] bg-[#FBF6E3] border border-[#ECE5CC] shadow-warm-sm">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#8D8975] uppercase mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1F8A70]"></span>
                  <span>Carbon Footprint</span>
                </div>
                <div className="flex items-baseline gap-1.5 mb-0.5">
                  <span className="text-[24px] sm:text-[26px] font-black text-[#1F8A70]">
                    12.8 <span className="text-[14px]">tCO₂e</span>
                  </span>
                </div>
                <div className="text-[11.5px] text-[#1F8A70] font-medium">
                  ↓ 6.4% against baseline
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3.5 mb-4">
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#FFF76A] hover:bg-[#F5EC50] border border-[#DFD6B5] text-[#2E2B1A] font-bold text-[14px] shadow-sm hover:shadow-sunshine-glow transition-all group"
              >
                <span>Start setup</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#optimization"
                className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-white border border-[#ECE5CC] hover:bg-[#FAF6E8] text-[#2E2B1A] font-semibold text-[14px] transition-colors shadow-warm-sm"
              >
                <span>Explore Demo</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#8D8975]" />
              </a>
            </div>

            {/* Clean Enterprise Trust Line */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-[#686450] mb-3.5">
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#1F8A70]" />
                <span>100% Agentless Setup</span>
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-[#1F8A70]" />
                <span>Read-Only IAM Policy</span>
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#9A6B00]" />
                <span>Automated Terraform PRs</span>
              </span>
            </div>

            {/* 3 Core Highlights (Ultra-short, no jargon, no fill color) */}
            <div className="grid grid-cols-3 gap-2.5 pt-3.5 border-t border-[#ECE5CC] text-[11.5px]">
              <div className="p-3 rounded-xl border border-[#ECE5CC] bg-transparent">
                <div className="flex items-center gap-1.5 font-bold text-[#2E2B1A] text-[12px] mb-0.5">
                  <Zap className="w-3.5 h-3.5 text-[#2E2B1A]" />
                  <span>Find Waste</span>
                </div>
                <div className="text-[11px] text-[#686450] leading-snug">
                  Unused cloud resources
                </div>
              </div>

              <div className="p-3 rounded-xl border border-[#ECE5CC] bg-transparent">
                <div className="flex items-center gap-1.5 font-bold text-[#2E2B1A] text-[12px] mb-0.5">
                  <Leaf className="w-3.5 h-3.5 text-[#2E2B1A]" />
                  <span>Cut Carbon</span>
                </div>
                <div className="text-[11px] text-[#686450] leading-snug">
                  Lower energy footprint
                </div>
              </div>

              <div className="p-3 rounded-xl border border-[#ECE5CC] bg-transparent">
                <div className="flex items-center gap-1.5 font-bold text-[#2E2B1A] text-[12px] mb-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#2E2B1A]" />
                  <span>Safe Fixes</span>
                </div>
                <div className="text-[11px] text-[#686450] leading-snug">
                  Reviewable code changes
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Master Executive Telemetry Console (Balanced Height, Zero Gap) */}
        <div className="lg:col-span-7 bg-[#FFFDF4] rounded-[28px] border border-[#ECE5CC] shadow-warm-lg p-5 sm:p-6 space-y-3.5">
          {/* 1. Header Scope Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-[#ECE5CC]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1F8A70] animate-pulse"></span>
              <span className="font-bold text-[#2E2B1A] text-[13.5px]">
                Production AWS (0912-prod-us-east)
              </span>
              <span className="text-[12px] text-[#8D8975] hidden sm:inline">
                • Scope: All VPCs & Workloads
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11.5px]">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E2F5EF] text-[#1F8A70] font-semibold border border-[#1F8A70]/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                Read-Only Mode
              </span>
              <span className="px-2 py-0.5 rounded-md bg-[#FAF6E8] border border-[#ECE5CC] text-[#8D8975] font-medium">
                UTC-4
              </span>
            </div>
          </div>

          {/* 2. 4 Mini KPI Cards in 1 Row (STRICTLY UNIFORM & SYMMETRICAL) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Card 1: Cloud Spend */}
            <div className="p-3.5 rounded-[18px] bg-white border border-[#ECE5CC] shadow-warm-sm flex flex-col justify-between h-[100px]">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-[#686450]">Cloud Spend</span>
                <span className="w-2 h-2 rounded-full bg-[#D97706]"></span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-[23px] sm:text-[25px] font-black text-[#2E2B1A] tracking-tight leading-none">
                  $24,842
                </span>
              </div>
              <div className="text-[11px] font-semibold text-[#9A6B00]">
                Monthly total
              </div>
            </div>

            {/* Card 2: Potential Savings */}
            <div className="p-3.5 rounded-[18px] bg-white border border-[#ECE5CC] shadow-warm-sm flex flex-col justify-between h-[100px]">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-[#686450]">Potential Savings</span>
                <span className="w-2 h-2 rounded-full bg-[#1F8A70]"></span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-[23px] sm:text-[25px] font-black text-[#2E2B1A] tracking-tight leading-none">
                  $6,420
                </span>
                <span className="text-[11.5px] font-bold text-[#8D8975]">/mo</span>
              </div>
              <div className="text-[11px] font-semibold text-[#1F8A70]">
                Found in idle waste
              </div>
            </div>

            {/* Card 3: Carbon Footprint */}
            <div className="p-3.5 rounded-[18px] bg-white border border-[#ECE5CC] shadow-warm-sm flex flex-col justify-between h-[100px]">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-[#686450]">Carbon Footprint</span>
                <span className="w-2 h-2 rounded-full bg-[#0D9488]"></span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-[23px] sm:text-[25px] font-black text-[#1F8A70] tracking-tight leading-none">
                  12.8
                </span>
                <span className="text-[11.5px] font-bold text-[#1F8A70]">tCO₂e</span>
              </div>
              <div className="text-[11px] font-semibold text-[#1F8A70]">
                Can cut 30%
              </div>
            </div>

            {/* Card 4: Actions Ready */}
            <div className="p-3.5 rounded-[18px] bg-white border border-[#ECE5CC] shadow-warm-sm flex flex-col justify-between h-[100px]">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-[#686450]">Actions Ready</span>
                <span className="w-2 h-2 rounded-full bg-[#6C63B6]"></span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-[23px] sm:text-[25px] font-black text-[#6C63B6] tracking-tight leading-none">
                  4
                </span>
                <span className="text-[11.5px] font-bold text-[#6C63B6]">Actions</span>
              </div>
              <div className="text-[11px] font-semibold text-[#6C63B6]">
                Ready to review
              </div>
            </div>
          </div>

          {/* 3. Monthly Spend & Carbon Trend Graph (Dynamic, Clean, No Gimmicks) */}
          <div className="p-3.5 sm:p-4 rounded-[22px] bg-white border border-[#ECE5CC] shadow-warm-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
              <h3 className="text-[14px] font-bold text-[#2E2B1A]">
                Monthly Spend & Carbon Trend
              </h3>

              {/* Legend & Dynamic Time Range Filter Tabs */}
              <div className="flex items-center gap-2 text-[11px]">
                <div className="hidden sm:flex items-center gap-2 bg-[#FAF6E8] px-2.5 py-0.5 rounded-full border border-[#ECE5CC]">
                  <span className="flex items-center gap-1 font-semibold text-[#2E2B1A]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]"></span>
                    <span>Spend</span>
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-[#2E2B1A]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0D9488]"></span>
                    <span>Carbon</span>
                  </span>
                </div>

                <div className="flex items-center bg-[#FAF6E8] p-0.5 rounded-lg border border-[#ECE5CC]">
                  {(["7D", "30D", "90D"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        setTimeRange(r);
                        setHoveredPoint(null);
                      }}
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all ${
                        timeRange === r
                          ? "bg-[#FFF76A] text-[#2E2B1A] shadow-sm"
                          : "text-[#8D8975] hover:text-[#2E2B1A]"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* SVG Chart Container with Interactive Mouse Scrub */}
            <div
              className="relative w-full h-[175px] bg-[#FFFDF7] rounded-xl border border-[#ECE5CC] overflow-hidden select-none cursor-crosshair"
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              <svg ref={svgRef} className="w-full h-full" viewBox="0 0 640 175" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="spendGradClean" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D97706" stopOpacity="0.20" />
                    <stop offset="100%" stopColor="#D97706" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="carbonGradClean" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0D9488" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#0D9488" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Y-Axis Value Labels & Clean Horizontal Grid Lines */}
                <g className="text-[#A8A29E] text-[10px] font-medium" fill="currentColor">
                  <text x="10" y="24">$1,000</text>
                  <line x1="46" y1="20" x2="630" y2="20" stroke="#F0EBE1" strokeDasharray="3 3" />

                  <text x="10" y="64">$750</text>
                  <line x1="46" y1="60" x2="630" y2="60" stroke="#F0EBE1" strokeDasharray="3 3" />

                  <text x="10" y="104">$500</text>
                  <line x1="46" y1="100" x2="630" y2="100" stroke="#F0EBE1" strokeDasharray="3 3" />

                  <text x="10" y="144">$250</text>
                  <line x1="46" y1="140" x2="630" y2="140" stroke="#F0EBE1" strokeDasharray="3 3" />
                </g>

                {/* Shaded Area Fills */}
                <path d={activeDataset.spendArea} fill="url(#spendGradClean)" className="transition-all duration-300" />
                <path d={activeDataset.carbonArea} fill="url(#carbonGradClean)" className="transition-all duration-300" />

                {/* Historical Curves */}
                <path
                  d={activeDataset.spendPath}
                  fill="none"
                  stroke="#D97706"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="transition-all duration-300"
                />
                <path
                  d={activeDataset.carbonPath}
                  fill="none"
                  stroke="#0D9488"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="transition-all duration-300"
                />

                {/* Milestone Dots along curve */}
                {activeDataset.points.map((pt, i) => (
                  <circle
                    key={i}
                    cx={pt.x}
                    cy={pt.ySpend}
                    r={hoveredPoint?.x === pt.x ? "5.5" : "3.5"}
                    fill="#FFFDF7"
                    stroke="#D97706"
                    strokeWidth={hoveredPoint?.x === pt.x ? "2.5" : "2"}
                    className="transition-all duration-150"
                  />
                ))}

                {/* Forward Projected Savings Path (Dashed) */}
                <path
                  d={activeDataset.projSpendPath}
                  fill="none"
                  stroke="#D97706"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  strokeOpacity="0.7"
                  className="transition-all duration-300"
                />
                <path
                  d={activeDataset.projCarbonPath}
                  fill="none"
                  stroke="#0D9488"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  strokeOpacity="0.7"
                  className="transition-all duration-300"
                />

                {/* Hover / Current Indicator Line */}
                <line
                  x1={currentDisplayPoint.x}
                  y1="10"
                  x2={currentDisplayPoint.x}
                  y2="155"
                  stroke="#2E2B1A"
                  strokeWidth="1.2"
                  strokeDasharray="3 3"
                />

                {/* Active Dots on Curves */}
                <circle
                  cx={currentDisplayPoint.x}
                  cy={currentDisplayPoint.ySpend}
                  r="5"
                  fill="#FFFDF7"
                  stroke="#D97706"
                  strokeWidth="2.5"
                />
                <circle
                  cx={currentDisplayPoint.x}
                  cy={currentDisplayPoint.yCarbon}
                  r="5"
                  fill="#FFFDF7"
                  stroke="#0D9488"
                  strokeWidth="2.5"
                />
              </svg>

              {/* Dynamic Interactive Tooltip Card */}
              <div className="absolute top-2 right-4 sm:right-6 bg-white/95 backdrop-blur-md border border-[#ECE5CC] rounded-xl px-3 py-1.5 shadow-warm-md pointer-events-none transition-all">
                <div className="flex items-center justify-between gap-2.5 text-[9.5px] text-[#8D8975] font-semibold uppercase tracking-wider mb-0.5">
                  <span>
                    {currentDisplayPoint.label} • {activeDataset.title}
                  </span>
                  <span className="text-[#10B981] font-bold">Cut: 25%</span>
                </div>
                <div className="flex items-center gap-2 text-[12px] font-bold">
                  <span className="text-[#D97706] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]"></span>
                    {currentDisplayPoint.spend} / day
                  </span>
                  <span className="text-[#ECE5CC]">|</span>
                  <span className="text-[#0D9488] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0D9488]"></span>
                    {currentDisplayPoint.carbon} CO₂e
                  </span>
                </div>
              </div>

              {/* Projected Savings Badge on the Far Right */}
              <div className="absolute bottom-4 right-3 hidden sm:flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E2F5EF] border border-[#1F8A70]/25 text-[#1F8A70] text-[10px] font-bold pointer-events-none">
                <TrendingDown className="w-3.5 h-3.5" />
                <span>Projected: -$214 / day</span>
              </div>

              {/* Dynamic Time Axis Labels */}
              <div className="absolute bottom-1 inset-x-8 flex justify-between text-[10.5px] font-medium text-[#8D8975] pointer-events-none">
                {activeDataset.labels.map((lbl, idx) => (
                  <span
                    key={lbl + idx}
                    className={
                      idx === activeDataset.labels.length - 1
                        ? "font-bold text-[#2E2B1A] bg-[#FFF76A] px-2 py-0.5 rounded-full border border-[#DFD6B5]"
                        : ""
                    }
                  >
                    {lbl}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 4. Identified Waste Breakdown by Resource */}
          <div className="p-3.5 sm:p-4 rounded-[20px] bg-white border border-[#ECE5CC] shadow-warm-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-bold text-[#2E2B1A]">
                Resource Breakdown
              </span>
              <a
                href="#optimization"
                className="inline-flex items-center gap-1 text-[12px] font-bold text-[#1F8A70] hover:text-[#186E59] group transition-colors"
              >
                <span>Check recommendations (Save $6,420/mo)</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </a>
            </div>

            {/* Segmented Distribution Bar */}
            <div className="w-full h-2 rounded-full bg-[#FAF6E8] overflow-hidden flex gap-0.5 mb-2.5 border border-[#ECE5CC]">
              <div className="h-full bg-[#D97706] rounded-l-full" style={{ width: "42%" }} title="Compute: 42% ($2,696/mo)" />
              <div className="h-full bg-[#4F46E5]" style={{ width: "38%" }} title="Database: 38% ($2,440/mo)" />
              <div className="h-full bg-[#059669] rounded-r-full" style={{ width: "20%" }} title="Storage: 20% ($1,284/mo)" />
            </div>

            {/* 3 Resource Breakdown Pills (End of card, clean & professional) */}
            <div className="grid grid-cols-3 gap-2.5 text-[11.5px]">
              <div className="p-2.5 rounded-xl bg-[#FAF6E8] border border-[#ECE5CC]">
                <div className="flex items-center gap-1 text-[#8D8975] font-semibold mb-0.5">
                  <span className="w-2 h-2 rounded-full bg-[#D97706]"></span>
                  <span>Compute</span>
                </div>
                <div className="font-extrabold text-[#2E2B1A] text-[13.5px]">$2,696 <span className="font-normal text-[10.5px] text-[#8D8975]">/mo</span></div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#FAF6E8] border border-[#ECE5CC]">
                <div className="flex items-center gap-1 text-[#8D8975] font-semibold mb-0.5">
                  <span className="w-2 h-2 rounded-full bg-[#4F46E5]"></span>
                  <span>Database</span>
                </div>
                <div className="font-extrabold text-[#2E2B1A] text-[13.5px]">$2,440 <span className="font-normal text-[10.5px] text-[#8D8975]">/mo</span></div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#FAF6E8] border border-[#ECE5CC]">
                <div className="flex items-center gap-1 text-[#8D8975] font-semibold mb-0.5">
                  <span className="w-2 h-2 rounded-full bg-[#059669]"></span>
                  <span>Storage</span>
                </div>
                <div className="font-extrabold text-[#2E2B1A] text-[13.5px]">$1,284 <span className="font-normal text-[10.5px] text-[#8D8975]">/mo</span></div>
              </div>
            </div>
          </div>

          {/* 5. Security Standard Footer */}
          <div className="pt-1 flex flex-wrap items-center justify-between text-[11.5px] text-[#8D8975] gap-2 px-1">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1F8A70]"></span>
              <span className="text-[#2E2B1A] font-semibold">Security Standard:</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <span>100% Read-Only IAM</span>
              <span>•</span>
              <span>Zero Credentials Stored</span>
              <span>•</span>
              <span>Safe Human Review</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
