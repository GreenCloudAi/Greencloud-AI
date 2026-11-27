import { prisma } from "./db";
import { GreenCloudConfig } from "./config";
import { CarbonEngine } from "./carbonEngine";
import {
  candidateRegions,
  getRegionDisplayName,
  pairedRegion,
  REGION_INFO_BY_CODE,
  type Provider,
  type RegionMode,
} from "./pricing/regionMap";
import {
  getEquivalentFamilies,
  getSkuSpec,
  SKU_SPECS,
  type Arch,
  type Category,
  type SkuSpec,
} from "./pricing/skuSpecs";
import {
  getRegionPrices,
  getSnapshotGeneratedAt,
  HOURS_PER_MONTH,
  type PriceLookup,
} from "./pricing/priceStore";
import type { OsType } from "./pricing/pricingSync";

export type Verdict = "SHIFT" | "CONSIDER" | "STAY";
export type Confidence = "high" | "medium" | "low";

export interface AttachedDiskInfo {
  id: string;
  sizeGb: number;
  tier: string;
  monthlyUsd: number;
}

export interface NormalisedVm {
  resourceId: string;
  providerResourceId: string;
  name: string;
  provider: Provider;
  region: string;
  sku: string;
  spec: SkuSpec | null;
  os: OsType;
  peakCpu: number;
  avgCpu: number;
  p95Cpu: number | null;
  lookbackDays: number;
  currentMonthlyUsd: number;
  attachedDiskGb: number;
  attachedDisks: AttachedDiskInfo[];
  hasPublicIp: boolean;
  ipMonthlyUsd: number;
  isScalingGroup?: boolean;
  isSpot?: boolean;
}

export interface PricedOption {
  provider: Provider;
  sku: string;
  displayName: string;
  region: string;
  regionName: string;
  vCpu: number;
  memoryGb: number;
  arch: Arch;
  family: string;
  category: Category;
  computeMonthlyUsd: number;
  storageMonthlyUsd: number;
  ipMonthlyUsd: number;
  monthlyUsd: number;
  projectedPeakCpuPct: number;
  priceSource: string;
}

export interface VmComparison {
  resourceId: string;
  name: string;
  provider: Provider;
  region: string;
  regionName: string;
  telemetry: { peakCpu: number; avgCpu: number; p95Cpu: number | null; lookbackDays: number };
  confidence: Confidence;
  requirement: { vCpu: number; memoryGb: number; arch: Arch | "any" };

  optionA: PricedOption;
  optionB: PricedOption;
  optionC: PricedOption | null;
  optionD: PricedOption | null;
  optionDSameArch: PricedOption | null;
  alternatives: PricedOption[];

  rightsizingSavingsMonthly: number;
  shiftSavingsMonthly: number;
  totalSavingsMonthly: number;
  shiftSavingsAnnual: number;
  shiftSavingsPct: number;

  migration: {
    dataGb: number;
    egressUsd: number;
    laborUsd: number;
    archLaborUsd: number;
    parallelRunUsd: number;
    oneTimeUsd: number;
    paybackMonths: number | null;
    netFirstYearUsd: number;
  };

  carbon: { currentKgMonth: number; targetKgMonth: number; deltaPct: number };
  verdict: Verdict;
  reasons: string[];
  caveats: string[];
  blockers: string[];
  actions: {
    terraform: string;
    migrationSteps: string[];
  };
}

export interface PortfolioSummary {
  runningVmCount: number;
  stoppedVmCount: number;
  byProvider: Record<Provider, { vmCount: number; currentMonthlyUsd: number }>;
  verdictCounts: Record<Verdict, number>;
  rightsizeInPlaceMonthlyUsd: number;
  shiftMonthlyUsd: number;
  shiftOneTimeUsd: number;
  shiftPaybackMonths: number | null;
  bestCaseMonthlyUsd: number;
  headline: "stay" | "shift_all" | "shift_some";
  headlineText: string;
  mixedEstateNote: string | null;
}

export interface CrossCloudConfig {
  regionMode: RegionMode;
  targetPeakUtilizationPct: number;
  allowArchChange: boolean;
  maxMemoryOverprovisionRatio: number;
  shiftMinMonthlyUsd: number;
  shiftMinPct: number;
  shiftMaxPaybackMonths: number;
  considerMaxPaybackMonths: number;
  laborHoursPerVm: number;
  laborRatePerHour: number;
  archChangeExtraHours: number;
  parallelRunDays: number;
  dataToMoveRatio: number;
  defaultRootDiskGb: number;
  egressFreeGb: Record<Provider, number>;
  egressPerGb: Record<Provider, Record<string, number>>;
  publicIpMonthly: Record<Provider, number>;
  greenWeighting: number;
  carbonPricePerKg: number;
}

