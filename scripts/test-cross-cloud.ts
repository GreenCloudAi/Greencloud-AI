import assert from "node:assert/strict";
import {
  evaluateVm,
  summarisePortfolio,
  type CrossCloudConfig,
  type NormalisedVm,
  type PriceLookupFn,
} from "../src/services/crossCloudAdvisor";
import { SKU_SPECS } from "../src/services/pricing/skuSpecs";
import { calculateTargetMachine } from "../src/services/machineCatalog";
import type { Provider } from "../src/services/pricing/regionMap";

const BASE_CFG: CrossCloudConfig = {
  regionMode: "paired",
  targetPeakUtilizationPct: 70,
  allowArchChange: false,
  maxMemoryOverprovisionRatio: 2,
  shiftMinMonthlyUsd: 10,
  shiftMinPct: 10,
  shiftMaxPaybackMonths: 6,
  considerMaxPaybackMonths: 12,
  laborHoursPerVm: 8,
  laborRatePerHour: 75, // $600 labor
  archChangeExtraHours: 8,
  parallelRunDays: 3,
  dataToMoveRatio: 1.0,
  defaultRootDiskGb: 30,
  egressFreeGb: { aws: 100, azure: 100 },
  egressPerGb: {
    aws: { asia: 0.1, north_america: 0.09, europe: 0.09 },
    azure: { asia: 0.12, north_america: 0.087, europe: 0.087 },
  },
  publicIpMonthly: { aws: 3.65, azure: 3.65 },
  greenWeighting: 0,
  carbonPricePerKg: 0.08,
};

function makeFixturePrices(overrides: Record<string, number> = {}): PriceLookupFn {
  // Default fixture hourly prices ($/hr * 730 = $/mo)
  const defaults: Record<string, number> = {
    // AWS ap-south-1
    "aws:m5.xlarge:ap-south-1": 500 / 730,
    "aws:m5.large:ap-south-1": 500 / 730,
    "aws:m7i.large:ap-south-1": 500 / 730,
    "aws:m6i.large:ap-south-1": 500 / 730,
    "aws:m6a.large:ap-south-1": 500 / 730,
    "aws:m7a.large:ap-south-1": 500 / 730,
    "aws:m7g.large:ap-south-1": 400 / 730,
    "aws:c5.large:ap-south-1": 480 / 730,
    "aws:c7i.large:ap-south-1": 480 / 730,
    "aws:t3.large:ap-south-1": 300 / 730,
    // Azure centralindia (30% cheaper for same shape -> $350/mo)
    "azure:standard_d2s_v5:centralindia": 350 / 730,
    "azure:standard_d2as_v5:centralindia": 350 / 730,
    "azure:standard_d2ps_v5:centralindia": 280 / 730, // Arm64 cheaper
    "azure:standard_b2s:centralindia": 250 / 730,
    "azure:standard_b2ms:centralindia": 260 / 730,
  };
  const table = { ...defaults, ...overrides };
  return (provider: Provider, sku: string, region: string) => {
    const key = `${provider}:${sku.toLowerCase()}:${region.toLowerCase()}`;
    const hourly = table[key];
    if (!hourly) return null;
    return {
      hourlyUsd: hourly,
      monthlyUsd: parseFloat((hourly * 730).toFixed(2)),
      source: "snapshot",
      fetchedAt: "2026-11-27T00:00:00Z",
    };
  };
}

function makeVm(partial: Partial<NormalisedVm> = {}): NormalisedVm {
  return {
    resourceId: "res-1",
    providerResourceId: "i-123",
    name: "web-01",
    provider: "aws",
    region: "ap-south-1",
    sku: "m5.large",
    spec: SKU_SPECS.find((s) => s.provider === "aws" && s.sku === "m5.large")!,
    os: "linux",
    peakCpu: 60,
    avgCpu: 35,
    p95Cpu: 60,
    lookbackDays: 14,
    currentMonthlyUsd: 516, // 500 compute + 16 disk
    attachedDiskGb: 200,
    attachedDisks: [{ id: "vol-1", sizeGb: 200, tier: "gp3", monthlyUsd: 16 }],
    hasPublicIp: false,
    ipMonthlyUsd: 0,
    ...partial,
  };
}

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`✓ ${name}`);
}

