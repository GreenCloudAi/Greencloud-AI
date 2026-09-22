import React from "react";

export type PillVariant =
  | "sunshine"
  | "honey"
  | "teal"
  | "lavender"
  | "sage"
  | "warning"
  | "neutral";

interface PillBadgeProps {
  children: React.ReactNode;
  variant?: PillVariant;
  className?: string;
  dot?: boolean;
}

export function PillBadge({
  children,
  variant = "neutral",
  className = "",
  dot = false,
}: PillBadgeProps) {
  const variantStyles: Record<PillVariant, { bg: string; text: string; border: string; dotColor?: string }> = {
    sunshine: {
      bg: "bg-[#FFF76A]",
      text: "text-[#2E2B1A]",
      border: "border-[#DFD6B5]",
      dotColor: "bg-[#2E2B1A]",
    },
    honey: {
      bg: "bg-[#FFF3D6]",
      text: "text-[#9A6B00]",
      border: "border-[#ECE5CC]",
      dotColor: "bg-[#9A6B00]",
    },
    teal: {
      bg: "bg-[#E2F5EF]",
      text: "text-[#1F8A70]",
      border: "border-[#1F8A70]/25",
      dotColor: "bg-[#1F8A70]",
    },
    lavender: {
      bg: "bg-[#EFEBFC]",
      text: "text-[#6C63B6]",
      border: "border-[#6C63B6]/25",
      dotColor: "bg-[#6C63B6]",
    },
    sage: {
      bg: "bg-[#EDF4EA]",
      text: "text-[#7C9A6D]",
      border: "border-[#ECE5CC]",
      dotColor: "bg-[#7C9A6D]",
    },
    warning: {
      bg: "bg-[#FDF4DB]",
      text: "text-[#A97A0B]",
      border: "border-[#ECE5CC]",
      dotColor: "bg-[#A97A0B]",
    },
    neutral: {
      bg: "bg-[#FBF6E3]",
      text: "text-[#686450]",
      border: "border-[#ECE5CC]",
      dotColor: "bg-[#8D8975]",
    },
  };

  const style = variantStyles[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold border ${style.bg} ${style.text} ${style.border} ${className}`}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${style.dotColor || "bg-current"}`} />
      )}
      {children}
    </span>
  );
}
