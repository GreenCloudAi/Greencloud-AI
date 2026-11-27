import type { Provider } from "./regionMap";

export type Arch = "x86_64" | "arm64";
export type Category = "burstable" | "general" | "compute" | "memory";
export type CpuVendor = "intel" | "amd" | "graviton" | "ampere";

export interface SkuSpec {
  provider: Provider;
  sku: string; // normalised lowercase key
  displayName: string; // e.g. "m5.large", "Standard_D2s_v5"
  family: string; // e.g. "m5", "Dsv5"
  generation: number;
  vCpu: number;
  memoryGb: number;
  arch: Arch;
  cpuVendor: CpuVendor;
  category: Category;
  burstBaselinePct?: number; // per-vCPU sustained baseline for burstable SKUs
  maxNetworkGbps?: number;
  localNvme?: boolean;
  deprecated?: boolean;
}

export interface FamilyEquivalenceRow {
  id: string;
  label: string;
  ramPerVcpu: number;
  arch: Arch;
  category: Category;
  awsFamilies: string[];
  azureFamilies: string[];
}

export const FAMILY_EQUIVALENCE: FamilyEquivalenceRow[] = [
  { id: "burstable_x86", label: "Burstable x86", ramPerVcpu: 2, arch: "x86_64", category: "burstable", awsFamilies: ["t3", "t3a", "t2"], azureFamilies: ["B", "Bsv2", "Basv2"] },
  { id: "burstable_arm", label: "Burstable Arm", ramPerVcpu: 2, arch: "arm64", category: "burstable", awsFamilies: ["t4g"], azureFamilies: ["Bpsv2"] },
  { id: "general_x86_intel", label: "General x86 Intel", ramPerVcpu: 4, arch: "x86_64", category: "general", awsFamilies: ["m5", "m6i", "m7i"], azureFamilies: ["Dsv5", "Dsv6"] },
  { id: "general_x86_amd", label: "General x86 AMD", ramPerVcpu: 4, arch: "x86_64", category: "general", awsFamilies: ["m6a", "m7a"], azureFamilies: ["Dasv5", "Dasv6"] },
  { id: "general_arm", label: "General Arm", ramPerVcpu: 4, arch: "arm64", category: "general", awsFamilies: ["m6g", "m7g"], azureFamilies: ["Dpsv5", "Dpsv6"] },
  { id: "compute_x86", label: "Compute x86", ramPerVcpu: 2, arch: "x86_64", category: "compute", awsFamilies: ["c5", "c6i", "c7i", "c6a", "c7a"], azureFamilies: ["Fsv2", "Fasv6", "Dlsv5"] },
  { id: "compute_arm", label: "Compute Arm", ramPerVcpu: 2, arch: "arm64", category: "compute", awsFamilies: ["c6g", "c7g"], azureFamilies: ["Dplsv5", "Dplsv6"] },
  { id: "memory_x86", label: "Memory x86", ramPerVcpu: 8, arch: "x86_64", category: "memory", awsFamilies: ["r5", "r6i", "r7i", "r6a", "r7a"], azureFamilies: ["Esv5", "Esv6", "Easv5"] },
  { id: "memory_arm", label: "Memory Arm", ramPerVcpu: 8, arch: "arm64", category: "memory", awsFamilies: ["r6g", "r7g"], azureFamilies: ["Epsv5", "Epsv6"] },
];

type SizeTuple = [suffix: string, vCpu: number, memoryGb: number, burst?: number];

function buildAwsFamily(
  family: string,
  generation: number,
  arch: Arch,
  cpuVendor: CpuVendor,
  category: Category,
  sizes: SizeTuple[],
  deprecated = false,
  maxNetworkGbps = 12.5
): SkuSpec[] {
  return sizes.map(([suffix, vCpu, memoryGb, burst]) => ({
    provider: "aws",
    sku: `${family}.${suffix}`.toLowerCase(),
    displayName: `${family}.${suffix}`,
    family,
    generation,
    vCpu,
    memoryGb,
    arch,
    cpuVendor,
    category,
    ...(burst !== undefined ? { burstBaselinePct: burst } : {}),
    maxNetworkGbps,
    deprecated,
  }));
}

function buildAzureFamily(
  prefix: string,
  suffix: string,
  family: string,
  generation: number,
  arch: Arch,
  cpuVendor: CpuVendor,
  category: Category,
  sizes: Array<[vCpu: number, memoryGb: number, burst?: number, customName?: string]>,
  maxNetworkGbps = 12.5
): SkuSpec[] {
  return sizes.map(([vCpu, memoryGb, burst, customName]) => {
    const displayName = customName || `Standard_${prefix}${vCpu}${suffix}`;
    return {
      provider: "azure",
      sku: displayName.toLowerCase(),
      displayName,
      family,
      generation,
      vCpu,
      memoryGb,
      arch,
      cpuVendor,
      category,
      ...(burst !== undefined ? { burstBaselinePct: burst } : {}),
      maxNetworkGbps,
    };
  });
}