export interface CrossCloudResponse {
  generatedAt: string;
  priceInfo: {
    aws: { source: string; asOf: string };
    azure: { source: string; asOf: string };
  };
  assumptions: CrossCloudConfig;
  summary: PortfolioSummary;
  machines: VmComparison[];
}

export type PriceLookupFn = (provider: Provider, sku: string, region: string) => PriceLookup | null;

const AWS_DISK_RATES: Record<string, number> = {
  gp3: 0.08,
  gp2: 0.10,
  io1: 0.125,
  io2: 0.125,
  st1: 0.045,
  sc1: 0.015,
};

const AZURE_DISK_RATES: Record<string, number> = {
  StandardSSD_LRS: 0.075,
  Premium_LRS: 0.135,
  PremiumV2_LRS: 0.12,
  Standard_LRS: 0.045,
};

export function targetDiskRate(sourceTier: string, targetProvider: Provider): number {
  const t = sourceTier.toLowerCase();
  if (targetProvider === "azure") {
    if (t.includes("io1") || t.includes("io2")) return AZURE_DISK_RATES.PremiumV2_LRS;
    if (t.includes("st1") || t.includes("sc1")) return AZURE_DISK_RATES.Standard_LRS;
    return AZURE_DISK_RATES.StandardSSD_LRS;
  }
  if (t.includes("premium")) return AWS_DISK_RATES.io2;
  if (t === "standard_lrs") return AWS_DISK_RATES.st1;
  return AWS_DISK_RATES.gp3;
}

export function computeStorageMonthly(
  disks: AttachedDiskInfo[],
  targetProvider: Provider,
  defaultRootDiskGb: number
): { totalGb: number; targetMonthlyUsd: number; assumed: boolean } {
  if (disks.length === 0) {
    const rate = targetDiskRate("gp3", targetProvider);
    return {
      totalGb: defaultRootDiskGb,
      targetMonthlyUsd: parseFloat((defaultRootDiskGb * rate).toFixed(2)),
      assumed: true,
    };
  }
  let totalGb = 0;
  let targetMonthlyUsd = 0;
  for (const d of disks) {
    totalGb += d.sizeGb;
    targetMonthlyUsd += d.sizeGb * targetDiskRate(d.tier, targetProvider);
  }
  return {
    totalGb,
    targetMonthlyUsd: parseFloat(targetMonthlyUsd.toFixed(2)),
    assumed: false,
  };
}

export function deriveConfidence(lookbackDays: number): Confidence {
  if (lookbackDays >= 14) return "high";
  if (lookbackDays >= 7) return "medium";
  return "low";
}

export function computeP95(series: number[]): number | null {
  if (series.length < 14) return null;
  const zeroCount = series.filter((v) => v <= 0).length;
  const filtered = zeroCount > series.length * 0.5 ? series.filter((v) => v > 0) : series;
  if (filtered.length < 7) return null;
  const sorted = [...filtered].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
  return parseFloat(sorted[idx].toFixed(2));
}

export function deriveRequirement(
  vm: NormalisedVm,
  cfg: CrossCloudConfig
): { vCpu: number; memoryGb: number; arch: Arch | "any"; confidence: Confidence } {
  const confidence = deriveConfidence(vm.lookbackDays);
  if (!vm.spec) {
    return { vCpu: 2, memoryGb: 8, arch: cfg.allowArchChange ? "any" : "x86_64", confidence };
  }

  if (confidence === "low") {
    return {
      vCpu: vm.spec.vCpu,
      memoryGb: vm.spec.memoryGb,
      arch: cfg.allowArchChange ? "any" : vm.spec.arch,
      confidence,
    };
  }

  const target = Math.max(10, cfg.targetPeakUtilizationPct);
  const util = vm.p95Cpu ?? vm.peakCpu;
  const usedVcpu = (vm.spec.vCpu * util) / 100;
  const requiredVcpu = Math.max(1, Math.ceil(usedVcpu / (target / 100)));

  return {
    vCpu: requiredVcpu,
    memoryGb: vm.spec.memoryGb,
    arch: cfg.allowArchChange ? "any" : vm.spec.arch,
    confidence,
  };
}

function buildPricedOption(
  spec: SkuSpec,
  region: string,
  computeHourly: number,
  storageMonthlyUsd: number,
  ipMonthlyUsd: number,
  sourceVcpu: number,
  peakCpu: number,
  priceSource: string
): PricedOption {
  const computeMonthlyUsd = parseFloat((computeHourly * HOURS_PER_MONTH).toFixed(2));
  const monthlyUsd = parseFloat((computeMonthlyUsd + storageMonthlyUsd + ipMonthlyUsd).toFixed(2));
  const projectedPeakCpuPct = parseFloat(
    Math.min(100, (peakCpu * sourceVcpu) / Math.max(1, spec.vCpu)).toFixed(1)
  );
  return {
    provider: spec.provider,
    sku: spec.sku,
    displayName: spec.displayName,
    region,
    regionName: getRegionDisplayName(region),
    vCpu: spec.vCpu,
    memoryGb: spec.memoryGb,
    arch: spec.arch,
    family: spec.family,
    category: spec.category,
    computeMonthlyUsd,
    storageMonthlyUsd,
    ipMonthlyUsd,
    monthlyUsd,
    projectedPeakCpuPct,
    priceSource,
  };
}