// T1: AWS VM, other cloud 30% cheaper for same shape, 200 GB disk -> SHIFT, exact payback
test("T1: 30% cheaper other cloud -> SHIFT with exact payback", () => {
  const vm = makeVm();
  const res = evaluateVm(vm, SKU_SPECS, makeFixturePrices(), BASE_CFG);
  assert.equal(res.verdict, "SHIFT");
  const expectedPayback = parseFloat((res.migration.oneTimeUsd / res.shiftSavingsMonthly).toFixed(1));
  assert.equal(res.migration.paybackMonths, expectedPayback);
});

// T2: Other cloud 3% cheaper -> STAY (below 10%)
test("T2: 3% cheaper other cloud -> STAY", () => {
  const vm = makeVm({ currentMonthlyUsd: 116 });
  const prices = makeFixturePrices({
    "aws:m5.large:ap-south-1": 100 / 730,
    "aws:m7i.large:ap-south-1": 100 / 730,
    "aws:m6i.large:ap-south-1": 100 / 730,
    "aws:m6a.large:ap-south-1": 100 / 730,
    "aws:m7a.large:ap-south-1": 100 / 730,
    "azure:standard_d2s_v5:centralindia": 97.5 / 730,
    "azure:standard_d2as_v5:centralindia": 97.5 / 730,
  });
  const res = evaluateVm(vm, SKU_SPECS, prices, BASE_CFG);
  assert.equal(res.verdict, "STAY");
});

// T3: Other cloud 15% cheaper, but 2 TB disk -> payback > 12 mo -> STAY
test("T3: 15% cheaper but 2 TB disk -> payback > 12 mo -> STAY", () => {
  const vm = makeVm({
    currentMonthlyUsd: 560, // 400 compute + 160 disk
    attachedDiskGb: 2048,
    attachedDisks: [{ id: "vol-big", sizeGb: 2048, tier: "gp3", monthlyUsd: 160 }],
  });
  const prices = makeFixturePrices({
    "aws:m5.large:ap-south-1": 400 / 730,
    "aws:m7i.large:ap-south-1": 400 / 730,
    "aws:m6i.large:ap-south-1": 400 / 730,
    "aws:m6a.large:ap-south-1": 400 / 730,
    "aws:m7a.large:ap-south-1": 400 / 730,
    "azure:standard_d2s_v5:centralindia": 340 / 730,
    "azure:standard_d2as_v5:centralindia": 340 / 730,
  });
  const res = evaluateVm(vm, SKU_SPECS, prices, BASE_CFG);
  assert.ok((res.migration.paybackMonths || 0) > 12);
  assert.equal(res.verdict, "STAY");
});

// T4: Payback 9 mo -> CONSIDER
test("T4: Payback ~9 mo -> CONSIDER", () => {
  const vm = makeVm({ currentMonthlyUsd: 216, attachedDiskGb: 100, attachedDisks: [{ id: "v", sizeGb: 100, tier: "gp3", monthlyUsd: 8 }] });
  const prices = makeFixturePrices({
    "aws:m5.large:ap-south-1": 200 / 730,
    "aws:m7i.large:ap-south-1": 200 / 730,
    "aws:m6i.large:ap-south-1": 200 / 730,
    "aws:m6a.large:ap-south-1": 200 / 730,
    "aws:m7a.large:ap-south-1": 200 / 730,
    "azure:standard_d2s_v5:centralindia": 133 / 730,
    "azure:standard_d2as_v5:centralindia": 133 / 730,
  });
  const res = evaluateVm(vm, SKU_SPECS, prices, BASE_CFG);
  assert.ok((res.migration.paybackMonths || 0) > 6 && (res.migration.paybackMonths || 0) <= 12);
  assert.equal(res.verdict, "CONSIDER");
});

