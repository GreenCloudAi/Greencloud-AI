/**
 * AWS EC2 Machine Catalog & Target Instance Rightsizing Engine
 * Maps current instance families to exact target machines based on CPU telemetry,
 * providing deterministic sizing, specs, cost savings, and ESG carbon reduction.
 */

import { getSnapshotRegionPrices } from "./pricing/snapshotStore";

export interface MachineSpec {
  instanceType: string;
  family: string;
  vCpu: number;
  memoryGb: number;
  architecture: "x86_64" | "arm64";
  hourlyRateUsd: number;
  monthlyCostUsd: number; // 730 hours / month
  baselineNetwork: string;
  category: "General Purpose" | "Compute Optimized" | "Memory Optimized" | "Burstable";
  isGraviton: boolean;
}

export interface TargetMachineShift {
  currentMachine: string;
  currentSpecs: string;
  currentMonthlyCost: number;
  targetMachine: string;
  targetSpecs: string;
  targetMonthlyCost: number;
  monthlySavings: number;
  savingsPercentage: number;
  annualSavings: number;
  carbonReductionPercent: number;
  safetyMarginPercent: number;
  architecture: "arm64" | "x86_64";
  category: string;
  alternativeX86Target: string;
  alternativeX86Specs: string;
  alternativeX86MonthlyCost: number;
  alternativeX86Savings: number;
  agentCliCommand: string;
  agentTerraformSnippet: string;
  agentActionDescription: string;
}

