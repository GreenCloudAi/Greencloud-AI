"use client";

import Link from "next/link";
import { useAccountStatus } from "@/components/common/AccountStatusContext";

export function ComplianceFooter() {
  const { hasAccount } = useAccountStatus();

  const columns = [
    {
      heading: "Platform",
      links: [
        { label: "Overview", href: "/" },
        { label: "Actions", href: "/#optimization", scroll: false },
        { label: "Integrations", href: "/#integrations", scroll: false },
        { label: hasAccount ? "Dashboard" : "Live demo", href: "/dashboard" },
      ],
    },
    {
      heading: "Resources",
      links: [
        { label: "How it works", href: "/how-it-works" },
        { label: "Why?", href: "/why" },
        { label: "Docs", href: "/docs" },
        { label: "Audit history", href: "/audit-history" },
      ],
    },
    {
      heading: "Setup & Security",
      links: [
        { label: "Connect AWS", href: "/onboarding" },
        { label: "AWS IAM guide", href: "/docs?provider=aws#providers" },
        { label: "Security & IAM", href: "/docs#security" },
        { label: "Terraform workflow", href: "/docs#terraform" },
      ],
    },
  ];

  return (
    <footer
      id="security"
      className="bg-[#FAF6E8] rounded-t-[32px] mt-14 sm:mt-20 pt-12 pb-8 text-[13.5px] text-[#686450] scroll-mt-28"
    >
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Brand & Multi-Cloud Summary */}
          <div className="lg:col-span-5 space-y-4 text-center lg:text-left flex flex-col items-center lg:items-start">
            <Link
              href="/"
              prefetch={true}
              className="inline-flex items-center gap-2.5 group focus:outline-none"
            >
              <span className="w-10 h-10 rounded-[14px] bg-[#FFFDF4] flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105">
                <span className="material-symbols-outlined text-[22px] leading-none text-[#1F8A70]">
                  eco
                </span>
              </span>
              <span className="font-extrabold text-[18px] tracking-[-0.015em] text-[#2E2B1A]">
                GreenCloud AI
              </span>
            </Link>

            <p className="text-[13.5px] text-[#686450] leading-relaxed max-w-sm">
              Cloud cost and carbon optimization platform. Read-only telemetry, human-reviewed Terraform fixes, and verified outcomes.
            </p>

            <div className="flex items-center gap-2 pt-1">
              {[
                { src: "/icons/aws-dark.svg", alt: "AWS", href: "/docs?provider=aws#providers" },
                { src: "/icons/gcp.svg", alt: "Google Cloud", href: "/docs?provider=gcp#providers" },
                { src: "/icons/azure.svg", alt: "Azure", href: "/docs?provider=azure#providers" },
              ].map((icon) => (
                <Link
                  key={icon.alt}
                  href={icon.href}
                  prefetch={true}
                  aria-label={`${icon.alt} setup docs`}
                  title={`${icon.alt} setup docs`}
                  className="w-8 h-8 rounded-xl bg-[#FFFDF4] p-1.5 flex items-center justify-center hover:scale-105 transition-transform"
                >
                  <img
                    src={icon.src}
                    alt={icon.alt}
                    className="w-full h-full object-contain"
                  />
                </Link>
              ))}
            </div>
          </div>

          {/* Structured Link Columns */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-6 sm:gap-8 text-center sm:text-left">
            {columns.map((col) => (
              <div key={col.heading} className="space-y-3">
                <div className="text-[12.5px] font-bold text-[#2E2B1A]">
                  {col.heading}
                </div>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        prefetch={true}
                        scroll={link.scroll ?? true}
                        className="text-[13.5px] font-medium text-[#686450] hover:text-[#155E4B] transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Attribution Bar */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-[12.5px] text-[#686450]">
          <p className="text-center sm:text-left">
            Contributors:{" "}
            <span className="font-semibold text-[#2E2B1A]">
              Anshul Yadav, Anjishnu Srivastava, Anubhav Bansal, and Aru Pandey
            </span>
          </p>
          <p className="text-center sm:text-right font-medium">
            © 2026 GreenCloud AI · Apache 2.0
          </p>
        </div>
      </div>
    </footer>
  );
}
