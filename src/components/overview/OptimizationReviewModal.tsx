"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Copy, X } from "lucide-react";
import { HeroShapeMorph } from "@/components/overview/MotionPrimitives";

export interface OptimizationReviewItem {
  id: string;
  title: string;
  service: string;
  resource: string;
  region: string;
  recommendation: string;
  evidence: {
    label: string;
    value: string;
  }[];
  terraform: string;
  shape: "sunny" | "flower" | "clover" | "cookie9";
  icon: string;
  shapeColor: string;
  iconInk: string;
}

interface OptimizationReviewModalProps {
  item: OptimizationReviewItem | null;
  onClose: () => void;
}

/**
 * Shared warm-surface modal showing telemetry evidence and a copyable Terraform diff.
 */
export function OptimizationReviewModal({
  item,
  onClose,
}: OptimizationReviewModalProps) {
  const [copiedTerraform, setCopiedTerraform] = useState(false);

  useEffect(() => {
    setCopiedTerraform(false);
    if (!item) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [item, onClose]);

  if (!item) return null;

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedTerraform(true);
    setTimeout(() => setCopiedTerraform(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#2E2B1A]/35 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`opt-modal-title-${item.id}`}
        className="bg-[#FFFDF4] rounded-[28px] max-w-lg w-full max-h-[90dvh] overflow-y-auto custom-scrollbar p-5 sm:p-6 shadow-warm-xl space-y-5 gc-hero-enter"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative w-11 h-11 shrink-0 flex items-center justify-center">
              <div className={`absolute inset-0 ${item.shapeColor}`}>
                <HeroShapeMorph shape={item.shape} />
              </div>
              <span
                className={`material-symbols-outlined icon-filled relative z-10 text-[18px] leading-none ${item.iconInk}`}
              >
                {item.icon}
              </span>
            </div>
            <div>
              <h4
                id={`opt-modal-title-${item.id}`}
                className="font-bold text-[18px] text-[#2E2B1A]"
              >
                {item.title}
              </h4>
              <p className="text-[13px] text-[#686450] mt-0.5">
                {item.service} · {item.resource} · {item.region}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-9 h-9 rounded-full bg-[#FAF6E8] hover:bg-[#F5EED6] flex items-center justify-center text-[#2E2B1A] transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-[13.5px] text-[#686450]">
          <p className="p-3.5 rounded-2xl bg-[#FAF6E8] text-[#2E2B1A] leading-relaxed">
            {item.recommendation}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {item.evidence.map((ev) => (
              <div key={ev.label} className="p-3 rounded-2xl bg-[#FAF6E8]">
                <div className="text-[12px] text-[#686450]">{ev.label}</div>
                <div className="text-[13.5px] font-semibold text-[#2E2B1A] tabular-nums">
                  {ev.value}
                </div>
              </div>
            ))}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12.5px] font-semibold text-[#2E2B1A]">
                Terraform change
              </span>
              <button
                type="button"
                onClick={() => handleCopyCode(item.terraform)}
                className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#2E2B1A] hover:text-[#686450]"
              >
                {copiedTerraform ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3.5 rounded-2xl bg-[#2E2B1A] text-[#FFFDF4] code-font text-[12px] overflow-x-auto leading-relaxed">
              {item.terraform}
            </pre>
          </div>
        </div>

        <div className="flex items-center justify-end pt-1">
          <div className="m3-connected-h">
            <button
              type="button"
              onClick={onClose}
              className="m3-seg m3-pastel-oat"
            >
              Close
            </button>
            <Link
              href="/onboarding"
              data-selected="true"
              className="m3-seg m3-pastel-sun"
            >
              <span>Connect AWS to apply</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