export function findBest(
  provider: Provider,
  regions: string[],
  req: { vCpu: number; memoryGb: number; arch: Arch | "any" },
  vm: NormalisedVm,
  specs: SkuSpec[],
  priceLookup: PriceLookupFn,
  cfg: CrossCloudConfig,
  storageMonthlyUsd: number,
  ipMonthlyUsd: number
): PricedOption[] {
  const sourceVcpu = vm.spec?.vCpu || 2;
  const candidates: Array<{ option: PricedOption; generation: number }> = [];

  for (const s of specs) {
    if (s.provider !== provider || s.deprecated) continue;
    if (s.vCpu < req.vCpu || s.memoryGb < req.memoryGb) continue;
    if (req.arch !== "any" && s.arch !== req.arch) continue;
    if (s.localNvme && !vm.spec?.localNvme) continue;
    if (s.category === "burstable" && s.burstBaselinePct !== undefined && vm.avgCpu >= s.burstBaselinePct) {
      continue;
    }
    if (s.memoryGb > req.memoryGb * cfg.maxMemoryOverprovisionRatio) continue;

    for (const r of regions) {
      const p = priceLookup(provider, s.sku, r);
      if (!p) continue;
      const option = buildPricedOption(
        s,
        r,
        p.hourlyUsd,
        storageMonthlyUsd,
        ipMonthlyUsd,
        sourceVcpu,
        vm.peakCpu,
        p.source
      );
      candidates.push({ option, generation: s.generation });
    }
  }

  candidates.sort((a, b) => {
    if (a.option.monthlyUsd !== b.option.monthlyUsd) {
      return a.option.monthlyUsd - b.option.monthlyUsd;
    }
    if (a.generation !== b.generation) {
      return b.generation - a.generation;
    }
    return a.option.vCpu - b.option.vCpu;
  });

  return candidates.slice(0, 3).map((c) => c.option);
}

export function likeForLike(
  vm: NormalisedVm,
  targetProvider: Provider,
  targetRegion: string,
  specs: SkuSpec[],
  priceLookup: PriceLookupFn,
  storageMonthlyUsd: number,
  ipMonthlyUsd: number
): PricedOption | null {
  if (!vm.spec) return null;
  const eqFamilies = getEquivalentFamilies(vm.provider, vm.spec.family);
  const candidates = specs.filter(
    (s) =>
      s.provider === targetProvider &&
      !s.deprecated &&
      s.vCpu === vm.spec!.vCpu &&
      s.memoryGb === vm.spec!.memoryGb &&
      s.arch === vm.spec!.arch &&
      (eqFamilies.length === 0 || eqFamilies.includes(s.family))
  );

  const fallback =
    candidates.length > 0
      ? candidates
      : specs.filter(
          (s) =>
            s.provider === targetProvider &&
            !s.deprecated &&
            s.vCpu === vm.spec!.vCpu &&
            s.memoryGb === vm.spec!.memoryGb &&
            s.arch === vm.spec!.arch
        );

  let best: PricedOption | null = null;
  for (const s of fallback) {
    const p = priceLookup(targetProvider, s.sku, targetRegion);
    if (!p) continue;
    const opt = buildPricedOption(
      s,
      targetRegion,
      p.hourlyUsd,
      storageMonthlyUsd,
      ipMonthlyUsd,
      vm.spec.vCpu,
      vm.peakCpu,
      p.source
    );
    if (!best || opt.monthlyUsd < best.monthlyUsd) {
      best = opt;
    }
  }
  return best;
}

export function calculateMigrationCost(
  vm: NormalisedVm,
  optionB: PricedOption,
  optionD: PricedOption | null,
  dataGb: number,
  cfg: CrossCloudConfig
) {
  const shiftSavingsMonthly = optionD ? parseFloat((optionB.monthlyUsd - optionD.monthlyUsd).toFixed(2)) : 0;
  const egressGb = dataGb * cfg.dataToMoveRatio;
  const regionContinent = REGION_INFO_BY_CODE[vm.region]?.continent || "north_america";
  const egressRate = cfg.egressPerGb[vm.provider]?.[regionContinent] ?? 0.09;
  const freeGb = cfg.egressFreeGb[vm.provider] ?? 100;
  const egressUsd = parseFloat((Math.max(0, egressGb - freeGb) * egressRate).toFixed(2));
  const laborUsd = parseFloat((cfg.laborHoursPerVm * cfg.laborRatePerHour).toFixed(2));
  const archChanges = Boolean(optionD && vm.spec && optionD.arch !== vm.spec.arch);
  const archLaborUsd = archChanges ? parseFloat((cfg.archChangeExtraHours * cfg.laborRatePerHour).toFixed(2)) : 0;
  const parallelRunUsd = optionD ? parseFloat(((cfg.parallelRunDays / 30) * optionD.monthlyUsd).toFixed(2)) : 0;
  const oneTimeUsd = parseFloat((egressUsd + laborUsd + archLaborUsd + parallelRunUsd).toFixed(2));
  const paybackMonths =
    shiftSavingsMonthly > 0 ? parseFloat((oneTimeUsd / shiftSavingsMonthly).toFixed(1)) : null;
  const netFirstYearUsd = parseFloat((shiftSavingsMonthly * 12 - oneTimeUsd).toFixed(2));

  return {
    dataGb,
    egressUsd,
    laborUsd,
    archLaborUsd,
    parallelRunUsd,
    oneTimeUsd,
    paybackMonths,
    netFirstYearUsd,
  };
}

