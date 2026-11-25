"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HeroShapeMorph } from "@/components/overview/MotionPrimitives";

export function DecisionLoop() {
  const steps = [
    {
      num: "01",
      subtitle: "Read-only IAM role",
      title: "Connect AWS safely",
      desc: "Link your account in minutes via read-only IAM with zero write access.",
      shape: "sunny" as const,
      shapeColor: "text-[#FFE985]",
      numInk: "text-[#524305]",
    },
    {
      num: "02",
      subtitle: "Billing & metrics sync",
      title: "Spot idle waste",
      desc: "Scan CloudWatch usage and billing lines for idle servers and oversized DBs.",
      shape: "clover" as const,
      shapeColor: "text-[#FBE0BC]",
      numInk: "text-[#6B4814]",
    },
    {
      num: "03",
      subtitle: "Impact prioritization",
      title: "Rank cost & carbon",
      desc: "Order each action by monthly dollar savings, regional CO₂e cut, and risk.",
      shape: "flower" as const,
      shapeColor: "text-[#CEECE0]",
      numInk: "text-[#155E4B]",
    },
    {
      num: "04",
      subtitle: "Human-reviewed changes",
      title: "Approve Terraform PRs",
      desc: "Review clean Terraform code diffs and apply fixes on your own schedule.",
      shape: "cookie9" as const,
      shapeColor: "text-[#EAE0BE]",
      numInk: "text-[#2E2B1A]",
    },
  ];

  return (
    <section id="how-it-works" className="scroll-mt-28 space-y-6 sm:space-y-7">
      <div className="gc-rv flex flex-col lg:flex-row lg:items-end justify-between gap-4 items-center text-center lg:text-left">
        <div className="space-y-2">
          <h2 className="text-[28px] sm:text-[34px] font-bold tracking-[-0.02em] text-[#2E2B1A] leading-tight">
            How GreenCloud AI works
          </h2>
          <p className="text-[15.5px] text-[#686450] leading-relaxed max-w-2xl mx-auto lg:mx-0">
            Four clear steps from read-only AWS sync to reviewed Terraform changes.
          </p>
        </div>

        <Link
          href="/how-it-works"
          className="m3-btn m3-btn-compact m3-pastel-oat shrink-0 group"
        >
          <span>Know more</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {steps.map((step) => (
          <div
            key={step.num}
            className="gc-rv gc-rv-pop gc-card-hover group p-5 rounded-[24px] bg-[#FBF6E3] flex flex-col justify-between gap-3.5"
          >
            <div className="flex items-center gap-3.5">
              {/* Distinct Material 3 Expressive Shape Number Badge */}
              <div className="relative w-11 h-11 shrink-0 flex items-center justify-center transition-transform duration-500 ease-out group-hover:scale-105 group-hover:rotate-3">
                <div className={`absolute inset-0 ${step.shapeColor}`}>
                  <HeroShapeMorph shape={step.shape} />
                </div>
                <span
                  className={`relative z-10 text-[14px] font-extrabold tabular-nums tracking-tight ${step.numInk}`}
                >
                  {step.num}
                </span>
              </div>

              <div className="min-w-0">
                <div className="text-[12px] font-semibold text-[#686450] truncate">
                  {step.subtitle}
                </div>
                <h3 className="text-[16.5px] font-bold text-[#2E2B1A] leading-snug">
                  {step.title}
                </h3>
              </div>
            </div>

            <p className="text-[13.5px] text-[#686450] leading-relaxed">
              {step.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
