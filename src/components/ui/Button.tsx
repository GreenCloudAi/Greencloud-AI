import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
  rounded?: "full" | "xl" | "2xl";
  icon?: string;
  iconPosition?: "left" | "right";
  children: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  rounded = "full",
  icon,
  iconPosition = "right",
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const roundedClasses = {
    full: "rounded-full",
    xl: "rounded-xl",
    "2xl": "rounded-2xl",
  }[rounded];

  const sizeClasses = {
    sm: "px-3.5 py-1.5 text-[12px]",
    md: "px-5 py-2.5 text-[13.5px]",
    lg: "px-6 py-3.5 text-[15px]",
  }[size];

  const variantClasses = {
    primary:
      "bg-[#FFF76A] hover:bg-[#F5EC50] text-[#2E2B1A] font-bold border border-[#DFD6B5] shadow-sm hover:shadow-[0_4px_20px_rgba(255,247,106,0.45)] active:scale-[0.98]",
    secondary:
      "bg-[#FFFDF4] hover:bg-[#FBF6E3] text-[#2E2B1A] font-semibold border border-[#ECE5CC] shadow-warm-sm active:scale-[0.98]",
    outline:
      "bg-transparent hover:bg-[#FBF6E3] text-[#686450] hover:text-[#2E2B1A] font-medium border border-[#ECE5CC]",
    danger:
      "bg-transparent hover:bg-red-50 text-red-600 font-semibold border border-red-200 hover:border-red-300",
  }[variant];

  const disabledClasses = disabled
    ? "opacity-60 cursor-not-allowed pointer-events-none hover:shadow-none active:scale-100"
    : "";

  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 transition-all duration-200 ${roundedClasses} ${sizeClasses} ${variantClasses} ${disabledClasses} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && iconPosition === "left" && (
        <span className="material-symbols-outlined text-[17px] leading-none">{icon}</span>
      )}
      <span>{children}</span>
      {icon && iconPosition === "right" && (
        <span className="material-symbols-outlined text-[17px] leading-none">{icon}</span>
      )}
    </button>
  );
}