export function decideVerdict(
  shiftSavingsMonthly: number,
  optionBMonthlyUsd: number,
  paybackMonths: number | null,
  confidence: Confidence,
  blockers: string[],
  cfg: CrossCloudConfig,
  carbonSavedKgMonth: number
): Verdict {
  if (blockers.length > 0 || optionBMonthlyUsd <= 0) return "STAY";

  const effectiveSavings =
    shiftSavingsMonthly +
    (cfg.greenWeighting > 0 ? cfg.greenWeighting * (carbonSavedKgMonth * cfg.carbonPricePerKg) : 0);

  const pct = (effectiveSavings / optionBMonthlyUsd) * 100;
  let v: Verdict = "STAY";

  if (effectiveSavings > 0 && paybackMonths !== null && paybackMonths <= cfg.considerMaxPaybackMonths) {
    v = "CONSIDER";
  }
  if (
    effectiveSavings >= cfg.shiftMinMonthlyUsd &&
    pct >= cfg.shiftMinPct &&
    paybackMonths !== null &&
    paybackMonths <= cfg.shiftMaxPaybackMonths
  ) {
    v = "SHIFT";
  }

  if (confidence === "medium" && v === "SHIFT") v = "CONSIDER";
  if (confidence === "low") v = v === "STAY" ? "STAY" : "CONSIDER";
  return v;
}

function buildMigrationSteps(vm: NormalisedVm, optionD: PricedOption | null): string[] {
  if (!optionD) return ["Rightsize in-place on current cloud; no cross-cloud migration recommended."];
  if (vm.provider === "aws") {
    return [
      `Provision Azure Virtual Network & Subnet in ${optionD.regionName} (${optionD.region}).`,
      `Configure Azure Migrate appliance in AWS ${vm.region} and replicate ${vm.attachedDiskGb} GB disk(s).`,
      `Run test migration to ${optionD.displayName} (${optionD.vCpu} vCPU / ${optionD.memoryGb} GB) and validate health checks.`,
      `Schedule ${GreenCloudConfig.crossCloud.parallelRunDays}-day cut-over window, switch DNS/IPs, then stop AWS EC2 instance ${vm.providerResourceId}.`,
    ];
  }
  return [
    `Provision AWS VPC & Subnet in ${optionD.regionName} (${optionD.region}).`,
    `Install AWS Application Migration Service (MGN) agent on Azure VM ${vm.name} and replicate ${vm.attachedDiskGb} GB disk(s).`,
    `Launch cut-over test instance on ${optionD.displayName} (${optionD.vCpu} vCPU / ${optionD.memoryGb} GB) and verify workloads.`,
    `Complete DNS cut-over after parallel validation, then deallocate Azure VM ${vm.name}.`,
  ];
}

function buildTargetTerraform(vm: NormalisedVm, optionD: PricedOption | null): string {
  if (!optionD) {
    return `# Stay on ${vm.provider.toUpperCase()} (${vm.region}) — no cross-cloud migration required.`;
  }
  if (optionD.provider === "azure") {
    return `# GreenCloud Cross-Cloud Advisor — Target Azure VM
resource "azurerm_linux_virtual_machine" "migrated_${vm.name.replace(/[^a-zA-Z0-9_]/g, "_")}" {
  name                = "${vm.name}"
  location            = "${optionD.region}"
  resource_group_name = var.resource_group_name
  size                = "${optionD.displayName}" # ${optionD.vCpu} vCPU / ${optionD.memoryGb} GB ($${optionD.monthlyUsd}/mo)
}`;
  }
  return `# GreenCloud Cross-Cloud Advisor — Target AWS EC2
resource "aws_instance" "migrated_${vm.name.replace(/[^a-zA-Z0-9_]/g, "_")}" {
  ami           = var.target_ami_id
  instance_type = "${optionD.displayName}" # ${optionD.vCpu} vCPU / ${optionD.memoryGb} GB ($${optionD.monthlyUsd}/mo)
  availability_zone = "${optionD.region}a"
}`;
}