export const EC2_CATALOG: Record<string, MachineSpec> = {
  // Burstable T3 (x86_64)
  "t3.nano": { instanceType: "t3.nano", family: "t3", vCpu: 2, memoryGb: 0.5, architecture: "x86_64", hourlyRateUsd: 0.0052, monthlyCostUsd: 3.80, baselineNetwork: "Up to 5 Gbps", category: "Burstable", isGraviton: false },
  "t3.micro": { instanceType: "t3.micro", family: "t3", vCpu: 2, memoryGb: 1, architecture: "x86_64", hourlyRateUsd: 0.0104, monthlyCostUsd: 7.59, baselineNetwork: "Up to 5 Gbps", category: "Burstable", isGraviton: false },
  "t3.small": { instanceType: "t3.small", family: "t3", vCpu: 2, memoryGb: 2, architecture: "x86_64", hourlyRateUsd: 0.0208, monthlyCostUsd: 15.18, baselineNetwork: "Up to 5 Gbps", category: "Burstable", isGraviton: false },
  "t3.medium": { instanceType: "t3.medium", family: "t3", vCpu: 2, memoryGb: 4, architecture: "x86_64", hourlyRateUsd: 0.0416, monthlyCostUsd: 30.37, baselineNetwork: "Up to 5 Gbps", category: "Burstable", isGraviton: false },
  "t3.large": { instanceType: "t3.large", family: "t3", vCpu: 2, memoryGb: 8, architecture: "x86_64", hourlyRateUsd: 0.0832, monthlyCostUsd: 60.74, baselineNetwork: "Up to 5 Gbps", category: "Burstable", isGraviton: false },
  "t3.xlarge": { instanceType: "t3.xlarge", family: "t3", vCpu: 4, memoryGb: 16, architecture: "x86_64", hourlyRateUsd: 0.1664, monthlyCostUsd: 121.47, baselineNetwork: "Up to 5 Gbps", category: "Burstable", isGraviton: false },
  "t3.2xlarge": { instanceType: "t3.2xlarge", family: "t3", vCpu: 8, memoryGb: 32, architecture: "x86_64", hourlyRateUsd: 0.3328, monthlyCostUsd: 242.94, baselineNetwork: "Up to 5 Gbps", category: "Burstable", isGraviton: false },

  // Burstable T4g (Graviton3 / Arm64)
  "t4g.nano": { instanceType: "t4g.nano", family: "t4g", vCpu: 2, memoryGb: 0.5, architecture: "arm64", hourlyRateUsd: 0.0042, monthlyCostUsd: 3.07, baselineNetwork: "Up to 5 Gbps", category: "Burstable", isGraviton: true },
  "t4g.micro": { instanceType: "t4g.micro", family: "t4g", vCpu: 2, memoryGb: 1, architecture: "arm64", hourlyRateUsd: 0.0084, monthlyCostUsd: 6.13, baselineNetwork: "Up to 5 Gbps", category: "Burstable", isGraviton: true },
  "t4g.small": { instanceType: "t4g.small", family: "t4g", vCpu: 2, memoryGb: 2, architecture: "arm64", hourlyRateUsd: 0.0168, monthlyCostUsd: 12.26, baselineNetwork: "Up to 5 Gbps", category: "Burstable", isGraviton: true },
  "t4g.medium": { instanceType: "t4g.medium", family: "t4g", vCpu: 2, memoryGb: 4, architecture: "arm64", hourlyRateUsd: 0.0336, monthlyCostUsd: 24.53, baselineNetwork: "Up to 5 Gbps", category: "Burstable", isGraviton: true },
  "t4g.large": { instanceType: "t4g.large", family: "t4g", vCpu: 2, memoryGb: 8, architecture: "arm64", hourlyRateUsd: 0.0672, monthlyCostUsd: 49.06, baselineNetwork: "Up to 5 Gbps", category: "Burstable", isGraviton: true },
  "t4g.xlarge": { instanceType: "t4g.xlarge", family: "t4g", vCpu: 4, memoryGb: 16, architecture: "arm64", hourlyRateUsd: 0.1344, monthlyCostUsd: 98.11, baselineNetwork: "Up to 5 Gbps", category: "Burstable", isGraviton: true },
  "t4g.2xlarge": { instanceType: "t4g.2xlarge", family: "t4g", vCpu: 8, memoryGb: 32, architecture: "arm64", hourlyRateUsd: 0.2688, monthlyCostUsd: 196.22, baselineNetwork: "Up to 5 Gbps", category: "Burstable", isGraviton: true },

  // General Purpose M5 (x86_64)
  "m5.large": { instanceType: "m5.large", family: "m5", vCpu: 2, memoryGb: 8, architecture: "x86_64", hourlyRateUsd: 0.096, monthlyCostUsd: 70.08, baselineNetwork: "Up to 10 Gbps", category: "General Purpose", isGraviton: false },
  "m5.xlarge": { instanceType: "m5.xlarge", family: "m5", vCpu: 4, memoryGb: 16, architecture: "x86_64", hourlyRateUsd: 0.192, monthlyCostUsd: 140.16, baselineNetwork: "Up to 10 Gbps", category: "General Purpose", isGraviton: false },
  "m5.2xlarge": { instanceType: "m5.2xlarge", family: "m5", vCpu: 8, memoryGb: 32, architecture: "x86_64", hourlyRateUsd: 0.384, monthlyCostUsd: 280.32, baselineNetwork: "Up to 10 Gbps", category: "General Purpose", isGraviton: false },
  "m5.4xlarge": { instanceType: "m5.4xlarge", family: "m5", vCpu: 16, memoryGb: 64, architecture: "x86_64", hourlyRateUsd: 0.768, monthlyCostUsd: 560.64, baselineNetwork: "Up to 10 Gbps", category: "General Purpose", isGraviton: false },

  // General Purpose M7g (Graviton3 / Arm64)
  "m7g.medium": { instanceType: "m7g.medium", family: "m7g", vCpu: 1, memoryGb: 4, architecture: "arm64", hourlyRateUsd: 0.0388, monthlyCostUsd: 28.32, baselineNetwork: "Up to 12.5 Gbps", category: "General Purpose", isGraviton: true },
  "m7g.large": { instanceType: "m7g.large", family: "m7g", vCpu: 2, memoryGb: 8, architecture: "arm64", hourlyRateUsd: 0.0776, monthlyCostUsd: 56.65, baselineNetwork: "Up to 12.5 Gbps", category: "General Purpose", isGraviton: true },
  "m7g.xlarge": { instanceType: "m7g.xlarge", family: "m7g", vCpu: 4, memoryGb: 16, architecture: "arm64", hourlyRateUsd: 0.1552, monthlyCostUsd: 113.30, baselineNetwork: "Up to 12.5 Gbps", category: "General Purpose", isGraviton: true },
  "m7g.2xlarge": { instanceType: "m7g.2xlarge", family: "m7g", vCpu: 8, memoryGb: 32, architecture: "arm64", hourlyRateUsd: 0.3104, monthlyCostUsd: 226.59, baselineNetwork: "Up to 12.5 Gbps", category: "General Purpose", isGraviton: true },

  // Compute Optimized C5 (x86_64)
  "c5.large": { instanceType: "c5.large", family: "c5", vCpu: 2, memoryGb: 4, architecture: "x86_64", hourlyRateUsd: 0.085, monthlyCostUsd: 62.05, baselineNetwork: "Up to 10 Gbps", category: "Compute Optimized", isGraviton: false },
  "c5.xlarge": { instanceType: "c5.xlarge", family: "c5", vCpu: 4, memoryGb: 8, architecture: "x86_64", hourlyRateUsd: 0.170, monthlyCostUsd: 124.10, baselineNetwork: "Up to 10 Gbps", category: "Compute Optimized", isGraviton: false },
  "c5.2xlarge": { instanceType: "c5.2xlarge", family: "c5", vCpu: 8, memoryGb: 16, architecture: "x86_64", hourlyRateUsd: 0.340, monthlyCostUsd: 248.20, baselineNetwork: "Up to 10 Gbps", category: "Compute Optimized", isGraviton: false },

  // Compute Optimized C7g (Graviton3 / Arm64)
  "c7g.medium": { instanceType: "c7g.medium", family: "c7g", vCpu: 1, memoryGb: 2, architecture: "arm64", hourlyRateUsd: 0.0361, monthlyCostUsd: 26.35, baselineNetwork: "Up to 12.5 Gbps", category: "Compute Optimized", isGraviton: true },
  "c7g.large": { instanceType: "c7g.large", family: "c7g", vCpu: 2, memoryGb: 4, architecture: "arm64", hourlyRateUsd: 0.0722, monthlyCostUsd: 52.71, baselineNetwork: "Up to 12.5 Gbps", category: "Compute Optimized", isGraviton: true },
  "c7g.xlarge": { instanceType: "c7g.xlarge", family: "c7g", vCpu: 4, memoryGb: 8, architecture: "arm64", hourlyRateUsd: 0.1444, monthlyCostUsd: 105.41, baselineNetwork: "Up to 12.5 Gbps", category: "Compute Optimized", isGraviton: true },
  "c7g.2xlarge": { instanceType: "c7g.2xlarge", family: "c7g", vCpu: 8, memoryGb: 16, architecture: "arm64", hourlyRateUsd: 0.2888, monthlyCostUsd: 210.82, baselineNetwork: "Up to 12.5 Gbps", category: "Compute Optimized", isGraviton: true },

  // Memory Optimized R5 (x86_64)
  "r5.large": { instanceType: "r5.large", family: "r5", vCpu: 2, memoryGb: 16, architecture: "x86_64", hourlyRateUsd: 0.126, monthlyCostUsd: 91.98, baselineNetwork: "Up to 10 Gbps", category: "Memory Optimized", isGraviton: false },
  "r5.xlarge": { instanceType: "r5.xlarge", family: "r5", vCpu: 4, memoryGb: 32, architecture: "x86_64", hourlyRateUsd: 0.252, monthlyCostUsd: 183.96, baselineNetwork: "Up to 10 Gbps", category: "Memory Optimized", isGraviton: false },
  "r5.2xlarge": { instanceType: "r5.2xlarge", family: "r5", vCpu: 8, memoryGb: 64, architecture: "x86_64", hourlyRateUsd: 0.504, monthlyCostUsd: 367.92, baselineNetwork: "Up to 10 Gbps", category: "Memory Optimized", isGraviton: false },

  // Memory Optimized R6g / R7g (Graviton / Arm64)
  "r6g.medium": { instanceType: "r6g.medium", family: "r6g", vCpu: 1, memoryGb: 8, architecture: "arm64", hourlyRateUsd: 0.0504, monthlyCostUsd: 36.79, baselineNetwork: "Up to 10 Gbps", category: "Memory Optimized", isGraviton: true },
  "r6g.large": { instanceType: "r6g.large", family: "r6g", vCpu: 2, memoryGb: 16, architecture: "arm64", hourlyRateUsd: 0.1008, monthlyCostUsd: 73.58, baselineNetwork: "Up to 10 Gbps", category: "Memory Optimized", isGraviton: true },
  "r6g.xlarge": { instanceType: "r6g.xlarge", family: "r6g", vCpu: 4, memoryGb: 32, architecture: "arm64", hourlyRateUsd: 0.2016, monthlyCostUsd: 147.17, baselineNetwork: "Up to 10 Gbps", category: "Memory Optimized", isGraviton: true },
  "r7g.medium": { instanceType: "r7g.medium", family: "r7g", vCpu: 1, memoryGb: 8, architecture: "arm64", hourlyRateUsd: 0.0536, monthlyCostUsd: 39.13, baselineNetwork: "Up to 12.5 Gbps", category: "Memory Optimized", isGraviton: true },
  "r7g.large": { instanceType: "r7g.large", family: "r7g", vCpu: 2, memoryGb: 16, architecture: "arm64", hourlyRateUsd: 0.1071, monthlyCostUsd: 78.18, baselineNetwork: "Up to 12.5 Gbps", category: "Memory Optimized", isGraviton: true },
  "r7g.xlarge": { instanceType: "r7g.xlarge", family: "r7g", vCpu: 4, memoryGb: 32, architecture: "arm64", hourlyRateUsd: 0.2142, monthlyCostUsd: 156.37, baselineNetwork: "Up to 12.5 Gbps", category: "Memory Optimized", isGraviton: true },

  // Legacy T2 (x86_64)
  "t2.nano": { instanceType: "t2.nano", family: "t2", vCpu: 1, memoryGb: 0.5, architecture: "x86_64", hourlyRateUsd: 0.0058, monthlyCostUsd: 4.23, baselineNetwork: "Low to Moderate", category: "Burstable", isGraviton: false },
  "t2.micro": { instanceType: "t2.micro", family: "t2", vCpu: 1, memoryGb: 1, architecture: "x86_64", hourlyRateUsd: 0.0116, monthlyCostUsd: 8.47, baselineNetwork: "Low to Moderate", category: "Burstable", isGraviton: false },
  "t2.small": { instanceType: "t2.small", family: "t2", vCpu: 1, memoryGb: 2, architecture: "x86_64", hourlyRateUsd: 0.023, monthlyCostUsd: 16.79, baselineNetwork: "Low to Moderate", category: "Burstable", isGraviton: false },
  "t2.medium": { instanceType: "t2.medium", family: "t2", vCpu: 2, memoryGb: 4, architecture: "x86_64", hourlyRateUsd: 0.0464, monthlyCostUsd: 33.87, baselineNetwork: "Low to Moderate", category: "Burstable", isGraviton: false },
  "t2.large": { instanceType: "t2.large", family: "t2", vCpu: 2, memoryGb: 8, architecture: "x86_64", hourlyRateUsd: 0.0928, monthlyCostUsd: 67.74, baselineNetwork: "Low to Moderate", category: "Burstable", isGraviton: false },
};