// T5: Peak CPU 12% on 8 vCPU -> requirement 2 vCPU; A-B and B-D reported separately; A-D = sum
test("T5: Peak CPU 12% on 8 vCPU -> 2 vCPU; A-D equals (A-B) + (B-D)", () => {
  const vm = makeVm({
    sku: "c5.2xlarge",
    spec: SKU_SPECS.find((s) => s.provider === "aws" && s.sku === "c5.2xlarge")!,
    peakCpu: 12,
    p95Cpu: 12,
    currentMonthlyUsd: 900,
    attachedDiskGb: 100,
    attachedDisks: [{ id: "v", sizeGb: 100, tier: "gp3", monthlyUsd: 8 }],
  });
  const prices = makeFixturePrices({
    "aws:c5.2xlarge:ap-south-1": 892 / 730,
    "aws:r5.large:ap-south-1": 500 / 730,
    "aws:r6i.large:ap-south-1": 500 / 730,
    "aws:r7i.large:ap-south-1": 500 / 730,
    "azure:standard_e2s_v5:centralindia": 350 / 730,
  });
  const res = evaluateVm(vm, SKU_SPECS, prices, BASE_CFG);
  assert.equal(res.requirement.vCpu, 2);
  assert.equal(res.optionB.vCpu, 2);
  assert.equal(
    parseFloat((res.rightsizingSavingsMonthly + res.shiftSavingsMonthly).toFixed(2)),
    res.totalSavingsMonthly
  );
});

// T6: Arm candidate cheapest, allowArchChange=false -> D is x86
test("T6: allowArchChange=false excludes Arm", () => {
  const res = evaluateVm(makeVm(), SKU_SPECS, makeFixturePrices(), { ...BASE_CFG, allowArchChange: false });
  assert.equal(res.optionD?.arch, "x86_64");
});

// T7: Arm candidate cheapest, allowArchChange=true -> D is Arm, optionDSameArch set, arch_change caveat, +arch labor
test("T7: allowArchChange=true picks Arm, sets optionDSameArch & arch_change caveat", () => {
  const res = evaluateVm(makeVm(), SKU_SPECS, makeFixturePrices(), { ...BASE_CFG, allowArchChange: true });
  assert.equal(res.optionD?.arch, "arm64");
  assert.equal(res.optionDSameArch?.arch, "x86_64");
  assert.ok(res.caveats.includes("arch_change"));
  assert.equal(res.migration.archLaborUsd, 8 * 75);
});

// T8: avgCpu 35%, burstable baseline 20% -> burstable SKUs excluded
test("T8: avgCpu 35% excludes burstable SKUs with 20% baseline", () => {
  const res = evaluateVm(makeVm({ avgCpu: 35 }), SKU_SPECS, makeFixturePrices(), BASE_CFG);
  assert.notEqual(res.optionD?.category, "burstable");
});

// T9: Region with no pair -> blocker no_equivalent_region, verdict STAY, B still computed
test("T9: Unpaired region -> blocker no_equivalent_region, STAY", () => {
  const res = evaluateVm(makeVm({ region: "me-central-1" }), SKU_SPECS, makeFixturePrices(), BASE_CFG);
  assert.ok(res.blockers.includes("no_equivalent_region"));
  assert.equal(res.verdict, "STAY");
  assert.ok(res.optionB);
});

// T10: Unknown SKU -> blocker unknown_sku, STAY
test("T10: Unknown SKU -> blocker unknown_sku, STAY", () => {
  const res = evaluateVm(makeVm({ sku: "custom.unknown", spec: null, currentMonthlyUsd: 120 }), SKU_SPECS, makeFixturePrices(), BASE_CFG);
  assert.ok(res.blockers.includes("unknown_sku"));
  assert.equal(res.optionA.monthlyUsd, 120);
  assert.equal(res.verdict, "STAY");
});

