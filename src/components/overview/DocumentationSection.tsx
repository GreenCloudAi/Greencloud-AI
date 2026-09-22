"use client";

import Link from "next/link";

export function DocumentationSection() {
  const docs = [
    {
      title: "AWS Read-Only Setup Guide",
      category: "Security & IAM",
      desc: "Step-by-step walk-through for creating an AWS IAM Role with AWS STS AssumeRole, least-privilege read permissions, and External ID protection.",
      icon: "key",
      iconBg: "bg-[#FFF3D6]",
      iconColor: "text-[#9A6B00]",
      badge: "Production Ready",
      linkText: "View AWS IAM Guide",
      path: "/onboarding",
    },
    {
      title: "Cloud Billing Ingestion Guide",
      category: "Cost Analytics",
      desc: "How GreenCloud AI normalizes AWS Cost Explorer and billing lines for unified showback and spend tracking.",
      icon: "schema",
      iconBg: "bg-[#E2F5EF]",
      iconColor: "text-[#1F8A70]",
      badge: "Automated",
      linkText: "Learn About Billing Ingestion",
      path: "#how-it-works",
    },
    {
      title: "Carbon Accounting Methodology",
      category: "Green Cloud Science",
      desc: "The formula translating CloudWatch telemetry (CPU, memory, storage) and power grid carbon intensity into kgCO₂e emissions.",
      icon: "eco",
      iconBg: "bg-[#EDF4EA]",
      iconColor: "text-[#7C9A6D]",
      badge: "Science-Backed",
      linkText: "Explore Carbon Science",
      path: "#why-greenops",
    },
    {
      title: "System Architecture & ER Diagrams",
      category: "Engineering Design",
      desc: "Technical domain models, microservice data flow diagrams, background workers, and PostgreSQL/Prisma database schema.",
      icon: "account_tree",
      iconBg: "bg-[#EFEBFC]",
      iconColor: "text-[#6C63B6]",
      badge: "Technical Specs",
      linkText: "View System Topology",
      path: "#how-it-works",
    },
  ];

  return (
    <section id="documentation" className="mb-20 pt-6">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FBF6E3] border border-[#ECE5CC] mb-3 shadow-warm-sm">
          <span className="w-2 h-2 rounded-full bg-[#1F8A70]"></span>
          <span className="text-[11px] font-mono font-bold tracking-wider text-[#9A6B00] uppercase">
            DOCUMENTATION & GUIDES
          </span>
        </div>
        <h2 className="text-[28px] sm:text-[36px] font-black tracking-tight text-[#2E2B1A] leading-tight mb-3">
          Explore the Technical Foundation
        </h2>
        <p className="text-[15px] sm:text-[16px] text-[#686450] leading-relaxed">
          Open architecture, rigorous carbon methodologies, and enterprise security standards documented from day one.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {docs.map((doc) => (
          <div
            key={doc.title}
            className="p-6 rounded-[22px] bg-[#FFFDF4] border border-[#ECE5CC] hover:border-[#DFD6B5] transition-all shadow-warm-sm flex flex-col justify-between group hover:shadow-warm-md"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`w-10 h-10 rounded-2xl ${doc.iconBg} ${doc.iconColor} flex items-center justify-center border border-[#ECE5CC] group-hover:scale-105 transition-transform`}
                >
                  <span className="material-symbols-outlined text-[20px] leading-none">
                    {doc.icon}
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#FAF6E8] text-[#8D8975] border border-[#ECE5CC]">
                  {doc.badge}
                </span>
              </div>

              <span className="text-[11px] font-mono font-bold text-[#9A6B00] uppercase tracking-wider block mb-1">
                {doc.category}
              </span>
              <h3 className="text-[16px] font-bold text-[#2E2B1A] mb-2 leading-snug">
                {doc.title}
              </h3>
              <p className="text-[12px] text-[#686450] leading-relaxed mb-6">
                {doc.desc}
              </p>
            </div>

            <div className="pt-3.5 border-t border-[#ECE5CC]">
              <Link
                href={doc.path}
                className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#2E2B1A] hover:text-[#9A6B00] transition-colors font-mono"
              >
                <span>{doc.linkText}</span>
                <span className="material-symbols-outlined text-[15px] leading-none transition-transform group-hover:translate-x-0.5">
                  arrow_forward
                </span>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
