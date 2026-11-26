"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function DocumentationSection() {
  const docs = [
    {
      title: "AWS setup & CloudWatch Agent",
      desc: "Configure Cost Explorer, CUR 2.0, read-only IAM Role, and guest RAM metrics.",
      linkText: "Open AWS docs",
      path: "/docs?provider=aws#providers",
    },
    {
      title: "GCP & Azure provider setup",
      desc: "Enable BigQuery / FOCUS billing exports, OIDC identities, and host memory agents.",
      linkText: "Open multi-cloud docs",
      path: "/docs?provider=gcp#providers",
    },
    {
      title: "Cost, carbon & Terraform workflow",
      desc: "See how billing grain, grid intensity factors, and PR diffs verify real savings.",
      linkText: "Read methodology",
      path: "/docs#methodology",
    },
    {
      title: "Security, APIs & audit governance",
      desc: "Inspect ExternalId protection, REST endpoints, and immutable approval logs.",
      linkText: "Explore security & APIs",
      path: "/docs#security",
    },
  ];

  return (
    <section id="documentation" className="scroll-mt-28 space-y-6 sm:space-y-7">
      <div className="gc-rv flex flex-col lg:flex-row lg:items-end justify-between gap-4 items-center text-center lg:text-left">
        <div className="space-y-2">
          <h2 className="text-[28px] sm:text-[34px] font-bold tracking-[-0.02em] text-[#2E2B1A] leading-tight">
            Technical documentation
          </h2>
          <p className="text-[15.5px] text-[#686450] leading-relaxed max-w-3xl mx-auto lg:mx-0">
            Clear security guides and carbon accounting formulas across every step of setup.
          </p>
        </div>

        <Link
          href="/docs"
          prefetch={true}
          className="m3-btn m3-btn-compact m3-pastel-oat shrink-0 group"
        >
          <span>Open docs</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
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