const BURSTABLE_AWS_SIZES: SizeTuple[] = [
  ["nano", 2, 0.5, 5],
  ["micro", 2, 1, 10],
  ["small", 2, 2, 20],
  ["medium", 2, 4, 20],
  ["large", 2, 8, 30],
  ["xlarge", 4, 16, 40],
  ["2xlarge", 8, 32, 40],
];

const STD_GEN_SIZES: SizeTuple[] = [
  ["medium", 1, 4],
  ["large", 2, 8],
  ["xlarge", 4, 16],
  ["2xlarge", 8, 32],
  ["4xlarge", 16, 64],
];

const STD_COMP_SIZES: SizeTuple[] = [
  ["medium", 1, 2],
  ["large", 2, 4],
  ["xlarge", 4, 8],
  ["2xlarge", 8, 16],
  ["4xlarge", 16, 32],
];

const STD_MEM_SIZES: SizeTuple[] = [
  ["medium", 1, 8],
  ["large", 2, 16],
  ["xlarge", 4, 32],
  ["2xlarge", 8, 64],
  ["4xlarge", 16, 128],
];

export const SKU_SPECS: SkuSpec[] = [
  // AWS Burstable
  ...buildAwsFamily("t2", 2, "x86_64", "intel", "burstable", [
    ["nano", 1, 0.5, 5],
    ["micro", 1, 1, 10],
    ["small", 1, 2, 20],
    ["medium", 2, 4, 20],
    ["large", 2, 8, 30],
    ["xlarge", 4, 16, 22.5],
    ["2xlarge", 8, 32, 17],
  ], true, 5),
  ...buildAwsFamily("t3", 3, "x86_64", "intel", "burstable", BURSTABLE_AWS_SIZES, false, 5),
  ...buildAwsFamily("t3a", 3, "x86_64", "amd", "burstable", BURSTABLE_AWS_SIZES, false, 5),
  ...buildAwsFamily("t4g", 4, "arm64", "graviton", "burstable", BURSTABLE_AWS_SIZES, false, 5),

  // AWS General Purpose
  ...buildAwsFamily("m5", 5, "x86_64", "intel", "general", STD_GEN_SIZES.slice(1)),
  ...buildAwsFamily("m6i", 6, "x86_64", "intel", "general", STD_GEN_SIZES.slice(1)),
  ...buildAwsFamily("m7i", 7, "x86_64", "intel", "general", STD_GEN_SIZES.slice(1)),
  ...buildAwsFamily("m6a", 6, "x86_64", "amd", "general", STD_GEN_SIZES.slice(1)),
  ...buildAwsFamily("m7a", 7, "x86_64", "amd", "general", STD_GEN_SIZES),
  ...buildAwsFamily("m6g", 6, "arm64", "graviton", "general", STD_GEN_SIZES),
  ...buildAwsFamily("m7g", 7, "arm64", "graviton", "general", STD_GEN_SIZES),

  // AWS Compute Optimized
  ...buildAwsFamily("c5", 5, "x86_64", "intel", "compute", STD_COMP_SIZES.slice(1)),
  ...buildAwsFamily("c6i", 6, "x86_64", "intel", "compute", STD_COMP_SIZES.slice(1)),
  ...buildAwsFamily("c7i", 7, "x86_64", "intel", "compute", STD_COMP_SIZES.slice(1)),
  ...buildAwsFamily("c6a", 6, "x86_64", "amd", "compute", STD_COMP_SIZES.slice(1)),
  ...buildAwsFamily("c7a", 7, "x86_64", "amd", "compute", STD_COMP_SIZES),
  ...buildAwsFamily("c6g", 6, "arm64", "graviton", "compute", STD_COMP_SIZES),
  ...buildAwsFamily("c7g", 7, "arm64", "graviton", "compute", STD_COMP_SIZES),

  // AWS Memory Optimized
  ...buildAwsFamily("r5", 5, "x86_64", "intel", "memory", STD_MEM_SIZES.slice(1)),
  ...buildAwsFamily("r6i", 6, "x86_64", "intel", "memory", STD_MEM_SIZES.slice(1)),
  ...buildAwsFamily("r7i", 7, "x86_64", "intel", "memory", STD_MEM_SIZES.slice(1)),
  ...buildAwsFamily("r6a", 6, "x86_64", "amd", "memory", STD_MEM_SIZES.slice(1)),
  ...buildAwsFamily("r7a", 7, "x86_64", "amd", "memory", STD_MEM_SIZES),
  ...buildAwsFamily("r6g", 6, "arm64", "graviton", "memory", STD_MEM_SIZES),
  ...buildAwsFamily("r7g", 7, "arm64", "graviton", "memory", STD_MEM_SIZES),

  // Azure Burstable
  ...buildAzureFamily("B", "", "B", 1, "x86_64", "intel", "burstable", [
    [1, 0.5, 5, "Standard_B1ls"],
    [1, 1, 10, "Standard_B1s"],
    [1, 2, 20, "Standard_B1ms"],
    [2, 4, 20, "Standard_B2s"],
    [2, 8, 30, "Standard_B2ms"],
    [4, 16, 45, "Standard_B4ms"],
    [8, 32, 67, "Standard_B8ms"],
  ], 5),
  ...buildAzureFamily("B", "s_v2", "Bsv2", 2, "x86_64", "intel", "burstable", [
    [2, 4, 20],
    [2, 8, 30, "Standard_B2ms_v2"],
    [4, 16, 40],
    [8, 32, 40],
  ], 6),
  ...buildAzureFamily("B", "as_v2", "Basv2", 2, "x86_64", "amd", "burstable", [
    [2, 4, 20],
    [4, 16, 40],
    [8, 32, 40],
  ], 6),
  ...buildAzureFamily("B", "ps_v2", "Bpsv2", 2, "arm64", "ampere", "burstable", [
    [2, 4, 20],
    [4, 16, 40],
    [8, 32, 40],
  ], 6),

  // Azure General Purpose
  ...buildAzureFamily("D", "s_v5", "Dsv5", 5, "x86_64", "intel", "general", [[2, 8], [4, 16], [8, 32], [16, 64]]),
  ...buildAzureFamily("D", "s_v6", "Dsv6", 6, "x86_64", "intel", "general", [[2, 8], [4, 16], [8, 32], [16, 64]]),
  ...buildAzureFamily("D", "as_v5", "Dasv5", 5, "x86_64", "amd", "general", [[2, 8], [4, 16], [8, 32], [16, 64]]),
  ...buildAzureFamily("D", "as_v6", "Dasv6", 6, "x86_64", "amd", "general", [[2, 8], [4, 16], [8, 32], [16, 64]]),
  ...buildAzureFamily("D", "ps_v5", "Dpsv5", 5, "arm64", "ampere", "general", [[2, 8], [4, 16], [8, 32], [16, 64]]),
  ...buildAzureFamily("D", "ps_v6", "Dpsv6", 6, "arm64", "ampere", "general", [[2, 8], [4, 16], [8, 32], [16, 64]]),

  // Azure Compute Optimized
  ...buildAzureFamily("F", "s_v2", "Fsv2", 2, "x86_64", "intel", "compute", [[2, 4], [4, 8], [8, 16], [16, 32]]),
  ...buildAzureFamily("F", "as_v6", "Fasv6", 6, "x86_64", "amd", "compute", [[2, 4], [4, 8], [8, 16], [16, 32]]),
  ...buildAzureFamily("D", "ls_v5", "Dlsv5", 5, "x86_64", "intel", "compute", [[2, 4], [4, 8], [8, 16], [16, 32]]),
  ...buildAzureFamily("D", "pls_v5", "Dplsv5", 5, "arm64", "ampere", "compute", [[2, 4], [4, 8], [8, 16], [16, 32]]),
  ...buildAzureFamily("D", "pls_v6", "Dplsv6", 6, "arm64", "ampere", "compute", [[2, 4], [4, 8], [8, 16], [16, 32]]),

  // Azure Memory Optimized
  ...buildAzureFamily("E", "s_v5", "Esv5", 5, "x86_64", "intel", "memory", [[2, 16], [4, 32], [8, 64], [16, 128]]),
  ...buildAzureFamily("E", "s_v6", "Esv6", 6, "x86_64", "intel", "memory", [[2, 16], [4, 32], [8, 64], [16, 128]]),
  ...buildAzureFamily("E", "as_v5", "Easv5", 5, "x86_64", "amd", "memory", [[2, 16], [4, 32], [8, 64], [16, 128]]),
  ...buildAzureFamily("E", "ps_v5", "Epsv5", 5, "arm64", "ampere", "memory", [[2, 16], [4, 32], [8, 64], [16, 128]]),
  ...buildAzureFamily("E", "ps_v6", "Epsv6", 6, "arm64", "ampere", "memory", [[2, 16], [4, 32], [8, 64], [16, 128]]),
];

const SKU_LOOKUP = new Map<string, SkuSpec>(
  SKU_SPECS.map((s) => [`${s.provider}:${s.sku}`, s])
);

export function getSkuSpec(provider: Provider, sku: string): SkuSpec | null {
  return SKU_LOOKUP.get(`${provider}:${sku.trim().toLowerCase()}`) || null;
}

export function getEquivalentFamilies(provider: Provider, family: string): string[] {
  const row = FAMILY_EQUIVALENCE.find((r) =>
    provider === "aws" ? r.awsFamilies.includes(family) : r.azureFamilies.includes(family)
  );
  if (!row) return [];
  return provider === "aws" ? row.azureFamilies : row.awsFamilies;
}
