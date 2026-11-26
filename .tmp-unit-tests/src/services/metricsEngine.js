"use strict";
/**
 * GreenCloud AI - Canonical Financial, Utilization, Optimization, and Carbon Mathematics Engine
 *
 * Implements explicit, reproducible, non-hardcoded formulas grounded in:
 * - CNCF FOCUS / FinOps Foundation financial aggregations
 * - AWS Compute Optimizer percentile & headroom guardrails (14d / 32d / 93d windows)
 * - Azure Advisor idle/resize boundaries
 * - Green Software Foundation (GSF) ISO/IEC 21031 Software Carbon Intensity: SCI = ((E * I) + M) / R
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SCORING_WEIGHTS = void 0;
exports.computeTelemetryStats = computeTelemetryStats;
exports.computeUtilizationPercent = computeUtilizationPercent;
exports.computeCostAggregation = computeCostAggregation;
exports.computeEstimatedSavings = computeEstimatedSavings;
exports.computeVerifiedSavings = computeVerifiedSavings;
exports.evaluateAndScoreCandidates = evaluateAndScoreCandidates;
exports.computeSoftwareCarbonIntensity = computeSoftwareCarbonIntensity;
exports.DEFAULT_SCORING_WEIGHTS = {
    wCost: 0.35,
    wPerformance: 0.25,
    wReliability: 0.2,
    wCarbon: 0.2,
    wOperationalRisk: 0.15,
};
/**
 * Linear interpolation percentile on a pre-sorted ascending array.
 */
function interpolatePercentile(sorted, percentile) {
    if (sorted.length === 0)
        return 0;
    if (sorted.length === 1)
        return sorted[0];
    const rank = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(rank);
    const upper = Math.ceil(rank);
    const weight = rank - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}
/**
 * Computes statistical utilization percentiles and completeness without turning missing points into zeroes.
 */
function computeTelemetryStats(rawSamples, expectedSamplesCount) {
    const valid = rawSamples
        .filter((v) => typeof v === "number" && Number.isFinite(v))
        .slice();
    const expected = Math.max(expectedSamplesCount ?? rawSamples.length, valid.length, 1);
    const completeness = parseFloat(Math.min(100, (valid.length / expected) * 100).toFixed(1));
    if (valid.length === 0) {
        return {
            observedCount: 0,
            expectedCount: expected,
            dataCompletenessPct: 0,
            average: null,
            median: null,
            p50: null,
            p90: null,
            p95: null,
            p99: null,
            peak: null,
            variance: null,
        };
    }
    valid.sort((a, b) => a - b);
    const sum = valid.reduce((acc, v) => acc + v, 0);
    const mean = sum / valid.length;
    const variance = valid.reduce((acc, v) => acc + (v - mean) ** 2, 0) / valid.length;
    const p50 = interpolatePercentile(valid, 50);
    const p90 = interpolatePercentile(valid, 90);
    const p95 = interpolatePercentile(valid, 95);
    const p99 = interpolatePercentile(valid, 99);
    const peak = valid[valid.length - 1];
    return {
        observedCount: valid.length,
        expectedCount: expected,
        dataCompletenessPct: completeness,
        average: parseFloat(mean.toFixed(2)),
        median: parseFloat(p50.toFixed(2)),
        p50: parseFloat(p50.toFixed(2)),
        p90: parseFloat(p90.toFixed(2)),
        p95: parseFloat(p95.toFixed(2)),
        p99: parseFloat(p99.toFixed(2)),
        peak: parseFloat(peak.toFixed(2)),
        variance: parseFloat(variance.toFixed(2)),
    };
}
/**
 * Computes Utilization% = (ObservedUsage / AvailableCapacity) * 100
 */
function computeUtilizationPercent(observedUsage, availableCapacity) {
    if (typeof observedUsage !== "number" ||
        typeof availableCapacity !== "number" ||
        !Number.isFinite(observedUsage) ||
        !Number.isFinite(availableCapacity) ||
        availableCapacity <= 0) {
        return null;
    }
    return parseFloat(((observedUsage / availableCapacity) * 100).toFixed(2));
}
/**
 * Aggregates cost totals, period-over-period change %, budget utilization %, and variance.
 * Returns null for CostChange% if PreviousPeriodCost is absent or zero.
 */