export const AZURE_VM_CATALOG: Record<string, MachineSpec> = {
  "standard_b1ls": { instanceType: "Standard_B1ls", family: "B", vCpu: 1, memoryGb: 0.5, architecture: "x86_64", hourlyRateUsd: 0.0052, monthlyCostUsd: 3.80, baselineNetwork: "Low", category: "Burstable", isGraviton: false },
  "standard_b1s": { instanceType: "Standard_B1s", family: "B", vCpu: 1, memoryGb: 1, architecture: "x86_64", hourlyRateUsd: 0.0104, monthlyCostUsd: 7.59, baselineNetwork: "Moderate", category: "Burstable", isGraviton: false },
  "standard_b2s": { instanceType: "Standard_B2s", family: "B", vCpu: 2, memoryGb: 4, architecture: "x86_64", hourlyRateUsd: 0.0416, monthlyCostUsd: 30.37, baselineNetwork: "Moderate", category: "Burstable", isGraviton: false },
  "standard_b2ms": { instanceType: "Standard_B2ms", family: "B", vCpu: 2, memoryGb: 8, architecture: "x86_64", hourlyRateUsd: 0.0832, monthlyCostUsd: 60.74, baselineNetwork: "Moderate", category: "Burstable", isGraviton: false },
  "standard_b2ps_v2": { instanceType: "Standard_B2ps_v2", family: "Bps_v2", vCpu: 2, memoryGb: 4, architecture: "arm64", hourlyRateUsd: 0.032, monthlyCostUsd: 23.36, baselineNetwork: "Moderate", category: "Burstable", isGraviton: true },
  "standard_d2s_v5": { instanceType: "Standard_D2s_v5", family: "Ds_v5", vCpu: 2, memoryGb: 8, architecture: "x86_64", hourlyRateUsd: 0.096, monthlyCostUsd: 70.08, baselineNetwork: "Up to 12.5 Gbps", category: "General Purpose", isGraviton: false },
  "standard_d4s_v5": { instanceType: "Standard_D4s_v5", family: "Ds_v5", vCpu: 4, memoryGb: 16, architecture: "x86_64", hourlyRateUsd: 0.192, monthlyCostUsd: 140.16, baselineNetwork: "Up to 12.5 Gbps", category: "General Purpose", isGraviton: false },
  "standard_d8s_v5": { instanceType: "Standard_D8s_v5", family: "Ds_v5", vCpu: 8, memoryGb: 32, architecture: "x86_64", hourlyRateUsd: 0.384, monthlyCostUsd: 280.32, baselineNetwork: "Up to 12.5 Gbps", category: "General Purpose", isGraviton: false },
  "standard_d2ps_v5": { instanceType: "Standard_D2ps_v5", family: "Dps_v5", vCpu: 2, memoryGb: 8, architecture: "arm64", hourlyRateUsd: 0.077, monthlyCostUsd: 56.21, baselineNetwork: "Up to 12.5 Gbps", category: "General Purpose", isGraviton: true },
  "standard_d4ps_v5": { instanceType: "Standard_D4ps_v5", family: "Dps_v5", vCpu: 4, memoryGb: 16, architecture: "arm64", hourlyRateUsd: 0.154, monthlyCostUsd: 112.42, baselineNetwork: "Up to 12.5 Gbps", category: "General Purpose", isGraviton: true },
  "standard_f4s_v2": { instanceType: "Standard_F4s_v2", family: "Fs_v2", vCpu: 4, memoryGb: 8, architecture: "x86_64", hourlyRateUsd: 0.169, monthlyCostUsd: 123.37, baselineNetwork: "High", category: "Compute Optimized", isGraviton: false },
  "standard_e4s_v5": { instanceType: "Standard_E4s_v5", family: "Es_v5", vCpu: 4, memoryGb: 32, architecture: "x86_64", hourlyRateUsd: 0.252, monthlyCostUsd: 183.96, baselineNetwork: "Up to 12.5 Gbps", category: "Memory Optimized", isGraviton: false },
};

