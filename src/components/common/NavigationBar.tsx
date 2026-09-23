"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu, X, Sparkles } from "lucide-react";

export function NavigationBar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { label: "Product", href: "/" },
    { label: "Why?", href: "/why" },
    { label: "How it works", href: "/how-it-works" },
    { label: "Cost & Carbon", href: "/#optimization" },
    { label: "Security", href: "/#security" },
    { label: "Documentation", href: "/#documentation" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-[#FFFDF4]/90 backdrop-blur-md pt-2.5 pb-2.5 mb-2 transition-all">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6">
        <div className="bg-[#FFFDF7] border border-[#ECE5CC] rounded-full px-4 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between shadow-warm-sm transition-all">
        {/* Brand Logo & Title */}
        <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group focus:outline-none shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#FFF76A] border border-[#DFD6B5] flex items-center justify-center text-[#2E2B1A] shadow-sm transition-transform group-hover:scale-105">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#2E2B1A]" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path d="M24 4C25.7818 14.2173 33.7827 22.2182 44 24C33.7827 25.7818 25.7818 33.7827 24 44C22.2182 33.7827 14.2173 25.7818 4 24C14.2173 22.2182 22.2182 14.2173 24 4Z" fill="currentColor" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-[#2E2B1A] font-extrabold text-[15px] sm:text-[16px] tracking-tight leading-none">
              GreenCloud AI
            </span>
            <span className="text-[10.5px] text-[#8D8975] font-medium tracking-normal mt-0.5 hidden xs:inline">
              Cloud Cost & Carbon Intelligence
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links (Properly Spaced & Clean) */}
        <nav className="hidden lg:flex items-center gap-4 xl:gap-5 text-[13.5px] font-medium text-[#686450]">
          {navLinks.map((link) => {
            const isActive = link.href === pathname;
            return (
              <Link
                key={link.label}
                href={link.href}
                className={`py-1 px-2.5 rounded-full transition-all relative ${
                  isActive
                    ? "bg-[#FAF6E8] text-[#2E2B1A] font-bold border border-[#ECE5CC] shadow-2xs"
                    : "hover:text-[#2E2B1A]"
                }`}
              >
                <span>{link.label}</span>
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-[2px] bg-[#1F8A70] rounded-full"></span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/dashboard"
            className="hidden md:inline-flex items-center justify-center px-4 py-1.5 rounded-full text-[13px] font-semibold text-[#686450] hover:text-[#2E2B1A] hover:bg-[#FAF6E8] transition-colors"
          >
            Live Demo
          </Link>

          <Link
            href="/onboarding"
            className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-full text-[12.5px] sm:text-[13px] font-bold bg-[#FFF76A] hover:bg-[#F5EC50] text-[#2E2B1A] border border-[#DFD6B5] shadow-sm hover:shadow-sunshine-glow transition-all whitespace-nowrap"
          >
            <span>Start setup</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            className="lg:hidden p-2 rounded-full hover:bg-[#FAF6E8] text-[#2E2B1A] transition-colors focus:outline-none"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden mt-2 p-4 bg-[#FFFDF7] border border-[#ECE5CC] rounded-3xl shadow-warm-lg flex flex-col gap-2 font-medium text-[14px] text-[#2E2B1A] animate-in fade-in slide-in-from-top-2 duration-150">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="px-3.5 py-2.5 rounded-xl hover:bg-[#FAF6E8] flex items-center justify-between"
            >
              <span>{link.label}</span>
              <ArrowRight className="w-4 h-4 text-[#8D8975]" />
            </Link>
          ))}
          <div className="pt-3 mt-1 border-t border-[#ECE5CC] flex items-center justify-between text-xs font-semibold">
            <Link
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="text-[#1F8A70] hover:underline"
            >
              Explore Live Demo →
            </Link>
            <Link
              href="/onboarding"
              onClick={() => setMobileMenuOpen(false)}
              className="text-[#9A6B00] hover:underline"
            >
              Start setup →
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