function computeCostAggregation(params) {
    const validBilled = params.billedCosts.filter((v) => typeof v === "number" && Number.isFinite(v));
    if (validBilled.length === 0) {
        return {
            totalCost: null,
            effectiveCost: null,
            previousPeriodCost: null,
            costChangePct: null,
            budget: params.monthlyBudget,
            budgetUtilizationPct: null,
            budgetVariance: null,
            dataStatus: "unavailable",
        };
    }
    const totalCost = parseFloat(validBilled.reduce((s, c) => s + c, 0).toFixed(2));
    const validEffective = (params.effectiveCosts || []).filter((v) => typeof v === "number" && Number.isFinite(v));
    const effectiveCost = validEffective.length > 0
        ? parseFloat(validEffective.reduce((s, c) => s + c, 0).toFixed(2))
        : totalCost;
    const validPrev = (params.previousPeriodCosts || []).filter((v) => typeof v === "number" && Number.isFinite(v));
    const previousPeriodCost = validPrev.length > 0 ? parseFloat(validPrev.reduce((s, c) => s + c, 0).toFixed(2)) : null;
    const costChangePct = previousPeriodCost !== null && previousPeriodCost > 0
        ? parseFloat((((totalCost - previousPeriodCost) / previousPeriodCost) * 100).toFixed(2))
        : null;
    const budgetUtilizationPct = params.monthlyBudget > 0
        ? parseFloat(((totalCost / params.monthlyBudget) * 100).toFixed(2))
        : null;
    const budgetVariance = parseFloat((totalCost - params.monthlyBudget).toFixed(2));
    return {
        totalCost,
        effectiveCost,
        previousPeriodCost,
        costChangePct,
        budget: params.monthlyBudget,
        budgetUtilizationPct,
        budgetVariance,
        dataStatus: "actual",
    };
}
/**
 * PotentialSavings = BaselineEstimatedCost - CandidateEstimatedCost
 * PotentialSavings% = (PotentialSavings / BaselineEstimatedCost) * 100
 */
function computeEstimatedSavings(baselineEstimatedCost, candidateEstimatedCost) {
    const baseline = Math.max(0, baselineEstimatedCost);
    const candidate = Math.max(0, candidateEstimatedCost);
    const savings = parseFloat((baseline - candidate).toFixed(2));
    const pct = baseline > 0 ? parseFloat(((savings / baseline) * 100).toFixed(2)) : 0;
    return {
        baselineEstimatedCost: parseFloat(baseline.toFixed(2)),
        candidateEstimatedCost: parseFloat(candidate.toFixed(2)),
        potentialSavings: savings,
        potentialSavingsPct: pct,
        classification: "estimated",
    };
}
/**
 * VerifiedSavings = ExpectedBaselineCostForObservedWorkload - ActualPostChangeCost
 */
function computeVerifiedSavings(expectedBaselineCostForObservedWorkload, actualPostChangeCost, uncertaintyPct = 5) {
    const verified = parseFloat((expectedBaselineCostForObservedWorkload - actualPostChangeCost).toFixed(2));
    const pct = expectedBaselineCostForObservedWorkload > 0
        ? parseFloat(((verified / expectedBaselineCostForObservedWorkload) * 100).toFixed(2))
        : null;
    return {
        expectedBaselineCostForObservedWorkload: parseFloat(expectedBaselineCostForObservedWorkload.toFixed(2)),
        actualPostChangeCost: parseFloat(actualPostChangeCost.toFixed(2)),
        verifiedSavings: verified,
        verifiedSavingsPct: pct,
        uncertaintyPct,
        classification: "verified",
    };
}
/**
 * Evaluates optimization candidates against hard compatibility & headroom guardrails,
 * computes multi-objective score = wC*Cost + wP*Perf + wR*Reliability + wE*Carbon - wO*Risk,
 * and labels non-dominated Pareto optimal candidates across (Cost, Latency/Perf, Carbon).
 */
