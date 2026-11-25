"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavigationBar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasAccount, setHasAccount] = useState<boolean>(false);
  const [activeHash, setActiveHash] = useState<string>("");
  const pathname = usePathname();
  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch("/api/cloud-accounts")
      .then((res) => res.json())
      .then((accounts) => {
        if (Array.isArray(accounts) && accounts.length > 0) {
          setHasAccount(true);
        }
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    if (pathname !== "/") {
      setActiveHash("");
      return;
    }

    const sectionIds = ["overview", "optimization", "integrations", "documentation"];
    const updateActive = () => {
      const y = window.scrollY + 140;
      let current = "overview";
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= y) current = id;
      }
      setActiveHash(current === "overview" ? "/" : `/#${current}`);
    };

    updateActive();
    window.addEventListener("scroll", updateActive, { passive: true });
    return () => window.removeEventListener("scroll", updateActive);
  }, [pathname]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (mobileMenuOpen && barRef.current && !barRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileMenuOpen]);

  const navLinks = [
    { label: "Overview", href: "/" },
    { label: "Actions", href: "/#optimization" },
    { label: "How it works", href: "/how-it-works" },
    { label: "Why?", href: "/why" },
    { label: "Integrations", href: "/#integrations" },
    { label: "Docs", href: "/#documentation" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-[#FFFDF4]/95 backdrop-blur-md pt-2.5 pb-2.5 mb-2">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div
          ref={barRef}
          className="relative bg-[#F5EED6] rounded-full p-1.5 sm:p-2 pl-2.5 sm:pl-3 flex items-center gap-2 sm:gap-3 flex-nowrap min-w-0"
        >
          {/* Brand Logo & Wordmark */}
          <Link
            href="/"
            aria-label="GreenCloud AI home"
            className="flex items-center gap-2 sm:gap-2.5 mr-auto min-w-0 shrink-0 group focus:outline-none"
          >
            <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-[13px] sm:rounded-[14px] bg-[#FFFDF4] flex items-center justify-center text-[#2E2B1A] shrink-0 transition-transform duration-200 group-hover:scale-105">
              <span className="material-symbols-outlined text-[20px] sm:text-[22px] leading-none text-[#1F8A70]">
                eco
              </span>
            </span>
            <span className="font-extrabold text-[15.5px] sm:text-[18px] tracking-[-0.015em] text-[#2E2B1A] whitespace-nowrap">
              GreenCloud AI
            </span>
          </Link>

          {/* Desktop Inline Links */}
          <nav
            aria-label="Main navigation"
            className="hidden lg:flex items-center justify-center gap-0.5 min-w-0"
          >
            {navLinks.map((link) => {
              const isActive =
                pathname === "/" ? activeHash === link.href : link.href === pathname;
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`px-2.5 xl:px-3.5 py-2 rounded-full text-[13px] xl:text-[14.5px] font-semibold whitespace-nowrap transition-colors duration-150 ${
                    isActive
                      ? "bg-[#FAF6E8] text-[#2E2B1A]"
                      : "text-[#2E2B1A] hover:bg-[#FAF6E8]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Primary Pill Action Button */}
          <Link
            href={hasAccount ? "/dashboard" : "/onboarding"}
            className="h-[40px] sm:h-[46px] px-3.5 sm:px-5 rounded-full active:scale-[0.99] bg-[#FFF76A] hover:bg-[#F5EC50] text-[#2E2B1A] font-bold text-[13px] sm:text-[14px] inline-flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 transition-[background-color,transform] duration-150"
          >
            <span className="material-symbols-outlined icon-filled text-[18px] sm:text-[19px] leading-none">
              {hasAccount ? "dashboard" : "rocket_launch"}
            </span>
            <span>{hasAccount ? "Dashboard" : "Start setup"}</span>
          </Link>

          {/* Secondary Quick Icon Action (visible on sm+ so narrow 320px phones stay clean) */}
          <Link
            href={hasAccount ? "/onboarding" : "/dashboard"}
            aria-label={hasAccount ? "Connect AWS account" : "Open live demo"}
            title={hasAccount ? "Connect AWS account" : "Open live demo"}
            className="hidden sm:inline-flex w-[46px] h-[46px] rounded-full active:scale-[0.99] bg-[#FAF6E8] hover:bg-[#EAE2C7] text-[#2E2B1A] items-center justify-center shrink-0 transition-[background-color,transform] duration-150"
          >
            <span className="material-symbols-outlined text-[22px] leading-none">
              {hasAccount ? "link" : "play_circle"}
            </span>
          </Link>

          {/* Compact Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            className="lg:hidden w-[40px] h-[40px] sm:w-[46px] sm:h-[46px] rounded-full hover:bg-[#EDE3C2] text-[#2E2B1A] inline-flex items-center justify-center shrink-0 transition-colors duration-150"
          >
            <span className="material-symbols-outlined text-[21px] sm:text-[22px] leading-none">
              {mobileMenuOpen ? "close" : "menu"}
            </span>
          </button>

          {/* Responsive Popover Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden absolute top-[calc(100%+10px)] left-0 right-0 p-2.5 bg-[#F5EED6] rounded-[32px] shadow-warm-xl flex flex-col gap-0.5 z-40">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-5 py-3 text-[15px] font-semibold text-[#2E2B1A] rounded-[20px] hover:bg-[#FAF6E8] transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href={hasAccount ? "/onboarding" : "/dashboard"}
                onClick={() => setMobileMenuOpen(false)}
                className="sm:hidden px-5 py-3 text-[15px] font-semibold text-[#155E4B] rounded-[20px] hover:bg-[#FAF6E8] transition-colors"
              >
                {hasAccount ? "Connect AWS account" : "Live demo"}
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