/**
 * Deterministically determines the exact name of the machine to shift to,
 * providing both modern Graviton3 (Arm64) and same-family x86 target alternatives.
 */
export function calculateTargetMachine(
  currentType: string | null | undefined,
  peakCpu: number = 18,
  avgCpu: number = 8,
  actualMonthlyCost?: number | null,
  resourceId: string = "i-0c1f948e5cc96d55c",
  region: string = "ap-south-1"
): TargetMachineShift {
  const normType = (currentType || "t3.large").trim().toLowerCase();

  if (normType.startsWith("standard_")) {
    return calculateAzureTargetMachine(
      normType,
      peakCpu,
      actualMonthlyCost,
      resourceId,
      region
    );
  }
  const currentSpec = EC2_CATALOG[normType] || {
    instanceType: normType,
    family: normType.split(".")[0] || "t3",
    vCpu: 2,
    memoryGb: 8,
    architecture: "x86_64" as const,
    hourlyRateUsd: 0.0832,
    monthlyCostUsd: actualMonthlyCost || 60.74,
    baselineNetwork: "Up to 5 Gbps",
    category: "General Purpose" as const,
    isGraviton: false,
  };

  const regionPrices = getSnapshotRegionPrices("aws", region);
  const currentLive = regionPrices.get(normType)?.monthlyUsd;
  const currentCost = actualMonthlyCost && actualMonthlyCost > 0
    ? actualMonthlyCost
    : (currentLive ?? currentSpec.monthlyCostUsd);

  let targetName = "t4g.small";
  let altX86Name = "t3.small";
  let targetSpec = EC2_CATALOG["t4g.small"];
  let altX86Spec = EC2_CATALOG["t3.small"];
  let carbonReduction = 60; // default -60% carbon for Graviton

  // Deterministic mapping table based on current family & peak utilization
  switch (normType) {
    case "t3.2xlarge":
      if (peakCpu < 20) {
        targetName = "t4g.medium";
        altX86Name = "t3.medium";
      } else {
        targetName = "t4g.xlarge";
        altX86Name = "t3.xlarge";
      }
      break;

    case "t3.xlarge":
      if (peakCpu < 20) {
        targetName = "t4g.small";
        altX86Name = "t3.small";
      } else {
        targetName = "t4g.medium";
        altX86Name = "t3.medium";
      }
      break;

    case "t3.large":
      if (peakCpu < 20) {
        targetName = "t4g.micro";
        altX86Name = "t3.micro";
      } else {
        targetName = "t4g.small";
        altX86Name = "t3.small";
      }
      break;

    case "t3.medium":
      targetName = peakCpu < 15 ? "t4g.nano" : "t4g.micro";
      altX86Name = peakCpu < 15 ? "t3.nano" : "t3.micro";
      break;

    case "m5.4xlarge":
      targetName = peakCpu < 25 ? "m7g.large" : "m7g.xlarge";
      altX86Name = peakCpu < 25 ? "m5.large" : "m5.xlarge";
      break;

    case "m5.2xlarge":
      targetName = peakCpu < 25 ? "m7g.medium" : "m7g.large";
      altX86Name = peakCpu < 25 ? "m5.large" : "m5.xlarge";
      break;

    case "m5.xlarge":
      targetName = peakCpu < 25 ? "t4g.medium" : "m7g.medium";
      altX86Name = peakCpu < 25 ? "t3.medium" : "m5.large";
      break;

    case "m5.large":
      targetName = peakCpu < 25 ? "t4g.small" : "m7g.medium";
      altX86Name = peakCpu < 25 ? "t3.small" : "t3.large";
      break;

    case "c5.2xlarge":
      targetName = peakCpu < 25 ? "c7g.large" : "c7g.xlarge";
      altX86Name = peakCpu < 25 ? "c5.large" : "c5.xlarge";
      break;

    case "c5.xlarge":
      targetName = peakCpu < 25 ? "c7g.medium" : "c7g.large";
      altX86Name = peakCpu < 25 ? "c5.large" : "t3.large";
      break;

    case "c5.large":
      targetName = peakCpu < 25 ? "c7g.medium" : "t4g.medium";
      altX86Name = peakCpu < 25 ? "t3.medium" : "t3.large";
      break;

    case "r5.xlarge":
      targetName = "r7g.large";
      altX86Name = "r5.large";
      break;

    case "r5.large":
      targetName = "r7g.medium";
      altX86Name = "t3.large";
      break;

    case "t2.large":
      targetName = peakCpu < 25 ? "t4g.small" : "t4g.medium";
      altX86Name = peakCpu < 25 ? "t3.small" : "t3.medium";
      break;

    case "t2.medium":
      targetName = peakCpu < 20 ? "t4g.micro" : "t4g.small";
      altX86Name = peakCpu < 20 ? "t3.micro" : "t3.small";
      break;

    default:
      // Fallback: Drop to modern t4g.small or micro
      targetName = peakCpu < 20 ? "t4g.micro" : "t4g.small";
      altX86Name = peakCpu < 20 ? "t3.micro" : "t3.small";
      break;
  }

  targetSpec = EC2_CATALOG[targetName] || EC2_CATALOG["t4g.small"];
  altX86Spec = EC2_CATALOG[altX86Name] || EC2_CATALOG["t3.small"];

  const targetMonthlyCost = regionPrices.get(targetName)?.monthlyUsd ?? targetSpec.monthlyCostUsd;
  const altX86MonthlyCost = regionPrices.get(altX86Name)?.monthlyUsd ?? altX86Spec.monthlyCostUsd;

  const rawSavings = Math.max(0, currentCost - targetMonthlyCost);
  const monthlySavings = parseFloat(rawSavings.toFixed(2));
  const savingsPercentage = currentCost > 0
    ? Math.min(95, Math.max(0, Math.round((monthlySavings / currentCost) * 1000) / 10))
    : 0;
  const annualSavings = parseFloat((monthlySavings * 12).toFixed(2));

  const altSavings = Math.max(0, currentCost - altX86MonthlyCost);

  // Safety Headroom: (100 - Peak CPU) * Spec Ratio
  const specRatio = targetSpec.vCpu / Math.max(1, currentSpec.vCpu);
  const projectedPeakOnTarget = Math.min(95, Math.round(peakCpu / Math.max(0.2, specRatio)));
  const safetyMarginPercent = Math.max(25, 100 - projectedPeakOnTarget);

  const currentSpecs = `${currentSpec.vCpu} vCPU • ${currentSpec.memoryGb} GB RAM • ${currentSpec.architecture}`;
  const targetSpecs = `${targetSpec.vCpu} vCPU • ${targetSpec.memoryGb} GB RAM • AWS Graviton3 (Arm64)`;
  const alternativeX86Specs = `${altX86Spec.vCpu} vCPU • ${altX86Spec.memoryGb} GB RAM • x86_64`;

  const agentCliCommand = `aws ec2 modify-instance-attribute --instance-id ${resourceId} --instance-type '{"Value": "${targetName}"}' --region ${region}`;

  const agentTerraformSnippet = `# Autonomous GreenCloud Agent — Rightsizing State Manifest
resource "aws_instance" "optimized_node" {
  ami           = "ami-0c02fb55956c7d316"
  instance_type = "${targetName}" # Shifted from ${currentSpec.instanceType} ($${monthlySavings}/mo saved)

  tags = {
    OptimizedBy       = "GreenCloudAgent"
    PreviousInstance  = "${currentSpec.instanceType}"
    ShiftDate         = "${new Date().toISOString().split("T")[0]}"
    TargetUtilization = "${projectedPeakOnTarget}% (Headroom: ${safetyMarginPercent}%)"
  }
}`;

  const agentActionDescription = `Shift instance "${resourceId}" from ${currentSpec.instanceType} to ${targetName}. Eliminates $${monthlySavings}/mo in idle allocation with ~${carbonReduction}% carbon intensity reduction.`;

  return {
    currentMachine: currentSpec.instanceType,
    currentSpecs,
    currentMonthlyCost: parseFloat(currentCost.toFixed(2)),
    targetMachine: targetName,
    targetSpecs,
    targetMonthlyCost: parseFloat(targetMonthlyCost.toFixed(2)),
    monthlySavings,
    savingsPercentage,
    annualSavings,
    carbonReductionPercent: carbonReduction,
    safetyMarginPercent,
    architecture: targetSpec.architecture,
    category: targetSpec.category,
    alternativeX86Target: altX86Name,
    alternativeX86Specs,
    alternativeX86MonthlyCost: parseFloat(altX86MonthlyCost.toFixed(2)),
    alternativeX86Savings: parseFloat(altSavings.toFixed(2)),
    agentCliCommand,
    agentTerraformSnippet,
    agentActionDescription,
  };
}