function evaluateAndScoreCandidates(currentConfig, constraints, candidates, weights = exports.DEFAULT_SCORING_WEIGHTS) {
    const requiredCpuRatio = constraints.observedCpuPercentile !== null && constraints.observedCpuPercentile !== undefined
        ? (constraints.observedCpuPercentile * (1 + constraints.cpuHeadroomPct / 100)) / 100
        : null;
    const requiredMemoryRatio = constraints.observedMemoryPercentile !== null && constraints.observedMemoryPercentile !== undefined
        ? (constraints.observedMemoryPercentile * (1 + (constraints.memoryHeadroomPct ?? 20) / 100)) / 100
        : null;
    const prelim = candidates.map((cand) => {
        const reasons = [];
        if (requiredCpuRatio === null) {
            reasons.push("Missing observed CPU percentile telemetry; cannot guarantee capacity.");
        }
        else {
            const requiredVcpus = currentConfig.vcpu * requiredCpuRatio;
            if (cand.vcpu < requiredVcpus) {
                reasons.push(`CPU capacity ${cand.vcpu} vCPU is below headroom-adjusted requirement (${requiredVcpus.toFixed(2)} vCPU).`);
            }
        }
        if (requiredMemoryRatio !== null) {
            const requiredMem = currentConfig.memoryGb * requiredMemoryRatio;
            if (cand.memoryGb < requiredMem) {
                reasons.push(`Memory ${cand.memoryGb} GB is below headroom-adjusted requirement (${requiredMem.toFixed(2)} GB).`);
            }
        }
        if (constraints.latencySloMs &&
            cand.projectedP95LatencyMs &&
            cand.projectedP95LatencyMs > constraints.latencySloMs) {
            reasons.push(`Projected P95 latency (${cand.projectedP95LatencyMs} ms) breaches SLO (${constraints.latencySloMs} ms).`);
        }
        if (constraints.requiredArchitecture &&
            cand.architecture.toLowerCase() !== constraints.requiredArchitecture.toLowerCase()) {
            reasons.push(`Architecture ${cand.architecture} incompatible with required ${constraints.requiredArchitecture}.`);
        }
        if (constraints.requiredRegion && cand.region !== constraints.requiredRegion) {
            reasons.push(`Region ${cand.region} violates data residency (${constraints.requiredRegion}).`);
        }
        if (constraints.minAvailabilityPct &&
            cand.availabilityPct < constraints.minAvailabilityPct) {
            reasons.push(`Availability ${cand.availabilityPct}% below target (${constraints.minAvailabilityPct}%).`);
        }
        return {
            cand,
            compatible: reasons.length === 0,
            reasons,
        };
    });
    const compatibleCands = prelim.filter((p) => p.compatible).map((p) => p.cand);
    const maxCost = Math.max(1, ...compatibleCands.map((c) => c.estimatedMonthlyCost));
    const maxCarbon = Math.max(1, ...compatibleCands.map((c) => c.estimatedMonthlyOperationalCarbonG));
    const maxLatency = Math.max(1, ...compatibleCands.map((c) => c.projectedP95LatencyMs || 100));
    // Pareto frontier on compatible set minimizing (cost, carbon, latency)
    const paretoIds = new Set();
    for (const a of compatibleCands) {
        let dominated = false;
        for (const b of compatibleCands) {
            if (a.id === b.id)
                continue;
            const latA = a.projectedP95LatencyMs ?? maxLatency;
            const latB = b.projectedP95LatencyMs ?? maxLatency;
            const bBetterOrEqAll = b.estimatedMonthlyCost <= a.estimatedMonthlyCost &&
                b.estimatedMonthlyOperationalCarbonG <= a.estimatedMonthlyOperationalCarbonG &&
                latB <= latA;
            const bStrictlyBetterOne = b.estimatedMonthlyCost < a.estimatedMonthlyCost ||
                b.estimatedMonthlyOperationalCarbonG < a.estimatedMonthlyOperationalCarbonG ||
                latB < latA;
            if (bBetterOrEqAll && bStrictlyBetterOne) {
                dominated = true;
                break;
            }
        }
        if (!dominated)
            paretoIds.add(a.id);
    }
    return prelim
        .map(({ cand, compatible, reasons }) => {
        if (!compatible) {
            return {
                id: cand.id,
                label: cand.label,
                compatible: false,
                rejectionReasons: reasons,
                score: null,
                isParetoOptimal: false,
                estimatedMonthlyCost: cand.estimatedMonthlyCost,
                estimatedMonthlyOperationalCarbonG: cand.estimatedMonthlyOperationalCarbonG,
                projectedP95LatencyMs: cand.projectedP95LatencyMs ?? null,
                operationalRisk: cand.operationalRisk,
            };
        }
        const costScore = 1 - cand.estimatedMonthlyCost / maxCost;
        const carbonScore = 1 - cand.estimatedMonthlyOperationalCarbonG / maxCarbon;
        const perfScore = 1 - (cand.projectedP95LatencyMs ?? maxLatency * 0.5) / maxLatency;
        const relScore = Math.min(1, Math.max(0, cand.availabilityPct / 100));
        const riskNorm = Math.min(1, Math.max(0, cand.operationalRisk / 10));
        const rawScore = weights.wCost * costScore +
            weights.wPerformance * perfScore +
            weights.wReliability * relScore +
            weights.wCarbon * carbonScore -
            weights.wOperationalRisk * riskNorm;
        return {
            id: cand.id,
            label: cand.label,
            compatible: true,
            rejectionReasons: [],
            score: parseFloat((rawScore * 100).toFixed(2)),
            isParetoOptimal: paretoIds.has(cand.id),
            estimatedMonthlyCost: cand.estimatedMonthlyCost,
            estimatedMonthlyOperationalCarbonG: cand.estimatedMonthlyOperationalCarbonG,
            projectedP95LatencyMs: cand.projectedP95LatencyMs ?? null,
            operationalRisk: cand.operationalRisk,
        };
    })
        .sort((a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity));
}
/**
 * Software Carbon Intensity (GSF ISO/IEC 21031): SCI = ((E * I) + M) / R
 * Note: Carbon offsets are strictly excluded from SCI reductions.
 */