export function evaluateVm(
  vm: NormalisedVm,
  specs: SkuSpec[],
  priceLookup: PriceLookupFn,
  cfg: CrossCloudConfig
): VmComparison {
  const blockers: string[] = [];
  const caveats: string[] = [];
  const otherProvider: Provider = vm.provider === "aws" ? "azure" : "aws";

  const sourceStorageUsd = parseFloat(
    vm.attachedDisks.reduce((s, d) => s + d.monthlyUsd, 0).toFixed(2)
  );
  const targetStorage = computeStorageMonthly(vm.attachedDisks, otherProvider, cfg.defaultRootDiskGb);
  if (targetStorage.assumed) caveats.push("disk_size_assumed");
  if (vm.os === "windows") caveats.push("windows_license_not_modelled");
  if (vm.isScalingGroup) caveats.push("scaling_group");
  caveats.push("memory_not_measured");

  const sourceIpUsd = vm.hasPublicIp ? vm.ipMonthlyUsd : 0;
  const targetIpUsd = vm.hasPublicIp ? cfg.publicIpMonthly[otherProvider] : 0;

  // Option A: As-is
  const listA = vm.spec ? priceLookup(vm.provider, vm.spec.sku, vm.region) : null;
  const computeA = vm.currentMonthlyUsd > 0
    ? Math.max(0, vm.currentMonthlyUsd - sourceStorageUsd - sourceIpUsd)
    : (listA?.monthlyUsd ?? 0);
  const totalA = parseFloat((computeA + sourceStorageUsd + sourceIpUsd).toFixed(2));

  if (listA && vm.currentMonthlyUsd > 0 && vm.currentMonthlyUsd < listA.monthlyUsd * 0.8) {
    caveats.push("discounted_pricing_detected");
  }

  const optionA: PricedOption = {
    provider: vm.provider,
    sku: vm.sku,
    displayName: vm.spec?.displayName || vm.sku,
    region: vm.region,
    regionName: getRegionDisplayName(vm.region),
    vCpu: vm.spec?.vCpu || 2,
    memoryGb: vm.spec?.memoryGb || 8,
    arch: vm.spec?.arch || "x86_64",
    family: vm.spec?.family || "unknown",
    category: vm.spec?.category || "general",
    computeMonthlyUsd: parseFloat(computeA.toFixed(2)),
    storageMonthlyUsd: sourceStorageUsd,
    ipMonthlyUsd: sourceIpUsd,
    monthlyUsd: totalA,
    projectedPeakCpuPct: vm.peakCpu,
    priceSource: vm.currentMonthlyUsd > 0 ? "billed_or_estimated" : (listA?.source || "unknown"),
  };

  if (!vm.spec) {
    blockers.push("unknown_sku");
  }

  const req = deriveRequirement(vm, cfg);
  if (req.confidence === "low") caveats.push("low_telemetry");

  // Option B: Best same cloud
  let optionB = optionA;
  if (vm.spec && req.confidence !== "low") {
    const sameCloudBest = findBest(
      vm.provider,
      [vm.region],
      req,
      vm,
      specs,
      priceLookup,
      cfg,
      sourceStorageUsd,
      sourceIpUsd
    );
    if (sameCloudBest[0] && sameCloudBest[0].monthlyUsd < optionA.monthlyUsd) {
      optionB = sameCloudBest[0];
    }
  }

  // Regions on the other cloud
  const targetRegions = candidateRegions(vm.provider, vm.region, cfg.regionMode);
  const pair = pairedRegion(vm.provider, vm.region);
  if (targetRegions.length === 0) {
    blockers.push("no_equivalent_region");
  }

  // Option C: Like-for-like
  const optionC =
    pair && vm.spec
      ? likeForLike(vm, otherProvider, pair, specs, priceLookup, targetStorage.targetMonthlyUsd, targetIpUsd)
      : null;

  // Option D: Best other cloud
  const otherCandidates =
    targetRegions.length > 0 && vm.spec
      ? findBest(
          otherProvider,
          targetRegions,
          req,
          vm,
          specs,
          priceLookup,
          cfg,
          targetStorage.targetMonthlyUsd,
          targetIpUsd
        )
      : [];

  const optionD = otherCandidates[0] || null;
  const alternatives = otherCandidates.slice(1, 3);

  let optionDSameArch: PricedOption | null = null;
  if (optionD && vm.spec && optionD.arch !== vm.spec.arch) {
    caveats.push("arch_change");
    const sameArchList = findBest(
      otherProvider,
      targetRegions,
      { ...req, arch: vm.spec.arch },
      vm,
      specs,
      priceLookup,
      cfg,
      targetStorage.targetMonthlyUsd,
      targetIpUsd
    );
    optionDSameArch = sameArchList[0] || null;
  }

  if (optionD?.category === "burstable") caveats.push("burstable_target");
  if (optionD && pair && optionD.region !== pair) caveats.push("region_not_paired");
  if (!optionD && blockers.length === 0) blockers.push("no_priced_target");

  const rightsizingSavingsMonthly = parseFloat(Math.max(0, optionA.monthlyUsd - optionB.monthlyUsd).toFixed(2));
  const shiftSavingsMonthly = optionD ? parseFloat((optionB.monthlyUsd - optionD.monthlyUsd).toFixed(2)) : 0;
  const totalSavingsMonthly = optionD ? parseFloat((optionA.monthlyUsd - optionD.monthlyUsd).toFixed(2)) : rightsizingSavingsMonthly;
  const shiftSavingsAnnual = parseFloat((shiftSavingsMonthly * 12).toFixed(2));
  const shiftSavingsPct =
    optionB.monthlyUsd > 0 ? parseFloat(((shiftSavingsMonthly / optionB.monthlyUsd) * 100).toFixed(1)) : 0;

  const migration = calculateMigrationCost(vm, optionB, optionD, targetStorage.totalGb, cfg);

  // Carbon comparison
  const cA = CarbonEngine.calculateEC2Carbon(optionA.sku, optionA.region, vm.avgCpu, HOURS_PER_MONTH, optionA.vCpu);
  const currentKgMonth = parseFloat(((cA.operationalGco2e + cA.embodiedGco2e) / 1000).toFixed(2));
  const cD = optionD
    ? CarbonEngine.calculateEC2Carbon(optionD.sku, optionD.region, vm.avgCpu, HOURS_PER_MONTH, optionD.vCpu)
    : cA;
  const targetKgMonth = parseFloat(((cD.operationalGco2e + cD.embodiedGco2e) / 1000).toFixed(2));
  const deltaPct = currentKgMonth > 0 ? parseFloat((((targetKgMonth - currentKgMonth) / currentKgMonth) * 100).toFixed(1)) : 0;

  let verdict = decideVerdict(
    shiftSavingsMonthly,
    optionB.monthlyUsd,
    migration.paybackMonths,
    req.confidence,
    blockers,
    cfg,
    currentKgMonth - targetKgMonth
  );
  if (vm.os === "windows" && verdict === "SHIFT") verdict = "CONSIDER";

  const reasons: string[] = [];
  if (rightsizingSavingsMonthly > 0) {
    reasons.push(
      `Rightsizing on ${vm.provider.toUpperCase()} alone saves $${rightsizingSavingsMonthly.toFixed(2)}/mo — achievable without migrating.`
    );
  }
  if (optionD && shiftSavingsMonthly > 0) {
    reasons.push(
      `${optionD.displayName} in ${optionD.regionName} is $${shiftSavingsMonthly.toFixed(2)}/mo (${shiftSavingsPct}%) cheaper than the best ${vm.provider.toUpperCase()} option.`
    );
    if (verdict === "SHIFT" || verdict === "CONSIDER") {
      reasons.push(
        `One-time migration cost ≈ $${migration.oneTimeUsd.toFixed(2)} (egress $${migration.egressUsd.toFixed(2)}, effort $${(migration.laborUsd + migration.archLaborUsd).toFixed(2)}); pays back in ${migration.paybackMonths ?? "∞"} months.`
      );
    } else {
      reasons.push(
        `Not worth moving: savings $${shiftSavingsMonthly.toFixed(2)}/mo would take ${migration.paybackMonths ?? "∞"} months to recover $${migration.oneTimeUsd.toFixed(2)}.`
      );
    }
  } else if (optionD && shiftSavingsMonthly <= 0) {
    reasons.push(
      `${vm.provider.toUpperCase()} is already cheaper for this shape by $${Math.abs(shiftSavingsMonthly).toFixed(2)}/mo.`
    );
  } else if (blockers.length > 0) {
    reasons.push(`Cross-cloud shift blocked: ${blockers.join(", ")}.`);
  }

  return {
    resourceId: vm.resourceId,
    name: vm.name,
    provider: vm.provider,
    region: vm.region,
    regionName: getRegionDisplayName(vm.region),
    telemetry: {
      peakCpu: vm.peakCpu,
      avgCpu: vm.avgCpu,
      p95Cpu: vm.p95Cpu,
      lookbackDays: vm.lookbackDays,
    },
    confidence: req.confidence,
    requirement: req,
    optionA,
    optionB,
    optionC,
    optionD,
    optionDSameArch,
    alternatives,
    rightsizingSavingsMonthly,
    shiftSavingsMonthly,
    totalSavingsMonthly,
    shiftSavingsAnnual,
    shiftSavingsPct,
    migration,
    carbon: { currentKgMonth, targetKgMonth, deltaPct },
    verdict,
    reasons,
    caveats: Array.from(new Set(caveats)),
    blockers,
    actions: {
      terraform: buildTargetTerraform(vm, optionD),
      migrationSteps: buildMigrationSteps(vm, optionD),
    },
  };
}

