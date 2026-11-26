import { NextResponse } from "next/server";
import { parseDashboardScope } from "@/services/dashboardScope";
import { prisma, TenantIsolatedDb } from "@/services/db";
import { localDemoEnabled, resolveWorkspaceAccess, workspaceAccessResponse } from "@/services/workspaceAccess";
import { seedDefaultTenant } from "@/services/seed";
import { ForecastingEngine } from "@/services/forecastingEngine";
import {
  CLOUD_REGION_CATALOG,
  CloudProviderId,
  getRegionMeta,
  normalizeFocusServiceCategory,
  normalizeProviderId,
} from "@/services/cloudMetadata";

export const dynamic = "force-dynamic";

function parseTagList(rawTags: string | null | undefined): Array<{ Key: string; Value: string }> {
  if (!rawTags) return [];
  try {
    const parsed = JSON.parse(rawTags);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === "object") {
      return Object.entries(parsed).map(([Key, Value]) => ({ Key, Value: String(Value) }));
    }
  } catch {}
  return [];
}

function parseCpuTelemetry(raw: string | null | undefined): {
  avgCpu: number | null;
  peakCpu: number | null;
  cpuSeries: number[];
} {
  if (!raw) return { avgCpu: null, peakCpu: null, cpuSeries: [] };
  try {
    const parsed = JSON.parse(raw);
    const series = Array.isArray(parsed.cpuDailyAverages)
      ? parsed.cpuDailyAverages.filter((v: unknown): v is number =>
          typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100
        )
      : [];
    const avg =
      series.length > 0
        ? parseFloat((series.reduce((a: number, b: number) => a + b, 0) / series.length).toFixed(2))
        : null;
    const peak =
      typeof parsed.peakCpu === "number"
        ? parseFloat(parsed.peakCpu.toFixed(2))
        : series.length > 0
        ? parseFloat(Math.max(...series).toFixed(2))
        : null;
    return { avgCpu: avg, peakCpu: peak, cpuSeries: series };
  } catch {
    return { avgCpu: null, peakCpu: null, cpuSeries: [] };
  }
}

