"use client";

import Link from "next/link";

export function ComplianceFooter() {
  return (
    <footer className="bg-[#FAF6E8] py-10 mt-14 sm:mt-20 text-[13px] text-[#686450] scroll-mt-28" id="security">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FFF76A] flex items-center justify-center text-[#2E2B1A]">
              <span className="material-symbols-outlined text-[20px] leading-none">
                eco
              </span>
            </div>
            <div>
              <div className="font-bold text-[#2E2B1A] text-[15px]">
                GreenCloud AI
              </div>
              <p className="text-[12.5px] text-[#686450]">
                Cloud cost and carbon optimization control plane
              </p>
            </div>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-medium text-[#686450]">
            <Link href="/why" className="hover:text-[#2E2B1A] transition-colors">
              Why?
            </Link>
            <a href="/#optimization" className="hover:text-[#2E2B1A] transition-colors">
              Recommendations
            </a>
            <Link href="/how-it-works" className="hover:text-[#2E2B1A] transition-colors">
              How it works
            </Link>
            <a href="/#documentation" className="hover:text-[#2E2B1A] transition-colors">
              Docs
            </a>
            <Link href="/dashboard" className="hover:text-[#2E2B1A] transition-colors">
              Live demo
            </Link>
            <Link href="/onboarding" className="hover:text-[#2E2B1A] transition-colors">
              Connect AWS
            </Link>
            <Link href="/audit-history" className="hover:text-[#2E2B1A] transition-colors">
              Audit history
            </Link>
          </nav>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[12.5px] text-[#686450]">
          <p className="text-center sm:text-left">
            Built by{" "}
            <span className="font-semibold text-[#2E2B1A]">
              Anshul Yadav, Anjishnu Srivastava, Anubhav Bansal, and Aru Pandey
            </span>
          </p>
          <p className="text-center sm:text-right">
            © 2026 GreenCloud AI · Apache 2.0
          </p>
        </div>
      </div>
    </footer>
  );
}