export function summarisePortfolio(
  machines: VmComparison[],
  stoppedVmCount = 0
): PortfolioSummary {
  const byProvider: Record<Provider, { vmCount: number; currentMonthlyUsd: number }> = {
    aws: { vmCount: 0, currentMonthlyUsd: 0 },
    azure: { vmCount: 0, currentMonthlyUsd: 0 },
  };
  const verdictCounts: Record<Verdict, number> = { SHIFT: 0, CONSIDER: 0, STAY: 0 };

  let rightsizeInPlaceMonthlyUsd = 0;
  let shiftMonthlyUsd = 0;
  let shiftOneTimeUsd = 0;

  for (const m of machines) {
    byProvider[m.provider].vmCount++;
    byProvider[m.provider].currentMonthlyUsd = parseFloat(
      (byProvider[m.provider].currentMonthlyUsd + m.optionA.monthlyUsd).toFixed(2)
    );
    verdictCounts[m.verdict]++;
    rightsizeInPlaceMonthlyUsd += m.rightsizingSavingsMonthly;
    if (m.verdict === "SHIFT") {
      shiftMonthlyUsd += m.shiftSavingsMonthly;
      shiftOneTimeUsd += m.migration.oneTimeUsd;
    }
  }

  rightsizeInPlaceMonthlyUsd = parseFloat(rightsizeInPlaceMonthlyUsd.toFixed(2));
  shiftMonthlyUsd = parseFloat(shiftMonthlyUsd.toFixed(2));
  shiftOneTimeUsd = parseFloat(shiftOneTimeUsd.toFixed(2));
  const shiftPaybackMonths =
    shiftMonthlyUsd > 0 ? parseFloat((shiftOneTimeUsd / shiftMonthlyUsd).toFixed(1)) : null;
  const bestCaseMonthlyUsd = parseFloat((rightsizeInPlaceMonthlyUsd + shiftMonthlyUsd).toFixed(2));

  const primaryProvider: Provider =
    byProvider.aws.vmCount >= byProvider.azure.vmCount ? "aws" : "azure";
  const otherLabel = primaryProvider === "aws" ? "Azure" : "AWS";
  const primaryLabel = primaryProvider === "aws" ? "AWS" : "Azure";

  let headline: PortfolioSummary["headline"] = "stay";
  let headlineText = `Stay on ${primaryLabel}. Rightsize in place to save $${rightsizeInPlaceMonthlyUsd.toFixed(2)}/mo.`;

  if (verdictCounts.SHIFT > 0 && machines.length > 0 && verdictCounts.SHIFT === machines.length) {
    headline = "shift_all";
    headlineText = `Move your ${primaryLabel} estate to ${otherLabel}: save $${shiftMonthlyUsd.toFixed(2)}/mo, pays back in ${shiftPaybackMonths ?? "—"} months.`;
  } else if (verdictCounts.SHIFT > 0) {
    headline = "shift_some";
    headlineText = `Stay on ${primaryLabel} — move ${verdictCounts.SHIFT} of ${machines.length} VMs to ${otherLabel} for $${shiftMonthlyUsd.toFixed(2)}/mo net.`;
  }

  const mixedEstateNote =
    byProvider.aws.vmCount > 0 && byProvider.azure.vmCount > 0
      ? "Mixed AWS + Azure estate detected: consolidating onto one cloud can further reduce operational overhead and vendor contracts."
      : null;

  return {
    runningVmCount: machines.length,
    stoppedVmCount,
    byProvider,
    verdictCounts,
    rightsizeInPlaceMonthlyUsd,
    shiftMonthlyUsd,
    shiftOneTimeUsd,
    shiftPaybackMonths,
    bestCaseMonthlyUsd,
    headline,
    headlineText,
    mixedEstateNote,
  };
}