export async function GET(request: Request) {
  try {
    const access = localDemoEnabled() ? null : await resolveWorkspaceAccess(request);
    const tenant = access?.tenant ?? await seedDefaultTenant();
    const { searchParams } = new URL(request.url);

    const { label: windowLabel, days: windowDays, accountIds: requestedIds, providerSet: providerFilterSet } = parseDashboardScope(searchParams);
    const roleParam = searchParams.get("role") || tenant.activeRole || "admin";

    const allAccountsRaw = access
      ? (await prisma.cloudAccount.findMany({
          where: { tenantId: tenant.id },
          select: { id: true, provider: true, externalAccountId: true, name: true, status: true,
            primaryRegion: true, roleArn: true, syncFreshness: true, syncError: true, providerConfig: true },
        })).filter((account) => access.permits("dashboard:read", account.id, account.provider)
          && access.permits("account:read", account.id, account.provider))
          .map(({ roleArn, providerConfig, syncError, ...account }) => ({
            ...account,
            syncError: syncError ? "Sync needs attention" : null,
            roleArn: roleArn ? "configured" : null,
            providerConfig: providerConfig === JSON.stringify({ ingestMode: "focus_import" }) ? providerConfig : null,
          }))
      : await new TenantIsolatedDb(tenant.id).listSanitizedAccounts();
    const accountIds = allAccountsRaw.map(({ id }) => id);
    const latestJobs = access ? await prisma.syncJob.findMany({
      where: { tenantId: tenant.id, cloudAccountId: { in: accountIds } },
      distinct: ["cloudAccountId"],
      orderBy: [{ startedAt: "desc" }, { id: "desc" }],
    }) : [];
    const jobByAccount = new Map(latestJobs.map((job) => [job.cloudAccountId, job]));
    const allAccounts = allAccountsRaw.map((a) => ({
      canSync: access ? a.provider === "aws" && Boolean(a.roleArn) && access.permits("sync:trigger", a.id, a.provider) : undefined,
      sync: (() => {
        const job = jobByAccount.get(a.id);
        return job ? { status: job.status, attemptedAt: job.startedAt, sources: JSON.parse(job.subSourceStatuses) } : null;
      })(),
      ...a,
      provider: normalizeProviderId(a.provider),
    }));

    const selectedAccounts = allAccounts.filter((account) =>
      providerFilterSet.has(account.provider) && (requestedIds === null || requestedIds.has(account.id))
    );

    const selectedAccountIds = selectedAccounts.map((a) => a.id);
    const activeAccount = selectedAccounts[0] || null;
    const recommendationAccountIds = selectedAccounts.filter((account) =>
      !access || access.permits("recommendation:read", account.id, account.provider)
    ).map((account) => account.id);
    const accountById = new Map(allAccounts.map((a) => [a.id, a]));

    const monthlyBudget = tenant.monthlyBudget || 150.0;
    const functionalUnits = tenant.functionalUnits || 100000;

    const accessMode = access ? "scoped" : "local_demo";
    const canExportBilling = access ? selectedAccounts.some((account) =>
      access.permits("billing:export", account.id, account.provider)
    ) : true;

    if (selectedAccountIds.length === 0) {
      return NextResponse.json({
        accessMode,
        canExportBilling,
        scope: {
          accountIds: [],
          providers: Array.from(providerFilterSet),
          window: windowLabel,
          role: roleParam,
          isMultiAccount: false,
          isMultiProvider: false,
        },
        workspaceConfig: {
          monthlyBudget,
          functionalUnits,
          activeRole: tenant.activeRole || "admin",
        },
        account: null,
        selectedAccounts: [],
        allAccounts,
        resources: {
          total: 0,
          ec2: [],
          ebs: [],
          eip: [],
          byRegion: [],
          runningEc2Count: 0,
          stoppedEc2Count: 0,
          byState: { healthy: 0, underutilized: 0, peak: 0, stopped: 0 },
        },
        scanCoverage: {
          totalMonitoredRegions: Object.keys(CLOUD_REGION_CATALOG).length,
          allMonitoredRegions: Object.keys(CLOUD_REGION_CATALOG),
          activeRegionsWithResources: [],
          activeRegionsWithRunningCompute: [],
          isMultiRegionRunning: false,
        },
        multiRegionAlert: null,
        costs: {
          totalCost: null,
          effectiveCostTotal: null,
          discountSavings: 0,
          dailyBurnRate: null,
          priorPeriodCost: null,
          byService: [],
          dailyTrend: [],
          dailyByAccount: [],
          dailyByProvider: [],
        },
        tagAllocation: {
          hygieneScore: 100,
          taggedCount: 0,
          untaggedCount: 0,
          byEnvironment: [],
          byTeam: [],
        },
        budget: {
          target: monthlyBudget,
          spent: 0,
          pacePercentage: 0,
          projectedMonthEnd: 0,
          status: "healthy",
        },
        anomalies: {
          hasAnomalies: false,
          detectedCount: 0,
          message: "Connect or select at least one cloud account to evaluate telemetry.",
          items: [],
        },
        carbon: {
          totalOperationalCarbon: null,
          totalEmbodiedCarbon: null,
          totalCarbon: null,
          sciScore: null,
          functionalUnits,
          cleanGridSharePct: 0,
          regionalGrid: [],
        },
        recommendations: {
          items: [],
          totalSavings: null,
          totalCarbonSavings: null,
          activeCount: 0,
        },
        cpuDistribution: {
          band0_20: 0,
          band20_50: 0,
          band50_80: 0,
          band80_plus: 0,
          oversizedCount: 0,
          potentialRightsizingSavings: 0,
        },
        inventory: {
          ec2Total: 0,
          ec2Healthy: 0,
          ec2Review: 0,
          ebsTotal: 0,
          ebsAttached: 0,
          ebsIdle: 0,
          eipTotal: 0,
          eipAssociated: 0,
          eipUnused: 0,
          activeRegions: [],
        },
        comparisons: {
          byAccount: [],
          byProvider: [],
        },
        auditLogs: [],
      }, { headers: { "Cache-Control": "private, no-store" } });
    }

    const now = new Date();
    const windowStart = new Date(now.getTime() - windowDays * 24 * 3600 * 1000);
    const prevWindowStart = new Date(now.getTime() - windowDays * 2 * 24 * 3600 * 1000);

    // Parallel indexed DB reads across selected accounts
    const [resources, costItemsAll, recommendationsRaw, auditLogsRaw] = await Promise.all([
      prisma.cloudResource.findMany({
        where: { cloudAccountId: { in: selectedAccountIds } },
        include: {
          carbonEmissions: { orderBy: { ts: "desc" }, take: 1 },
        },
      }),
      prisma.costLineItem.findMany({
        where: {
          cloudAccountId: { in: selectedAccountIds },
          chargeDate: { gte: prevWindowStart },
        },
        orderBy: { chargeDate: "asc" },
      }),
      prisma.recommendation.findMany({
        where: {
          tenantId: tenant.id,
          resource: { cloudAccountId: { in: recommendationAccountIds } },
        },
        include: { resource: true },
        orderBy: { estimatedMonthlySavings: "desc" },
      }),
      access ? Promise.resolve([]) : prisma.auditLog.findMany({
        where: { tenantId: tenant.id },
        orderBy: { ts: "desc" },
        take: 15,
      }),
    ]);

    // Classify compute, storage, network across AWS / GCP / Azure
    const computeTypes = new Set(["ec2", "gce_vm", "azure_vm"]);
    const storageTypes = new Set(["ebs", "disk"]);

    const computeResources = resources.filter((r) => computeTypes.has(r.resourceType));
    const storageResources = resources.filter((r) => storageTypes.has(r.resourceType));
    const networkResources = resources.filter((r) => r.resourceType === "eip");

    let healthyCount = 0;
    let underutilizedCount = 0;
    let peakCount = 0;
    let stoppedCount = 0;
    let band0_20 = 0;
    let band20_50 = 0;
    let band50_80 = 0;
    let band80_plus = 0;

    const enrichedEc2List = computeResources.map((inst) => {
      const acct = accountById.get(inst.cloudAccountId);
      const prov = normalizeProviderId(inst.provider || acct?.provider);
      const meta = getRegionMeta(inst.region, prov);
      const tags = parseTagList(inst.tags);
      const nameTag = tags.find((t) => t.Key === "Name" || t.Key === "name")?.Value;
      const { avgCpu, peakCpu, cpuSeries } = parseCpuTelemetry(inst.telemetryMetrics);

      if (inst.lifecycleState === "stopped") {
        stoppedCount++;
      } else if (inst.lifecycleState === "running" && avgCpu !== null) {
        const effCpu = avgCpu;
        if (effCpu < 10) underutilizedCount++;
        else if (effCpu > 80) peakCount++;
        else healthyCount++;

        if (effCpu < 20) band0_20++;
        else if (effCpu < 50) band20_50++;
        else if (effCpu < 80) band50_80++;
        else band80_plus++;
      }

      return {
        id: inst.id,
        cloudAccountId: inst.cloudAccountId,
        accountName: acct?.name || inst.cloudAccountId,
        provider: prov,
        providerResourceId: inst.providerResourceId,
        name: nameTag || inst.providerResourceId,
        region: inst.region,
        regionName: meta.name,
        gridIntensity: meta.gridIntensity,
        instanceType: inst.instanceType || "unknown",
        lifecycleState: inst.lifecycleState,
        monthlyCost: parseFloat((inst.monthlyCost || 0).toFixed(2)),
        avgCpu,
        peakCpu,
        cpuSeries,
        tags,
        carbonEmissions: inst.carbonEmissions.map((c) => ({
          energyKwh: c.energyKwh,
          operationalGco2e: c.operationalGco2e,
          embodiedGco2e: c.embodiedGco2e,
        })),
      };
    });

    const enrichedEbsList = storageResources.map((vol) => {
      const acct = accountById.get(vol.cloudAccountId);
      const prov = normalizeProviderId(vol.provider || acct?.provider);
      const meta = getRegionMeta(vol.region, prov);
      return {
        id: vol.id,
        cloudAccountId: vol.cloudAccountId,
        accountName: acct?.name || vol.cloudAccountId,
        provider: prov,
        providerResourceId: vol.providerResourceId,
        region: vol.region,
        regionName: meta.name,
        sizeGb: vol.sizeGb || 0,
        volumeType: vol.instanceType || (prov === "gcp" ? "pd-balanced" : "gp3"),
        lifecycleState: vol.lifecycleState,
        monthlyCost: parseFloat((vol.monthlyCost || 0).toFixed(2)),
      };
    });

    const enrichedEipList = networkResources.map((ip) => {
      const acct = accountById.get(ip.cloudAccountId);
      const prov = normalizeProviderId(ip.provider || acct?.provider);
      return {
        id: ip.id,
        cloudAccountId: ip.cloudAccountId,
        accountName: acct?.name || ip.cloudAccountId,
        provider: prov,
        providerResourceId: ip.providerResourceId,
        publicIp: ip.providerResourceId,
        region: ip.region,
        lifecycleState: ip.lifecycleState,
        monthlyCost: parseFloat((ip.monthlyCost || 0).toFixed(2)),
      };
    });

    const currentCostItems = costItemsAll.filter((c) => c.chargeDate >= windowStart && c.chargeDate <= now);
    const priorCostItems = costItemsAll.filter(
      (c) => c.chargeDate >= prevWindowStart && c.chargeDate < windowStart
    );


    const serviceMap = new Map<string, { service: string; category: string; provider: CloudProviderId; total: number }>();
    const dailyTrendMap = new Map<string, number>();
    const dailyByAccountMap = new Map<string, Record<string, number>>();
    const dailyByProviderMap = new Map<string, Record<CloudProviderId, number>>();

    let billedSum = 0;
    let effectiveSum = 0;

    for (const item of currentCostItems) {
      const acct = accountById.get(item.cloudAccountId);
      const prov = normalizeProviderId(item.provider || acct?.provider);
      const dayKey = item.chargeDate.toISOString().split("T")[0];
      const cat = item.serviceCategory || normalizeFocusServiceCategory(item.providerService);

      billedSum += item.billedCost;
      effectiveSum += item.effectiveCost;

      const sKey = `${prov}::${item.providerService}`;
      const existingSvc = serviceMap.get(sKey) || {
        service: item.providerService,
        category: cat,
        provider: prov,
        total: 0,
      };
      existingSvc.total += item.billedCost;
      serviceMap.set(sKey, existingSvc);

      dailyTrendMap.set(dayKey, (dailyTrendMap.get(dayKey) || 0) + item.billedCost);

      const acctDay = dailyByAccountMap.get(dayKey) || {};
      acctDay[acct?.name || item.cloudAccountId] = parseFloat(
        ((acctDay[acct?.name || item.cloudAccountId] || 0) + item.billedCost).toFixed(2)
      );
      dailyByAccountMap.set(dayKey, acctDay);

      const provDay = dailyByProviderMap.get(dayKey) || { aws: 0, gcp: 0, azure: 0 };
      provDay[prov] = parseFloat((provDay[prov] + item.billedCost).toFixed(2));
      dailyByProviderMap.set(dayKey, provDay);
    }

    const totalCost = currentCostItems.length > 0 ? parseFloat(billedSum.toFixed(2)) : null;
    const effectiveCostTotal = currentCostItems.length > 0 ? parseFloat(effectiveSum.toFixed(2)) : null;
    const discountSavings =
      totalCost !== null && effectiveCostTotal !== null
        ? parseFloat(Math.max(0, totalCost - effectiveCostTotal).toFixed(2))
        : 0;
    const priorPeriodCost =
      priorCostItems.length > 0
        ? parseFloat(priorCostItems.reduce((s, c) => s + c.billedCost, 0).toFixed(2))
        : null;

    const byServiceCosts = Array.from(serviceMap.values())
      .map((s) => ({ ...s, total: parseFloat(s.total.toFixed(2)) }))
      .filter((s) => s.total > 0)
      .sort((a, b) => b.total - a.total);

    const dailyTrend = Array.from(dailyTrendMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, cost]) => ({ date, cost: parseFloat(cost.toFixed(2)) }));

    const dailyByAccount = Array.from(dailyByAccountMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({ date, ...values }));

    const dailyByProvider = Array.from(dailyByProviderMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({ date, ...values }));

    // Carbon Rollups + Per-Region Aggregation
    let rawOpCarbon = 0;
    let rawEmbCarbon = 0;
    let cleanGridResCount = 0;

    const regionAggMap = new Map<
      string,
      {
        region: string;
        name: string;
        provider: CloudProviderId;
        gridIntensity: number;
        mix: string;
        carbonStatus: string;
        ec2Count: number;
        ebsCount: number;
        eipCount: number;
        resourceCount: number;
        runningEc2: number;
        monthlyCost: number;
        operationalGco2e: number;
        accountSet: Set<string>;
      }
    >();

    for (const r of resources) {
      const acct = accountById.get(r.cloudAccountId);
      const prov = normalizeProviderId(r.provider || acct?.provider);
      const meta = getRegionMeta(r.region, prov);
      if (meta.gridIntensity <= 210) cleanGridResCount++;

      const latestC = r.carbonEmissions?.[0];
      const opG = latestC?.operationalGco2e || 0;
      const embG = latestC?.embodiedGco2e || 0;
      rawOpCarbon += opG;
      rawEmbCarbon += embG;

      const entry = regionAggMap.get(r.region) || {
        region: r.region,
        name: meta.name,
        provider: prov,
        gridIntensity: meta.gridIntensity,
        mix: meta.mix,
        carbonStatus: meta.carbonStatus,
        ec2Count: 0,
        ebsCount: 0,
        eipCount: 0,
        resourceCount: 0,
        runningEc2: 0,
        monthlyCost: 0,
        operationalGco2e: 0,
        accountSet: new Set<string>(),
      };

      entry.resourceCount++;
      entry.monthlyCost += r.monthlyCost || 0;
      entry.operationalGco2e += opG;
      entry.accountSet.add(r.cloudAccountId);

      if (computeTypes.has(r.resourceType)) {
        entry.ec2Count++;
        if (r.lifecycleState === "running") entry.runningEc2++;
      } else if (storageTypes.has(r.resourceType)) {
        entry.ebsCount++;
      } else if (r.resourceType === "eip") {
        entry.eipCount++;
      }

      regionAggMap.set(r.region, entry);
    }

    const totalOperationalCarbon = resources.some((r) => r.carbonEmissions.length > 0)
      ? parseFloat(rawOpCarbon.toFixed(2))
      : null;
    const totalEmbodiedCarbon = resources.some((r) => r.carbonEmissions.length > 0)
      ? parseFloat(rawEmbCarbon.toFixed(2))
      : null;
    const totalCarbonGrams =
      totalOperationalCarbon !== null && totalEmbodiedCarbon !== null
        ? parseFloat((totalOperationalCarbon + totalEmbodiedCarbon).toFixed(2))
        : null;
    const sciScore =
      totalCarbonGrams !== null
        ? parseFloat((totalCarbonGrams / Math.max(1, functionalUnits)).toFixed(5))
        : null;
    const cleanGridSharePct =
      resources.length > 0 ? Math.round((cleanGridResCount / resources.length) * 100) : 0;

    const byRegion = Array.from(regionAggMap.values()).map((r) => ({
      region: r.region,
      name: r.name,
      provider: r.provider,
      gridIntensity: r.gridIntensity,
      ec2Count: r.ec2Count,
      ebsCount: r.ebsCount,
      eipCount: r.eipCount,
      resourceCount: r.resourceCount,
      accountCount: r.accountSet.size,
      monthlyCost: parseFloat(r.monthlyCost.toFixed(2)),
      operationalGco2e: parseFloat(r.operationalGco2e.toFixed(2)),
    }));

    const regionalGrid = Object.values(CLOUD_REGION_CATALOG).map((meta) => {
      const live = regionAggMap.get(meta.region);
      return {
        region: meta.region,
        name: meta.name,
        provider: meta.provider,
        gridIntensity: meta.gridIntensity,
        mix: meta.mix,
        carbonStatus: meta.carbonStatus,
        resourceCount: live?.resourceCount || 0,
        monthlyCost: live ? parseFloat(live.monthlyCost.toFixed(2)) : 0,
        estimatedCarbonGco2e: live ? parseFloat(live.operationalGco2e.toFixed(2)) : 0,
      };
    });

    // Multi-Account & Multi-Provider Comparison Rollups
    const accountComparisonMap = new Map<
      string,
      {
        id: string;
        name: string;
        provider: CloudProviderId;
        externalAccountId: string;
        monthlySpend: number;
        effectiveCost: number;
        potentialSavings: number;
        operationalCarbonG: number;
        ec2Count: number;
        ebsCount: number;
        eipCount: number;
        resourceCount: number;
        activeRecCount: number;
        cpuSum: number;
        cpuCount: number;
        lastSyncedAt: string | null;
      }
    >();

    for (const acc of selectedAccounts) {
      accountComparisonMap.set(acc.id, {
        id: acc.id,
        name: acc.name,
        provider: acc.provider,
        externalAccountId: acc.externalAccountId,
        monthlySpend: 0,
        effectiveCost: 0,
        potentialSavings: 0,
        operationalCarbonG: 0,
        ec2Count: 0,
        ebsCount: 0,
        eipCount: 0,
        resourceCount: 0,
        activeRecCount: 0,
        cpuSum: 0,
        cpuCount: 0,
        lastSyncedAt: acc.syncFreshness ? new Date(acc.syncFreshness).toISOString() : null,
      });
    }

    const billingByAccount = new Map<string, Map<string, number>>();
    for (const item of currentCostItems) {
      const totals = billingByAccount.get(item.cloudAccountId) ?? new Map<string, number>();
      totals.set(item.currency, (totals.get(item.currency) ?? 0) + item.billedCost);
      billingByAccount.set(item.cloudAccountId, totals);
      const acc = accountComparisonMap.get(item.cloudAccountId);
      if (acc) {
        acc.monthlySpend += item.billedCost;
        acc.effectiveCost += item.effectiveCost;
      }
    }
    for (const r of resources) {
      const acc = accountComparisonMap.get(r.cloudAccountId);
      if (acc) {
        acc.resourceCount++;
        if (computeTypes.has(r.resourceType)) acc.ec2Count++;
        else if (storageTypes.has(r.resourceType)) acc.ebsCount++;
        else if (r.resourceType === "eip") acc.eipCount++;
        acc.operationalCarbonG += r.carbonEmissions?.[0]?.operationalGco2e || 0;
        const { avgCpu } = parseCpuTelemetry(r.telemetryMetrics);
        if (avgCpu !== null) {
          acc.cpuSum += avgCpu;
          acc.cpuCount++;
        }
      }
    }
    for (const rec of recommendationsRaw) {
      if (rec.status === "active" || rec.status === "approved") {
        const acc = accountComparisonMap.get(rec.resource.cloudAccountId);
        if (acc) {
          acc.potentialSavings += rec.estimatedMonthlySavings;
          if (rec.status === "active") acc.activeRecCount++;
        }
      }
    }

    const byAccountComparison = Array.from(accountComparisonMap.values()).map((a) => ({
      id: a.id,
      name: a.name,
      provider: a.provider,
      externalAccountId: a.externalAccountId,
      monthlySpend: parseFloat(a.monthlySpend.toFixed(2)),
      effectiveCost: parseFloat(a.effectiveCost.toFixed(2)),
      potentialSavings: parseFloat(a.potentialSavings.toFixed(2)),
      operationalCarbonG: parseFloat(a.operationalCarbonG.toFixed(2)),
      ec2Count: a.ec2Count,
      ebsCount: a.ebsCount,
      eipCount: a.eipCount,
      resourceCount: a.resourceCount,
      activeRecCount: a.activeRecCount,
      avgCpu: a.cpuCount > 0 ? parseFloat((a.cpuSum / a.cpuCount).toFixed(1)) : null,
      lastSyncedAt: a.lastSyncedAt,
      billingTotals: Array.from(billingByAccount.get(a.id) ?? [],
        ([currency, amount]) => ({ currency, amount: Number(amount.toFixed(2)) })
      ),
    }));

    const providerRollupMap = new Map<
      CloudProviderId,
      {
        provider: CloudProviderId;
        accountCount: number;
        monthlySpend: number;
        effectiveCost: number;
        potentialSavings: number;
        operationalCarbonG: number;
        resourceCount: number;
        activeRecCount: number;
      }
    >();
    for (const acc of byAccountComparison) {
      const pEntry = providerRollupMap.get(acc.provider) || {
        provider: acc.provider,
        accountCount: 0,
        monthlySpend: 0,
        effectiveCost: 0,
        potentialSavings: 0,
        operationalCarbonG: 0,
        resourceCount: 0,
        activeRecCount: 0,
      };
      pEntry.accountCount++;
      pEntry.monthlySpend += acc.monthlySpend;
      pEntry.effectiveCost += acc.effectiveCost;
      pEntry.potentialSavings += acc.potentialSavings;
      pEntry.operationalCarbonG += acc.operationalCarbonG;
      pEntry.resourceCount += acc.resourceCount;
      pEntry.activeRecCount += acc.activeRecCount;
      providerRollupMap.set(acc.provider, pEntry);
    }

    const byProviderComparison = Array.from(providerRollupMap.values()).map((p) => ({
      ...p,
      monthlySpend: parseFloat(p.monthlySpend.toFixed(2)),
      effectiveCost: parseFloat(p.effectiveCost.toFixed(2)),
      potentialSavings: parseFloat(p.potentialSavings.toFixed(2)),
      operationalCarbonG: parseFloat(p.operationalCarbonG.toFixed(2)),
    }));

    // Recommendations formatted for UI
    const formattedRecs = recommendationsRaw.map((rec) => {
      const acct = accountById.get(rec.resource.cloudAccountId);
      return {
        id: rec.id,
        title: rec.title,
        category: rec.category,
        description: rec.description || undefined,
        terraformHcl: rec.terraformHcl || undefined,
        estimatedMonthlySavings: rec.estimatedMonthlySavings,
        estimatedGco2eSavings: rec.estimatedGco2eSavings,
        riskScore: rec.riskScore,
        status: rec.status,
        evidence: rec.evidence,
        accountName: acct?.name || rec.resource.cloudAccountId,
        provider: normalizeProviderId(rec.resource.provider || acct?.provider),
        resource: {
          providerResourceId: rec.resource.providerResourceId,
          region: rec.resource.region,
          resourceType: rec.resource.resourceType,
        },
      };
    });

    const totalSavings = formattedRecs
      .filter((r) => r.status === "active" || r.status === "approved")
      .reduce((s, r) => s + r.estimatedMonthlySavings, 0);
    const totalCarbonSavings = formattedRecs
      .filter((r) => r.status === "active" || r.status === "approved")
      .reduce((s, r) => s + r.estimatedGco2eSavings, 0);

    // Tag allocation & hygiene
    let taggedCount = 0;
    let untaggedCount = 0;
    const envMap: Record<string, { count: number; cost: number }> = {
      Production: { count: 0, cost: 0 },
      Staging: { count: 0, cost: 0 },
      Development: { count: 0, cost: 0 },
      Untagged: { count: 0, cost: 0 },
    };
    const teamMap: Record<string, { count: number; cost: number }> = {};

    for (const res of resources) {
      const tags = parseTagList(res.tags);
      if (tags.length > 0) taggedCount++;
      else untaggedCount++;

      const envTag = tags.find((t) =>
        ["env", "environment"].includes(t.Key.toLowerCase())
      );
      let envKey = "Untagged";
      if (envTag?.Value) {
        const val = envTag.Value.toLowerCase();
        if (val.includes("prod")) envKey = "Production";
        else if (val.includes("stag")) envKey = "Staging";
        else if (val.includes("dev") || val.includes("test")) envKey = "Development";
      }
      envMap[envKey].count++;
      envMap[envKey].cost += res.monthlyCost || 0;

      const teamTag = tags.find((t) =>
        ["owner", "team", "project", "costcenter"].includes(t.Key.toLowerCase())
      );
      const tKey = teamTag?.Value || "Unassigned";
      if (!teamMap[tKey]) teamMap[tKey] = { count: 0, cost: 0 };
      teamMap[tKey].count++;
      teamMap[tKey].cost += res.monthlyCost || 0;
    }

    const byEnvironment = Object.entries(envMap)
      .filter(([key, d]) => d.count > 0 || key === "Production" || key === "Staging" || key === "Development")
      .map(([name, d]) => ({
        name,
        count: d.count,
        cost: parseFloat(d.cost.toFixed(2)),
        percentage: resources.length > 0 ? Math.round((d.count / resources.length) * 100) : 0,
      }));

    const byTeam = Object.entries(teamMap).map(([name, d]) => ({
      name,
      count: d.count,
      cost: parseFloat(d.cost.toFixed(2)),
    }));

    // Forecasting & Anomaly Engine (over selected accounts & window)
    const forecastingEngine = new ForecastingEngine({
      forecastHorizonDays: Math.min(30, windowDays),
      targetMonthlyBudget: monthlyBudget,
      zScoreThreshold: 2.5,
    });
    const dailyHistory = dailyTrend.map((d) => ({
      date: d.date,
      cost: d.cost,
      carbonGco2e:
        totalOperationalCarbon && totalCost
          ? parseFloat(((d.cost / Math.max(0.01, totalCost)) * totalOperationalCarbon).toFixed(1))
          : 0,
    }));
    const forecastResult = forecastingEngine.analyze(dailyHistory, monthlyBudget);

    const activeRegionsWithRunningCompute = Array.from(regionAggMap.values())
      .filter((r) => r.runningEc2 > 0)
      .map((r) => r.region);
    const isMultiRegionRunning = activeRegionsWithRunningCompute.length > 1;
    const multiRegionBurn = byRegion
      .filter((r) => activeRegionsWithRunningCompute.includes(r.region))
      .reduce((s, r) => s + r.monthlyCost, 0);

    const combinedAnomalies = [
      ...(isMultiRegionRunning
        ? [
            {
              id: "anomaly-multi-region",
              date: now.toISOString().split("T")[0],
              dimension: "region",
              entityName: `Multi-Region Compute (${activeRegionsWithRunningCompute.join(", ")})`,
              actualCost: parseFloat(multiRegionBurn.toFixed(2)),
              expectedBaseline: 0,
              deviationPercent: 100,
              zScore: 2.8,
              severity: "warning",
              rootCauseHint:
                "Running compute nodes span multiple active cloud regions across selected accounts.",
              recommendedAction:
                "Consolidate non-HA dev workloads into lower-carbon primary regions.",
            },
          ]
        : []),
      ...forecastResult.anomalies.items,
    ];

    const spentBudget = totalCost !== null ? totalCost : 0;
    const budgetPace = Math.min(100, Math.round((spentBudget / Math.max(1, monthlyBudget)) * 100));

    return NextResponse.json({
      accessMode,
      canExportBilling,
      scope: {
        accountIds: selectedAccountIds,
        providers: Array.from(providerFilterSet),
        window: windowLabel,
        role: roleParam,
        isMultiAccount: selectedAccountIds.length > 1,
        isMultiProvider: byProviderComparison.length > 1,
      },
      workspaceConfig: {
        monthlyBudget,
        functionalUnits,
        activeRole: tenant.activeRole || "admin",
      },
      account: activeAccount,
      selectedAccounts,
      allAccounts,
      resources: {
        total: resources.length,
        ec2: enrichedEc2List,
        ebs: enrichedEbsList,
        eip: enrichedEipList,
        byRegion,
        runningEc2Count: computeResources.filter((i) => i.lifecycleState === "running").length,
        stoppedEc2Count: stoppedCount,
        byState: {
          healthy: healthyCount,
          underutilized: underutilizedCount,
          peak: peakCount,
          stopped: stoppedCount,
        },
      },
      scanCoverage: {
        totalMonitoredRegions: Object.keys(CLOUD_REGION_CATALOG).length,
        allMonitoredRegions: Object.keys(CLOUD_REGION_CATALOG),
        activeRegionsWithResources: byRegion.map((r) => r.region),
        activeRegionsWithRunningCompute,
        isMultiRegionRunning,
      },
      multiRegionAlert: isMultiRegionRunning
        ? {
            regionsCount: activeRegionsWithRunningCompute.length,
            regions: activeRegionsWithRunningCompute,
            monthlyBurnEstimate: parseFloat(multiRegionBurn.toFixed(2)),
          }
        : null,
      costs: {
        totalCost,
        effectiveCostTotal,
        discountSavings,
        dailyBurnRate:
          totalCost !== null
            ? parseFloat((totalCost / Math.max(1, dailyTrend.length || now.getUTCDate())).toFixed(2))
            : null,
        priorPeriodCost,
        byService: byServiceCosts,
        dailyTrend,
        dailyByAccount,
        dailyByProvider,
      },
      tagAllocation: {
        hygieneScore:
          resources.length > 0 ? Math.round((taggedCount / resources.length) * 100) : 100,
        taggedCount,
        untaggedCount,
        byEnvironment,
        byTeam,
      },
      budget: {
        target: monthlyBudget,
        spent: spentBudget,
        pacePercentage: budgetPace,
        projectedMonthEnd:
          forecastResult.monthEndProjectedCost > 0
            ? forecastResult.monthEndProjectedCost
            : totalCost || 0,
        status:
          spentBudget > monthlyBudget
            ? "exceeded"
            : spentBudget > monthlyBudget * 0.8
            ? "warning"
            : "healthy",
        riskLevel: forecastResult.budgetRisk,
        next30DaysProjected: forecastResult.next30DaysProjectedCost,
        trendVelocity: forecastResult.trendVelocity,
      },
      forecast: {
        trajectory: forecastResult.trajectory,
        forecastDaysCount: forecastResult.forecastDaysCount,
        monthEndProjectedCost: forecastResult.monthEndProjectedCost,
        monthEndProjectedCarbon: forecastResult.monthEndProjectedCarbon,
        next30DaysProjectedCost: forecastResult.next30DaysProjectedCost,
        trendVelocity: forecastResult.trendVelocity,
        budgetRisk: forecastResult.budgetRisk,
      },
      anomalies: {
        hasAnomalies: combinedAnomalies.length > 0,
        detectedCount: combinedAnomalies.length,
        criticalCount: combinedAnomalies.filter((a) => a.severity === "critical").length,
        warningCount: combinedAnomalies.filter((a) => a.severity === "warning").length,
        message:
          combinedAnomalies.length > 0
            ? `${combinedAnomalies.length} spend or placement signal(s) flagged.`
            : `Telemetry nominal across selected accounts (${windowLabel} window).`,
        items: combinedAnomalies,
      },
      carbon: {
        totalOperationalCarbon,
        totalEmbodiedCarbon,
        totalCarbon: totalCarbonGrams,
        sciScore,
        functionalUnits,
        cleanGridSharePct,
        regionalGrid,
      },
      recommendations: {
        items: formattedRecs,
        totalSavings: formattedRecs.length > 0 ? parseFloat(totalSavings.toFixed(2)) : null,
        totalCarbonSavings:
          formattedRecs.length > 0 ? parseFloat(totalCarbonSavings.toFixed(2)) : null,
        activeCount: formattedRecs.filter((r) => r.status === "active").length,
      },
      cpuDistribution: {
        band0_20,
        band20_50,
        band50_80,
        band80_plus,
        oversizedCount: band0_20,
        potentialRightsizingSavings: band0_20 > 0 ? band0_20 * 18.5 : 0,
      },
      inventory: {
        ec2Total: computeResources.length,
        ec2Healthy: healthyCount,
        ec2Review: underutilizedCount + stoppedCount,
        ebsTotal: storageResources.length,
        ebsAttached: storageResources.filter((v) => v.lifecycleState === "in-use").length,
        ebsIdle: storageResources.filter(
          (v) => v.lifecycleState === "available" || v.lifecycleState === "unattached"
        ).length,
        eipTotal: networkResources.length,
        eipAssociated: networkResources.filter((e) => e.lifecycleState === "associated").length,
        eipUnused: networkResources.filter((e) => e.lifecycleState === "unassociated").length,
        activeRegions: byRegion.map((r) => r.region),
      },
      comparisons: {
        byAccount: byAccountComparison,
        byProvider: byProviderComparison,
      },
      auditLogs: auditLogsRaw.map((l) => ({
        id: l.id,
        ts: l.ts.toISOString(),
        actor: l.actor,
        action: l.action,
        targetType: l.objectType,
        targetId: l.objectId,
      })),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error: any) {
    const denied = workspaceAccessResponse(error);
    if (denied) return denied;
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to load dashboard data" } },
      { status: 500 }
    );
  }
}
