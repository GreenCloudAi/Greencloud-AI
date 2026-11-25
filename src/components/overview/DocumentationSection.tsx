"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function DocumentationSection() {
  const docs = [
    {
      title: "AWS read-only setup guide",
      desc: "Create a least-privilege IAM role using STS AssumeRole and External ID verification.",
      linkText: "Open IAM guide",
      path: "/onboarding",
    },
    {
      title: "Billing ingestion methodology",
      desc: "Learn how AWS Cost Explorer and billing records normalize into daily spend tracking.",
      linkText: "How it works",
      path: "/how-it-works",
    },
    {
      title: "Carbon estimation formula",
      desc: "See how CloudWatch CPU, memory, and storage convert into regional power and CO₂e totals.",
      linkText: "Why?",
      path: "/why",
    },
    {
      title: "Live governance and audit logs",
      desc: "Inspect how approved actions and Terraform recommendations are recorded over time.",
      linkText: "View audit history",
      path: "/audit-history",
    },
  ];

  return (
    <section id="documentation" className="scroll-mt-28 space-y-6 sm:space-y-7">
      <div className="gc-rv space-y-2 text-center lg:text-left">
        <h2 className="text-[28px] sm:text-[34px] font-bold tracking-[-0.02em] text-[#2E2B1A] leading-tight">
          Technical documentation
        </h2>
        <p className="text-[15.5px] text-[#686450] leading-relaxed max-w-3xl mx-auto lg:mx-0">
          Clear security guides and carbon accounting formulas across every step of setup.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {docs.map((doc) => (
          <div
            key={doc.title}
            className="gc-rv gc-rv-pop gc-card-hover p-6 rounded-[24px] bg-[#FBF6E3] flex flex-col justify-between gap-6 group"
          >
            <div className="space-y-2">
              <h3 className="text-[16.5px] font-bold text-[#2E2B1A] leading-snug">
                {doc.title}
              </h3>
              <p className="text-[13.5px] text-[#686450] leading-relaxed">
                {doc.desc}
              </p>
            </div>

            <Link
              href={doc.path}
              className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[#2E2B1A] hover:text-[#686450] transition-colors"
            >
              <span>{doc.linkText}</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