function computeSoftwareCarbonIntensity(params) {
    const R = Math.max(1, params.functionalUnits);
    const unitLabel = params.functionalUnitLabel || "requests";
    if (params.energyKwh === null ||
        params.carbonIntensityGco2PerKwh === null ||
        params.embodiedGco2e === null) {
        return {
            energyKwh: params.energyKwh,
            carbonIntensityGco2PerKwh: params.carbonIntensityGco2PerKwh,
            operationalGco2e: null,
            embodiedGco2e: params.embodiedGco2e,
            totalGco2e: null,
            functionalUnits: R,
            functionalUnitLabel: unitLabel,
            sciScore: null,
            unit: `gCO2e per ${R.toLocaleString("en-US")} ${unitLabel}`,
            methodology: params.methodology || "GSF-SCI-ISO-21031 (Modelled)",
            confidence: params.confidence ?? 0,
        };
    }
    const operationalG = params.energyKwh * params.carbonIntensityGco2PerKwh;
    const totalG = operationalG + params.embodiedGco2e;
    const sci = totalG / R;
    return {
        energyKwh: parseFloat(params.energyKwh.toFixed(4)),
        carbonIntensityGco2PerKwh: parseFloat(params.carbonIntensityGco2PerKwh.toFixed(1)),
        operationalGco2e: parseFloat(operationalG.toFixed(2)),
        embodiedGco2e: parseFloat(params.embodiedGco2e.toFixed(2)),
        totalGco2e: parseFloat(totalG.toFixed(2)),
        functionalUnits: R,
        functionalUnitLabel: unitLabel,
        sciScore: parseFloat(sci.toFixed(5)),
        unit: `gCO2e per ${unitLabel}`,
        methodology: params.methodology || "GSF-SCI-ISO-21031 (Modelled Scope 2 Location + Scope 3 LCA)",
        confidence: params.confidence ?? 0.85,
    };
}
