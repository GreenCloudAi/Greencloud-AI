"use client";

import { useState } from "react";
import { HeroShapeMorph } from "@/components/overview/MotionPrimitives";
import {
  OptimizationReviewModal,
  type OptimizationReviewItem,
} from "@/components/overview/OptimizationReviewModal";

export interface OptimizationItem extends OptimizationReviewItem {
  category: "compute" | "database" | "storage";
  savings: string;
  annualSavings: string;
  carbon: string;
  problem: string;
  trayBg: string;
  metricInk: string;
}

export function OptimizationSection() {
  const [activeCategory, setActiveCategory] = useState<
    "all" | "compute" | "database" | "storage"
  >("all");
  const [selectedItem, setSelectedItem] = useState<OptimizationItem | null>(
    null
  );

  const optimizationItems: OptimizationItem[] = [
    {
      id: "opt-ec2-01",
      category: "compute",
      title: "Idle development server",
      service: "Amazon EC2",
      resource: "dev-api-server-01",
      region: "us-east-1",
      savings: "$52",
      annualSavings: "$624",
      carbon: "12 kg CO₂e",
      problem:
        "CPU utilization stayed under 2% for 14 consecutive days outside working hours.",
      recommendation:
        "Schedule automatic shutdown during nights and weekends to cut 68% of active runtime.",
      evidence: [
        { label: "14-day P95 CPU", value: "1.8%" },
        { label: "Memory peak", value: "14% of 16 GB" },
        { label: "Off-hours traffic", value: "0 HTTP requests" },
        { label: "Risk level", value: "Low (development)" },
      ],
      terraform: `# Automated nightly schedule for idle test instance
resource "aws_instance" "dev_api_server" {
  instance_state = "stopped"
  tags = {
    AutoShutdown = "true"
    Environment  = "development"
  }
}`,
      shape: "sunny",
      icon: "dns",
      shapeColor: "text-[#FFF3A8]",
      iconInk: "text-[#524305]",
      trayBg: "bg-[#FBF6E3]",
      metricInk: "text-[#2E2B1A]",
    },
    {
      id: "opt-rds-01",
      category: "database",
      title: "Oversized staging database",
      service: "Amazon RDS",
      resource: "staging-postgres-db",
      region: "us-east-1",
      savings: "$184",
      annualSavings: "$2,208",
      carbon: "31 kg CO₂e",
      problem:
        "Peak load stayed below 10% across an 8 vCPU and 32 GB instance over 30 days.",
      recommendation:
        "Downsize to db.t4g.medium (2 vCPU, 8 GB) during your scheduled maintenance window.",
      evidence: [
        { label: "Current size", value: "db.m5.xlarge ($280/mo)" },
        { label: "30-day peak RAM", value: "2.4 GB / 32 GB" },
        { label: "Average IOPS", value: "42 IOPS" },
        { label: "Recommended", value: "db.t4g.medium ($96/mo)" },
      ],
      terraform: `# Downsize staging database to match actual demand
resource "aws_db_instance" "staging_db" {
  instance_class    = "db.t4g.medium"
  apply_immediately = false
}`,
      shape: "flower",
      icon: "database",
      shapeColor: "text-[#FBE7CB]",
      iconInk: "text-[#6B4814]",
      trayBg: "bg-[#FDF2E3]",
      metricInk: "text-[#3A2506]",
    },
    {
      id: "opt-ebs-01",
      category: "storage",
      title: "Unattached storage volume",
      service: "Amazon EBS",
      resource: "vol-backup-disk-500g",
      region: "us-east-1",
      savings: "$40",
      annualSavings: "$480",
      carbon: "6 kg CO₂e",
      problem:
        "500 GB gp3 volume remained detached for 26 days after instance termination.",
      recommendation:
        "Create a snapshot backup, then delete the unattached storage volume.",
      evidence: [
        { label: "Detached duration", value: "26 days" },
        { label: "Volume size", value: "500 GB gp3" },
        { label: "Backup step", value: "Pre-delete snapshot" },
        { label: "Instance status", value: "Terminated" },
      ],
      terraform: `# Create snapshot before deleting detached EBS volume
resource "aws_ebs_snapshot" "safety_backup" {
  volume_id   = "vol-backup-disk-500g"
  description = "Pre-cleanup backup snapshot"
}`,
      shape: "clover",
      icon: "hard_drive",
      shapeColor: "text-[#D7F0E4]",
      iconInk: "text-[#155E4B]",
      trayBg: "bg-[#ECF8F2]",
      metricInk: "text-[#114234]",
    },
    {
      id: "opt-s3-01",
      category: "storage",
      title: "Inactive log bucket tiering",
      service: "Amazon S3",
      resource: "prod-raw-logs-archive",
      region: "us-east-1",
      savings: "$126",
      annualSavings: "$1,512",
      carbon: "15 kg CO₂e",
      problem:
        "8.4 TB of log archives in S3 Standard had zero reads for 90 days.",
      recommendation:
        "Add a lifecycle rule to move objects older than 90 days to Glacier Instant Retrieval.",
      evidence: [
        { label: "Bucket size", value: "8.4 TB Standard" },
        { label: "Last read", value: "92 days ago" },
        { label: "Target tier", value: "Glacier Instant Retrieval" },
        { label: "Retrieval time", value: "Milliseconds" },
      ],
      terraform: `# Transition inactive logs after 90 days
resource "aws_s3_bucket_lifecycle_configuration" "log_tiering" {
  bucket = "prod-raw-logs-archive"
  rule {
    id     = "archive-90d-logs"
    status = "Enabled"
    transition {
      days          = 90
      storage_class = "GLACIER_IR"
    }
  }
}`,
      shape: "cookie9",
      icon: "folder_zip",
      shapeColor: "text-[#D7F0E4]",
      iconInk: "text-[#155E4B]",
      trayBg: "bg-[#ECF8F2]",
      metricInk: "text-[#114234]",
    },
  ];

  const filteredItems =
    activeCategory === "all"
      ? optimizationItems
      : optimizationItems.filter((item) => item.category === activeCategory);

  const categories = [
    { key: "all", label: "All (4)" },
    { key: "compute", label: "Compute" },
    { key: "database", label: "Database" },
    { key: "storage", label: "Storage" },
  ] as const;

  return (
    <section id="optimization" className="scroll-mt-28">
      <div className="p-6 sm:p-8 rounded-[32px] bg-[#FAF6E8] shadow-warm-sm space-y-6 sm:space-y-7">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 text-center lg:text-left items-center">
          <div className="space-y-1.5">
            <h2 className="text-[24px] sm:text-[28px] font-bold text-[#2E2B1A] tracking-[-0.02em]">
              Recommended optimizations
            </h2>
            <p className="text-[14.5px] text-[#686450]">
              Four verified cloud actions with telemetry evidence and Terraform changes.
            </p>
          </div>

          <div
            className="m3-connected-h justify-center lg:justify-start"
            role="group"
            aria-label="Filter optimization category"
          >
            {categories.map((cat) => {
              const selected = activeCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  data-selected={selected}
                  aria-pressed={selected}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`m3-seg ${selected ? "m3-pastel-sun" : "m3-pastel-oat"}`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="gc-card-hover group p-5 sm:p-6 rounded-[28px] bg-[#FFFDF4] flex flex-col justify-between gap-5"
            >
              <div className="space-y-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Material 3 Expressive Organic Shape Icon Container */}
                    <div className="relative w-12 h-12 shrink-0 flex items-center justify-center transition-transform duration-500 ease-out group-hover:scale-105 group-hover:rotate-3">
                      <div className={`absolute inset-0 ${item.shapeColor}`}>
                        <HeroShapeMorph shape={item.shape} />
                      </div>
                      <span
                        className={`material-symbols-outlined icon-filled relative z-10 text-[20px] leading-none ${item.iconInk}`}
                      >
                        {item.icon}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="text-[12.5px] font-semibold text-[#686450] truncate">
                        {item.service} · {item.resource}
                      </div>
                      <h3 className="text-[18px] font-bold text-[#2E2B1A] leading-snug">
                        {item.title}
                      </h3>
                    </div>
                  </div>
                </div>

                <p className="text-[14px] text-[#686450] leading-relaxed">
                  {item.problem}
                </p>
              </div>

              {/* Material 3 Expressive Tonal Savings Tray */}
              <div
                className={`p-3 pl-3.5 sm:pl-4 rounded-[20px] ${item.trayBg} flex flex-wrap items-center justify-between gap-3`}
              >
                <div className="tabular-nums">
                  <div className="flex items-baseline gap-1">
                    <span className={`text-[21px] font-bold leading-none ${item.metricInk}`}>
                      +{item.savings}
                    </span>
                    <span className="text-[12.5px] font-medium text-[#686450]">
                      /mo
                    </span>
                  </div>
                  <div className="text-[12px] text-[#686450] mt-0.5">
                    Cuts {item.carbon} · {item.annualSavings}/yr
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedItem(item)}
                  className="m3-btn m3-btn-compact m3-pastel-sun shrink-0"
                >
                  Review
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <OptimizationReviewModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </section>
  );
}
