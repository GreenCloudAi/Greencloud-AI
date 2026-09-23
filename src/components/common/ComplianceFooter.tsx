"use client";

import Link from "next/link";

export function ComplianceFooter() {
  return (
    <footer className="border-t border-[#ECE5CC] bg-[#FFFDF4] py-8 text-[13px] text-[#8D8975] scroll-mt-28" id="security">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 space-y-6">
        {/* Top Row: Brand & Clean Navigation Links */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-5">
          {/* Brand & Project Identity */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#FFF76A] border border-[#DFD6B5] flex items-center justify-center text-[#2E2B1A] text-xs font-black font-mono shadow-xs">
              GC
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#2E2B1A] text-[15px]">GreenCloud AI</span>
                <span className="px-2 py-0.5 rounded-full bg-[#FAF6E8] border border-[#ECE5CC] text-[11px] font-semibold text-[#8D8975]">
                  Mini Project
                </span>
              </div>
              <p className="text-[12px] text-[#686450]">
                Cloud Cost & Carbon Optimization Platform
              </p>
            </div>
          </div>

          {/* Clean Navigation Links */}
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-medium text-[#686450]">
            <Link href="/why" className="hover:text-[#2E2B1A] transition-colors">
              Why?
            </Link>
            <a href="/#optimization" className="hover:text-[#2E2B1A] transition-colors">
              Recommendations
            </a>
            <Link href="/how-it-works" className="hover:text-[#2E2B1A] transition-colors">
              How It Works
            </Link>
            <a href="/#documentation" className="hover:text-[#2E2B1A] transition-colors">
              Documentation
            </a>
            <Link href="/dashboard" className="hover:text-[#2E2B1A] transition-colors">
              Live Demo
            </Link>
            <Link href="/onboarding" className="hover:text-[#2E2B1A] transition-colors">
              Connect AWS
            </Link>
            <Link href="/audit-history" className="hover:text-[#2E2B1A] transition-colors">
              Audit History
            </Link>
          </nav>
        </div>

        {/* Bottom Sub-Bar: Authors & Project License */}
        <div className="pt-5 border-t border-[#ECE5CC]/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-[#8D8975]">
          <p className="text-center sm:text-left">
            Project by{" "}
            <span className="font-semibold text-[#2E2B1A]">
              Anshul Yadav, Anjishnu Srivastava, Anubhav Bansal & Aru Pandey
            </span>
          </p>
          <p className="text-center sm:text-right text-[#8D8975]">
            © 2026 GreenCloud AI • Open Source under Apache 2.0
          </p>
        </div>
      </div>
    </footer>
  );
}