export async function runCrossCloudAdvisor(
  tenantId: string,
  accountId: string | "all" = "all",
  overrides: Partial<CrossCloudConfig> = {}
): Promise<CrossCloudResponse> {
  const cfg: CrossCloudConfig = {
    ...GreenCloudConfig.crossCloud,
    ...overrides,
  };

  const accounts = await prisma.cloudAccount.findMany({
    where: {
      tenantId,
      ...(accountId !== "all" ? { id: accountId } : {}),
    },
  });

  const accountIds = accounts.map((a) => a.id);
  const allResources =
    accountIds.length > 0
      ? await prisma.cloudResource.findMany({
          where: { cloudAccountId: { in: accountIds } },
        })
      : [];

  const vmResources = allResources.filter(
    (r) => r.resourceType === "ec2" || r.resourceType === "azure_vm"
  );
  const runningVms = vmResources.filter((r) => r.lifecycleState.toLowerCase() === "running");
  const stoppedCount = vmResources.length - runningVms.length;

  const disks = allResources.filter(
    (r) => r.resourceType === "ebs" || r.resourceType === "azure_disk"
  );
  const ips = allResources.filter(
    (r) => r.resourceType === "eip" || r.resourceType === "azure_ip"
  );

  // Preload prices for all source + candidate regions
  const regionCache = new Map<string, Map<string, PriceLookup>>();
  const regionsToLoad: Array<{ provider: Provider; region: string }> = [];
  for (const vm of runningVms) {
    const prov: Provider = vm.resourceType === "azure_vm" ? "azure" : "aws";
    const reg = vm.region.toLowerCase();
    regionsToLoad.push({ provider: prov, region: reg });
    const otherProv: Provider = prov === "aws" ? "azure" : "aws";
    for (const cr of candidateRegions(prov, reg, cfg.regionMode)) {
      regionsToLoad.push({ provider: otherProv, region: cr });
    }
  }

  await Promise.all(
    regionsToLoad.map((t) => getRegionPrices(t.provider, t.region, "linux", regionCache))
  );

  const priceLookup: PriceLookupFn = (provider, sku, region) => {
    const map = regionCache.get(`${provider}:${region.toLowerCase()}:linux`);
    return map?.get(sku.toLowerCase()) || null;
  };

  const machines: VmComparison[] = runningVms.map((vm) => {
    const prov: Provider = vm.resourceType === "azure_vm" ? "azure" : "aws";
    const sku = (vm.instanceType || (prov === "aws" ? "t3.medium" : "Standard_D2s_v5")).toLowerCase();
    const spec = getSkuSpec(prov, sku);

    let tags: Array<{ Key: string; Value: string }> = [];
    try {
      tags = JSON.parse(vm.tags || "[]");
    } catch {}
    const name = tags.find((t) => t.Key === "Name")?.Value || vm.providerResourceId.split("/").pop() || vm.providerResourceId;
    const osTag = tags.find((t) => t.Key.toLowerCase() === "os")?.Value?.toLowerCase();
    const os: OsType = osTag?.includes("win") ? "windows" : "linux";

    let cpuSeries: number[] = [];
    let peakCpu = 20;
    let lookbackDays = 7;
    try {
      if (vm.telemetryMetrics) {
        const parsed = JSON.parse(vm.telemetryMetrics);
        if (Array.isArray(parsed.cpuDailyAverages)) cpuSeries = parsed.cpuDailyAverages;
        if (typeof parsed.peakCpu === "number") peakCpu = parsed.peakCpu;
        if (typeof parsed.lookbackDays === "number") lookbackDays = parsed.lookbackDays;
      }
    } catch {}

    const avgCpu =
      cpuSeries.length > 0
        ? parseFloat((cpuSeries.reduce((a, b) => a + b, 0) / cpuSeries.length).toFixed(2))
        : peakCpu;

    const attached = disks
      .filter(
        (d) =>
          d.cloudAccountId === vm.cloudAccountId &&
          d.attachedToResourceId &&
          (d.attachedToResourceId === vm.providerResourceId ||
            vm.providerResourceId.endsWith(d.attachedToResourceId))
      )
      .map((d) => ({
        id: d.providerResourceId,
        sizeGb: d.sizeGb || cfg.defaultRootDiskGb,
        tier: prov === "aws" ? "gp3" : "StandardSSD_LRS",
        monthlyUsd: d.monthlyCost || 0,
      }));

    const attachedDiskGb = attached.reduce((s, d) => s + d.sizeGb, 0);
    const attachedIps = ips.filter(
      (ip) =>
        ip.cloudAccountId === vm.cloudAccountId &&
        ip.attachedToResourceId === vm.providerResourceId
    );

    const normVm: NormalisedVm = {
      resourceId: vm.id,
      providerResourceId: vm.providerResourceId,
      name,
      provider: prov,
      region: vm.region.toLowerCase(),
      sku,
      spec,
      os,
      peakCpu,
      avgCpu,
      p95Cpu: computeP95(cpuSeries),
      lookbackDays,
      currentMonthlyUsd: vm.monthlyCost || 0,
      attachedDiskGb,
      attachedDisks: attached,
      hasPublicIp: attachedIps.length > 0,
      ipMonthlyUsd: attachedIps.reduce((s, i) => s + (i.monthlyCost || 0), 0),
    };

    return evaluateVm(normVm, SKU_SPECS, priceLookup, cfg);
  });

  const summary = summarisePortfolio(machines, stoppedCount);
  const snapDate = getSnapshotGeneratedAt();

  return {
    generatedAt: new Date().toISOString(),
    priceInfo: {
      aws: { source: "snapshot_or_db", asOf: snapDate },
      azure: { source: "snapshot_or_db", asOf: snapDate },
    },
    assumptions: cfg,
    summary,
    machines,
  };
}