// T11: Lookback 5 days -> confidence low, no rightsizing, at most CONSIDER
test("T11: Lookback 5 days -> confidence low, B=A, max verdict CONSIDER", () => {
  const res = evaluateVm(makeVm({ lookbackDays: 5, peakCpu: 15, p95Cpu: null }), SKU_SPECS, makeFixturePrices(), BASE_CFG);
  assert.equal(res.confidence, "low");
  assert.equal(res.optionB.sku, res.optionA.sku);
  assert.notEqual(res.verdict, "SHIFT");
});

// T12: Target SKU has no price in region -> skipped, next cheapest picked
test("T12: Unpriced target SKU skipped", () => {
  const prices = makeFixturePrices({ "azure:standard_d2s_v5:centralindia": 0 });
  const res = evaluateVm(makeVm(), SKU_SPECS, prices, BASE_CFG);
  assert.notEqual(res.optionD?.sku, "standard_d2s_v5");
});

// T13: Azure -> AWS direction
test("T13: Azure -> AWS symmetric evaluation", () => {
  const vm = makeVm({
    provider: "azure",
    region: "centralindia",
    sku: "standard_d2s_v5",
    spec: SKU_SPECS.find((s) => s.provider === "azure" && s.sku === "standard_d2s_v5")!,
    currentMonthlyUsd: 516,
  });
  const prices = makeFixturePrices({
    "azure:standard_d2s_v5:centralindia": 500 / 730,
    "azure:standard_d2as_v5:centralindia": 500 / 730,
    "aws:m5.large:ap-south-1": 300 / 730,
    "aws:m7i.large:ap-south-1": 300 / 730,
  });
  const res = evaluateVm(vm, SKU_SPECS, prices, BASE_CFG);
  assert.equal(res.optionD?.provider, "aws");
  assert.equal(res.verdict, "SHIFT");
});

// T14: Savings 3% -> shiftSavingsPct = 3.0 (no 15% floor)
test("T14: Savings 3% has no 15% floor", () => {
  const vm = makeVm({ currentMonthlyUsd: 116 });
  const prices = makeFixturePrices({
    "aws:m5.large:ap-south-1": 100 / 730,
    "aws:m7i.large:ap-south-1": 100 / 730,
    "aws:m6i.large:ap-south-1": 100 / 730,
    "aws:m6a.large:ap-south-1": 100 / 730,
    "aws:m7a.large:ap-south-1": 100 / 730,
    "azure:standard_d2s_v5:centralindia": 96.5 / 730,
    "azure:standard_d2as_v5:centralindia": 96.5 / 730,
  });
  const res = evaluateVm(vm, SKU_SPECS, prices, BASE_CFG);
  assert.ok(res.shiftSavingsPct > 0 && res.shiftSavingsPct < 10);
});

// T15: r5.xlarge through legacy calculateTargetMachine -> target r7g.large exists in catalog
test("T15: calculateTargetMachine r5.xlarge -> r7g.large", () => {
  const shift = calculateTargetMachine("r5.xlarge", 20, 10, 183.96, "i-r5", "us-east-1");
  assert.equal(shift.targetMachine, "r7g.large");
  assert.ok(shift.monthlySavings > 0);
});

// T16: Portfolio summary totals equal per-VM sums, headline shift_some
test("T16: Portfolio summary aggregation & shift_some headline", () => {
  const shiftVm = evaluateVm(makeVm({ resourceId: "1" }), SKU_SPECS, makeFixturePrices(), BASE_CFG);
  const stayVm = evaluateVm(makeVm({ resourceId: "2", region: "me-central-1" }), SKU_SPECS, makeFixturePrices(), BASE_CFG);
  const summary = summarisePortfolio([shiftVm, stayVm], 1);
  assert.equal(summary.runningVmCount, 2);
  assert.equal(summary.stoppedVmCount, 1);
  assert.equal(summary.verdictCounts.SHIFT, 1);
  assert.equal(summary.verdictCounts.STAY, 1);
  assert.equal(summary.headline, "shift_some");
  assert.equal(summary.shiftMonthlyUsd, shiftVm.shiftSavingsMonthly);
});

console.log(`\nAll ${passed}/16 Cross-Cloud Advisor tests passed.`);
