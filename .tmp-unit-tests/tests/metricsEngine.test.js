"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const metricsEngine_1 = require("../src/services/metricsEngine");
(0, node_test_1.describe)("GreenCloud AI Milestone 1 Mathematical Engine", () => {
    (0, node_test_1.it)("computes percentiles (p50, p90, p95, p99, peak) and ignores null gaps without turning them into zero", () => {
        const samples = [10, 20, null, 30, 40, undefined, 50, 60, 70, 80, 90, 100];
        const stats = (0, metricsEngine_1.computeTelemetryStats)(samples, 12);
        strict_1.default.equal(stats.observedCount, 10);
        strict_1.default.equal(stats.expectedCount, 12);
        strict_1.default.equal(stats.dataCompletenessPct, 83.3);
        strict_1.default.equal(stats.average, 55);
        strict_1.default.equal(stats.median, 55);
        strict_1.default.equal(stats.p90, 91);
        strict_1.default.equal(stats.p95, 95.5);
        strict_1.default.equal(stats.peak, 100);
    });
    (0, node_test_1.it)("returns null statistics instead of fake zero when all telemetry samples are missing", () => {
        const stats = (0, metricsEngine_1.computeTelemetryStats)([null, undefined, Number.NaN], 14);
        strict_1.default.equal(stats.observedCount, 0);
        strict_1.default.equal(stats.dataCompletenessPct, 0);
        strict_1.default.equal(stats.average, null);
        strict_1.default.equal(stats.p95, null);
    });
    (0, node_test_1.it)("computes CostCostChange%, BudgetUtilization%, and BudgetVariance strictly from real data", () => {
        const result = (0, metricsEngine_1.computeCostAggregation)({
            billedCosts: [120, 80, 50],
            effectiveCosts: [100, 70, 45],
            previousPeriodCosts: [200],
            monthlyBudget: 300,
        });
        strict_1.default.equal(result.totalCost, 250);
        strict_1.default.equal(result.effectiveCost, 215);
        strict_1.default.equal(result.previousPeriodCost, 200);
        strict_1.default.equal(result.costChangePct, 25);
        strict_1.default.equal(result.budgetUtilizationPct, 83.33);
        strict_1.default.equal(result.budgetVariance, -50);
        strict_1.default.equal(result.dataStatus, "actual");
        // Previous period empty -> null (no fabricated multiplier)
        const noPrior = (0, metricsEngine_1.computeCostAggregation)({
            billedCosts: [100],
            monthlyBudget: 100,
        });
        strict_1.default.equal(noPrior.costChangePct, null);
    });
    (0, node_test_1.it)("computes estimated vs verified counterfactual savings accurately", () => {
        const est = (0, metricsEngine_1.computeEstimatedSavings)(120, 72);
        strict_1.default.equal(est.potentialSavings, 48);
        strict_1.default.equal(est.potentialSavingsPct, 40);
        strict_1.default.equal(est.classification, "estimated");
        const ver = (0, metricsEngine_1.computeVerifiedSavings)(130, 80, 4);
        strict_1.default.equal(ver.verifiedSavings, 50);
        strict_1.default.equal(ver.verifiedSavingsPct, 38.46);
        strict_1.default.equal(ver.classification, "verified");
    });
    (0, node_test_1.it)("computes utilization percentage safely", () => {
        strict_1.default.equal((0, metricsEngine_1.computeUtilizationPercent)(35, 100), 35);
        strict_1.default.equal((0, metricsEngine_1.computeUtilizationPercent)(null, 100), null);
        strict_1.default.equal((0, metricsEngine_1.computeUtilizationPercent)(20, 0), null);
    });
    (0, node_test_1.it)("rejects optimization candidates violating CPU/Memory headroom or SLOs and finds Pareto frontier", () => {
        const evaluated = (0, metricsEngine_1.evaluateAndScoreCandidates)({ vcpu: 8, memoryGb: 32 }, {
            observedCpuPercentile: 50,
            cpuHeadroomPct: 20, // requires 8 * 0.60 = 4.8 vCPU
            observedMemoryPercentile: 40,
            memoryHeadroomPct: 25, // requires 32 * 0.50 = 16 GB
            latencySloMs: 120,
            requiredArchitecture: "x86_64",
            requiredRegion: "us-west-2",
            minAvailabilityPct: 99.9,
        }, [
            {
                id: "too-small",
                label: "c6i.large (2 vCPU)",
                vcpu: 2,
                memoryGb: 4,
                architecture: "x86_64",
                region: "us-west-2",
                availabilityPct: 99.99,
                estimatedMonthlyCost: 60,
                estimatedMonthlyOperationalCarbonG: 900,
                projectedP95LatencyMs: 80,
                operationalRisk: 2,
            },
            {
                id: "breach-slo",
                label: "m6i.2xlarge slow IO",
                vcpu: 8,
                memoryGb: 32,
                architecture: "x86_64",
                region: "us-west-2",
                availabilityPct: 99.99,
                estimatedMonthlyCost: 110,
                estimatedMonthlyOperationalCarbonG: 1400,
                projectedP95LatencyMs: 150,
                operationalRisk: 2,
            },
            {
                id: "pareto-cost",
                label: "c6i.2xlarge (8 vCPU, 16 GB)",
                vcpu: 8,
                memoryGb: 16,
                architecture: "x86_64",
                region: "us-west-2",
                availabilityPct: 99.95,
                estimatedMonthlyCost: 95,
                estimatedMonthlyOperationalCarbonG: 1200,
                projectedP95LatencyMs: 90,
                operationalRisk: 2,
            },
            {
                id: "pareto-fast-green",
                label: "r6i.2xlarge (8 vCPU, 64 GB)",
                vcpu: 8,
                memoryGb: 64,
                architecture: "x86_64",
                region: "us-west-2",
                availabilityPct: 99.99,
                estimatedMonthlyCost: 130,
                estimatedMonthlyOperationalCarbonG: 1050,
                projectedP95LatencyMs: 70,
                operationalRisk: 1,
            },
        ]);
        const tooSmall = evaluated.find((c) => c.id === "too-small");
        strict_1.default.equal(tooSmall.compatible, false);
        strict_1.default.ok(tooSmall.rejectionReasons.length >= 2);
        const breachSlo = evaluated.find((c) => c.id === "breach-slo");
        strict_1.default.equal(breachSlo.compatible, false);
        const paretoCost = evaluated.find((c) => c.id === "pareto-cost");
        const paretoFast = evaluated.find((c) => c.id === "pareto-fast-green");
        strict_1.default.equal(paretoCost.compatible, true);
        strict_1.default.equal(paretoCost.isParetoOptimal, true);
        strict_1.default.equal(paretoFast.compatible, true);
        strict_1.default.equal(paretoFast.isParetoOptimal, true);
    });
    (0, node_test_1.it)("computes official GSF ISO/IEC 21031 SCI = ((E * I) + M) / R", () => {
        const sci = (0, metricsEngine_1.computeSoftwareCarbonIntensity)({
            energyKwh: 12.5, // E
            carbonIntensityGco2PerKwh: 80, // I -> E*I = 1000 gCO2e
            embodiedGco2e: 250, // M
            functionalUnits: 10000, // R
            functionalUnitLabel: "API requests",
        });
        strict_1.default.equal(sci.operationalGco2e, 1000);
        strict_1.default.equal(sci.totalGco2e, 1250);
        strict_1.default.equal(sci.sciScore, 0.125); // (1000 + 250) / 10000
        strict_1.default.equal(sci.unit, "gCO2e per API requests");
    });
});