function calculateAzureTargetMachine(
  normType: string,
  peakCpu: number,
  actualMonthlyCost: number | null | undefined,
  resourceId: string,
  region: string
): TargetMachineShift {
  const currentSpec = AZURE_VM_CATALOG[normType] || {
    instanceType: normType,
    family: "Ds_v5",
    vCpu: 2,
    memoryGb: 8,
    architecture: "x86_64" as const,
    hourlyRateUsd: 0.096,
    monthlyCostUsd: actualMonthlyCost || 70.08,
    baselineNetwork: "Up to 12.5 Gbps",
    category: "General Purpose" as const,
    isGraviton: false,
  };

  const regionPrices = getSnapshotRegionPrices("azure", region);
  const currentLive = regionPrices.get(normType)?.monthlyUsd;
  const currentCost =
    actualMonthlyCost && actualMonthlyCost > 0
      ? actualMonthlyCost
      : (currentLive ?? currentSpec.monthlyCostUsd);

  let targetKey = "standard_b2ps_v2";
  let altX86Key = "standard_b1s";

  switch (normType) {
    case "standard_d8s_v5":
    case "standard_d8s_v3":
      targetKey = peakCpu < 20 ? "standard_d2ps_v5" : "standard_d4ps_v5";
      altX86Key = peakCpu < 20 ? "standard_d2s_v5" : "standard_d4s_v5";
      break;
    case "standard_d4s_v5":
    case "standard_d4s_v3":
    case "standard_e4s_v5":
    case "standard_f4s_v2":
      targetKey = peakCpu < 20 ? "standard_b2ps_v2" : "standard_d2ps_v5";
      altX86Key = peakCpu < 20 ? "standard_b2s" : "standard_d2s_v5";
      break;
    case "standard_d2s_v5":
    case "standard_d2s_v3":
    case "standard_b2ms":
      targetKey = "standard_b2ps_v2";
      altX86Key = peakCpu < 20 ? "standard_b1s" : "standard_b2s";
      break;
    default:
      targetKey = "standard_b2ps_v2";
      altX86Key = "standard_b1s";
      break;
  }

  const targetSpec = AZURE_VM_CATALOG[targetKey] || AZURE_VM_CATALOG["standard_b2ps_v2"];
  const altX86Spec = AZURE_VM_CATALOG[altX86Key] || AZURE_VM_CATALOG["standard_b1s"];
  const carbonReduction = 55;

  const targetMonthlyCost = regionPrices.get(targetKey)?.monthlyUsd ?? targetSpec.monthlyCostUsd;
  const altX86MonthlyCost = regionPrices.get(altX86Key)?.monthlyUsd ?? altX86Spec.monthlyCostUsd;
  const rawSavings = Math.max(0, currentCost - targetMonthlyCost);
  const monthlySavings = parseFloat(rawSavings.toFixed(2));
  const savingsPercentage =
    currentCost > 0
      ? Math.min(95, Math.max(0, Math.round((monthlySavings / currentCost) * 1000) / 10))
      : 0;
  const annualSavings = parseFloat((monthlySavings * 12).toFixed(2));
  const altSavings = Math.max(0, currentCost - altX86MonthlyCost);

  const specRatio = targetSpec.vCpu / Math.max(1, currentSpec.vCpu);
  const projectedPeakOnTarget = Math.min(95, Math.round(peakCpu / Math.max(0.2, specRatio)));
  const safetyMarginPercent = Math.max(25, 100 - projectedPeakOnTarget);

  const currentSpecs = `${currentSpec.vCpu} vCPU • ${currentSpec.memoryGb} GB RAM • ${currentSpec.architecture}`;
  const targetSpecs = `${targetSpec.vCpu} vCPU • ${targetSpec.memoryGb} GB RAM • Azure Ampere Altra (Arm64)`;
  const alternativeX86Specs = `${altX86Spec.vCpu} vCPU • ${altX86Spec.memoryGb} GB RAM • x86_64`;

  const agentCliCommand = `az vm resize --ids ${resourceId} --size ${targetSpec.instanceType}`;
  const agentTerraformSnippet = `# Autonomous GreenCloud Agent — Azure VM Rightsizing Manifest
resource "azurerm_linux_virtual_machine" "optimized_node" {
  name     = "${resourceId.split("/").pop() || "greencloud-vm"}"
  location = "${region}"
  size     = "${targetSpec.instanceType}" # Shifted from ${currentSpec.instanceType} ($${monthlySavings}/mo saved)

  tags = {
    OptimizedBy       = "GreenCloudAgent"
    PreviousVmSize    = "${currentSpec.instanceType}"
    ShiftDate         = "${new Date().toISOString().split("T")[0]}"
    TargetUtilization = "${projectedPeakOnTarget}% (Headroom: ${safetyMarginPercent}%)"
  }
}`;

  const agentActionDescription = `Resize Azure VM "${resourceId.split("/").pop() || resourceId}" from ${currentSpec.instanceType} to ${targetSpec.instanceType}. Saves $${monthlySavings}/mo with ~${carbonReduction}% carbon reduction.`;

  return {
    currentMachine: currentSpec.instanceType,
    currentSpecs,
    currentMonthlyCost: parseFloat(currentCost.toFixed(2)),
    targetMachine: targetSpec.instanceType,
    targetSpecs,
    targetMonthlyCost: parseFloat(targetMonthlyCost.toFixed(2)),
    monthlySavings,
    savingsPercentage,
    annualSavings,
    carbonReductionPercent: carbonReduction,
    safetyMarginPercent,
    architecture: targetSpec.architecture,
    category: targetSpec.category,
    alternativeX86Target: altX86Spec.instanceType,
    alternativeX86Specs,
    alternativeX86MonthlyCost: parseFloat(altX86MonthlyCost.toFixed(2)),
    alternativeX86Savings: parseFloat(altSavings.toFixed(2)),
    agentCliCommand,
    agentTerraformSnippet,
    agentActionDescription,
  };
}
