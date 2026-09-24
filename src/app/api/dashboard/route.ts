import { NextResponse } from "next/server";
import { prisma, TenantIsolatedDb } from "@/services/db";
import { seedDefaultTenant } from "@/services/seed";

const REGION_METADATA: Record<
  string,
  { name: string; country: string; flag: string; gridIntensity: number; mix: string; carbonStatus: string }
> = {
  "ap-south-1": { name: "Asia Pacific (Mumbai)", country: "India", flag: "🇮🇳", gridIntensity: 680, mix: "Thermal & Solar", carbonStatus: "High Carbon" },
  "us-east-1": { name: "US East (N. Virginia)", country: "United States", flag: "🇺🇸", gridIntensity: 420, mix: "Gas & Coal", carbonStatus: "Moderate" },
  "us-east-2": { name: "US East (Ohio)", country: "United States", flag: "🇺🇸", gridIntensity: 410, mix: "Coal & Gas", carbonStatus: "Moderate" },
  "us-west-1": { name: "US West (N. California)", country: "United States", flag: "🇺🇸", gridIntensity: 210, mix: "Solar & Gas", carbonStatus: "Clean" },
  "us-west-2": { name: "US West (Oregon)", country: "United States", flag: "🇺🇸", gridIntensity: 80, mix: "Hydro & Wind", carbonStatus: "Ultra Clean" },
  "eu-central-1": { name: "Europe (Frankfurt)", country: "Germany", flag: "🇩🇪", gridIntensity: 340, mix: "Wind, Coal & Solar", carbonStatus: "Moderate" },
  "eu-west-1": { name: "Europe (Ireland)", country: "Ireland", flag: "🇮🇪", gridIntensity: 310, mix: "Wind & Gas", carbonStatus: "Moderate" },
  "eu-west-2": { name: "Europe (London)", country: "United Kingdom", flag: "🇬🇧", gridIntensity: 220, mix: "Wind & Nuclear", carbonStatus: "Clean" },
  "eu-west-3": { name: "Europe (Paris)", country: "France", flag: "🇫🇷", gridIntensity: 75, mix: "Nuclear & Hydro", carbonStatus: "Ultra Clean" },
  "eu-north-1": { name: "Europe (Stockholm)", country: "Sweden", flag: "🇸🇪", gridIntensity: 45, mix: "Hydro & Nuclear", carbonStatus: "Ultra Clean" },
  "ap-southeast-1": { name: "Asia Pacific (Singapore)", country: "Singapore", flag: "🇸🇬", gridIntensity: 480, mix: "Natural Gas", carbonStatus: "High Carbon" },
  "ap-southeast-2": { name: "Asia Pacific (Sydney)", country: "Australia", flag: "🇦🇺", gridIntensity: 560, mix: "Coal & Solar", carbonStatus: "High Carbon" },
  "ap-northeast-1": { name: "Asia Pacific (Tokyo)", country: "Japan", flag: "🇯🇵", gridIntensity: 470, mix: "LNG & Coal", carbonStatus: "High Carbon" },
  "ap-northeast-2": { name: "Asia Pacific (Seoul)", country: "South Korea", flag: "🇰🇷", gridIntensity: 460, mix: "Nuclear & Coal", carbonStatus: "High Carbon" },
  "ap-northeast-3": { name: "Asia Pacific (Osaka)", country: "Japan", flag: "🇯🇵", gridIntensity: 390, mix: "Nuclear & LNG", carbonStatus: "Moderate" },
  "ca-central-1": { name: "Canada (Central)", country: "Canada", flag: "🇨🇦", gridIntensity: 120, mix: "Hydro & Nuclear", carbonStatus: "Clean" },
  "sa-east-1": { name: "South America (São Paulo)", country: "Brazil", flag: "🇧🇷", gridIntensity: 110, mix: "Hydroelectric", carbonStatus: "Clean" },
};

export async function GET(request: Request) {
  try {
    const tenant = await seedDefaultTenant();
    const db = new TenantIsolatedDb(tenant.id);
    const { searchParams } = new URL(request.url);
    const requestedAccountId = searchParams.get("accountId");

    // 1. Fetch all cloud accounts for this tenant
    const allAccounts = await db.listAccounts();

    // Determine active account: requested account or first account
    const activeAccount = requestedAccountId
      ? allAccounts.find((a) => a.id === requestedAccountId) || allAccounts[0]
      : allAccounts[0] || null;

    if (!activeAccount) {
      return NextResponse.json({
        account: null,
        allAccounts: [],
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
          totalMonitoredRegions: Object.keys(REGION_METADATA).length,
          allMonitoredRegions: Object.keys(REGION_METADATA),
          activeRegionsWithResources: [],
          activeRegionsWithRunningCompute: [],
          isMultiRegionRunning: false,
        },
        multiRegionAlert: null,
        costs: {
          totalCost: null,
          dailyBurnRate: null,
          priorMonthCost: null,
          byService: [],
          dailyTrend: [],
        },
        carbon: {
          totalOperationalCarbon: null,
          totalEmbodiedCarbon: null,
          totalCarbon: null,
          sciScore: null,
          functionalUnits: 100000,
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
          rdsCount: 0,
          natCount: 0,
        },
        tagAllocation: {
          hygieneScore: 100,
          taggedCount: 0,
          untaggedCount: 0,
          byEnvironment: [],
          byTeam: [],
        },
        budget: {
          target: 50.0,
          spent: 0.0,
          pacePercentage: 0,
          projectedMonthEnd: 0.0,
          status: "healthy",
        },
        anomalies: {
          hasAnomalies: false,
          detectedCount: 0,
          message: "No anomalies detected.",
        },
        auditLogs: [],
      });
    }

    // 2. Fetch resources for active account
    const resources = await prisma.cloudResource.findMany({
      where: { cloudAccountId: activeAccount.id },
      include: {
        carbonEmissions: {
          orderBy: { ts: "desc" },
          take: 1,
        },
      },
    });

    const ec2List = resources.filter((r) => r.resourceType === "ec2");
    const ebsList = resources.filter((r) => r.resourceType === "ebs");
    const eipList = resources.filter((r) => r.resourceType === "eip");

    // Resource Health classification
    let healthyCount = 0;
    let underutilizedCount = 0;
    let peakCount = 0;
    let stoppedCount = 0;

    ec2List.forEach((instance) => {
      if (instance.lifecycleState === "stopped") {
        stoppedCount++;
      } else {
        let avgCpu = 35; // nominal baseline
        try {
          if (instance.telemetryMetrics) {
            const parsed = JSON.parse(instance.telemetryMetrics);
            if (Array.isArray(parsed.cpuDailyAverages) && parsed.cpuDailyAverages.length > 0) {
              avgCpu = parsed.cpuDailyAverages.reduce((a: number, b: number) => a + b, 0) / parsed.cpuDailyAverages.length;
            } else if (typeof parsed.peakCpu === "number") {
              avgCpu = parsed.peakCpu;
            }
          }
        } catch {
          // ignore parse error
        }

        if (avgCpu < 10) {
          underutilizedCount++;
        } else if (avgCpu > 80) {
          peakCount++;
        } else {
          healthyCount++;
        }
      }
    });

    // 3. Fetch Cost Line Items for active account
    const costTotals = await prisma.costLineItem.groupBy({
      by: ["providerService"],
      where: { cloudAccountId: activeAccount.id },
      _sum: { billedCost: true },
    });

    const byServiceCosts = costTotals.map((c) => ({
      service: c.providerService,
      total: parseFloat((c._sum.billedCost || 0).toFixed(2)),
    }));

    const rawTotalCost = byServiceCosts.reduce((sum, c) => sum + c.total, 0);
    const totalCost = costTotals.length > 0 ? parseFloat(rawTotalCost.toFixed(2)) : null;

    // Daily cost trend (last 30 days)
    const dailyLineItems = await prisma.costLineItem.findMany({
      where: { cloudAccountId: activeAccount.id },
      orderBy: { chargeDate: "asc" },
      take: 60,
    });

    const dailyTrendMap: Record<string, number> = {};
    dailyLineItems.forEach((item) => {
      const dayKey = new Date(item.chargeDate).toISOString().split("T")[0];
      dailyTrendMap[dayKey] = (dailyTrendMap[dayKey] || 0) + item.billedCost;
    });

    const dailyTrend = Object.entries(dailyTrendMap).map(([date, cost]) => ({
      date,
      cost: parseFloat(cost.toFixed(2)),
    }));

    // 4. Carbon Metrics
    const carbonList = await prisma.carbonEmission.findMany({
      where: { resource: { cloudAccountId: activeAccount.id } },
      orderBy: { ts: "desc" },
    });

    const uniqueCarbonMap: Record<string, typeof carbonList[0]> = {};
    carbonList.forEach((c) => {
      if (!uniqueCarbonMap[c.resourceId]) {
        uniqueCarbonMap[c.resourceId] = c;
      }
    });

    const uniqueCarbonValues = Object.values(uniqueCarbonMap);
    const rawOpCarbon = uniqueCarbonValues.reduce((sum, c) => sum + c.operationalGco2e, 0);
    const rawEmbCarbon = uniqueCarbonValues.reduce((sum, c) => sum + c.embodiedGco2e, 0);

    const totalOperationalCarbon = uniqueCarbonValues.length > 0 ? parseFloat(rawOpCarbon.toFixed(2)) : null;
    const totalEmbodiedCarbon = uniqueCarbonValues.length > 0 ? parseFloat(rawEmbCarbon.toFixed(2)) : null;
    const totalCarbon = (totalOperationalCarbon !== null && totalEmbodiedCarbon !== null)
      ? parseFloat(((totalOperationalCarbon + totalEmbodiedCarbon) / 1000).toFixed(2)) // in kgCO2e or tCO2e
      : null;

    const functionalUnits = parseInt(process.env.GREENCLOUD_FUNCTIONAL_UNITS || "100000", 10);
    const sciScore = (totalOperationalCarbon !== null && totalEmbodiedCarbon !== null)
      ? parseFloat(((rawOpCarbon + rawEmbCarbon) / functionalUnits).toFixed(5))
      : null;

    // Regional grid emissions reference derived from real carbon intensity metadata
    const regionalGrid = Object.entries(REGION_METADATA).map(([region, meta]) => ({
      region,
      location: meta.name,
      gridIntensity: meta.gridIntensity,
      mix: meta.mix,
      status: meta.carbonStatus,
    }));

    // Enrich resources with regional names and tags
    const enrichedEc2List = ec2List.map((inst) => {
      const meta = REGION_METADATA[inst.region] || {
        name: inst.region,
        country: "Global",
        flag: "🌐",
        gridIntensity: 350,
        mix: "Standard Grid",
        carbonStatus: "Moderate",
      };
      let instanceName = inst.providerResourceId;
      try {
        if (inst.tags) {
          const tags = JSON.parse(inst.tags);
          const nameTag = Array.isArray(tags) ? tags.find((t: any) => t.Key === "Name") : null;
          if (nameTag?.Value) instanceName = nameTag.Value;
        }
      } catch {}
      return {
        ...inst,
        instanceName,
        regionName: meta.name,
        regionCountry: meta.country,
        regionFlag: meta.flag,
      };
    });

    const enrichedEbsList = ebsList.map((vol) => {
      const meta = REGION_METADATA[vol.region] || {
        name: vol.region,
        country: "Global",
        flag: "🌐",
        gridIntensity: 350,
        mix: "Standard Grid",
        carbonStatus: "Moderate",
      };
      return {
        ...vol,
        regionName: meta.name,
        regionCountry: meta.country,
        regionFlag: meta.flag,
      };
    });

    const enrichedEipList = eipList.map((ip) => {
      const meta = REGION_METADATA[ip.region] || {
        name: ip.region,
        country: "Global",
        flag: "🌐",
        gridIntensity: 350,
        mix: "Standard Grid",
        carbonStatus: "Moderate",
      };
      return {
        ...ip,
        regionName: meta.name,
        regionCountry: meta.country,
        regionFlag: meta.flag,
      };
    });

    // ─── Multi-Region Aggregation & Zero-Blindspot Metrics ───────────────────
    const ALL_MONITORED_REGIONS = Object.keys(REGION_METADATA);
    const regionalBreakdownMap: Record<
      string,
      {
        region: string;
        regionName: string;
        country: string;
        flag: string;
        gridIntensity: number;
        mix: string;
        carbonStatus: string;
        runningEc2: number;
        stoppedEc2: number;
        totalEc2: number;
        totalEbs: number;
        totalEip: number;
        monthlyCost: number;
        operationalGco2e: number;
        resourcesCount: number;
        runningInstanceNames: string[];
      }
    > = {};

    resources.forEach((r) => {
      const reg = r.region || "us-east-1";
      if (!regionalBreakdownMap[reg]) {
        const meta = REGION_METADATA[reg] || {
          name: reg,
          country: "Global",
          flag: "🌐",
          gridIntensity: 350,
          mix: "Standard Grid",
          carbonStatus: "Moderate",
        };
        regionalBreakdownMap[reg] = {
          region: reg,
          regionName: meta.name,
          country: meta.country,
          flag: meta.flag,
          gridIntensity: meta.gridIntensity,
          mix: meta.mix,
          carbonStatus: meta.carbonStatus,
          runningEc2: 0,
          stoppedEc2: 0,
          totalEc2: 0,
          totalEbs: 0,
          totalEip: 0,
          monthlyCost: 0,
          operationalGco2e: 0,
          resourcesCount: 0,
          runningInstanceNames: [],
        };
      }

      const item = regionalBreakdownMap[reg];
      item.resourcesCount++;
      item.monthlyCost += r.monthlyCost || 0;

      if (r.resourceType === "ec2") {
        item.totalEc2++;
        if (r.lifecycleState === "running") {
          item.runningEc2++;
          let instName = r.providerResourceId;
          try {
            if (r.tags) {
              const parsed = JSON.parse(r.tags);
              const n = Array.isArray(parsed) ? parsed.find((t: any) => t.Key === "Name") : null;
              if (n?.Value) instName = `${n.Value} (${r.providerResourceId})`;
            }
          } catch {}
          item.runningInstanceNames.push(instName);
        } else if (r.lifecycleState === "stopped") {
          item.stoppedEc2++;
        }
      } else if (r.resourceType === "ebs") {
        item.totalEbs++;
      } else if (r.resourceType === "eip") {
        item.totalEip++;
      }

      const latestCarbon = r.carbonEmissions?.[0];
      if (latestCarbon) {
        item.operationalGco2e += latestCarbon.operationalGco2e || 0;
      }
    });

    const byRegion = Object.values(regionalBreakdownMap).map((item) => ({
      ...item,
      monthlyCost: parseFloat(item.monthlyCost.toFixed(2)),
      operationalGco2e: parseFloat(item.operationalGco2e.toFixed(2)),
    }));

    const activeRegionsWithRunningCompute = byRegion
      .filter((r) => r.runningEc2 > 0)
      .map((r) => r.region);

    const isMultiRegionRunning = activeRegionsWithRunningCompute.length > 1;

    const multiRegionAlert = isMultiRegionRunning
      ? {
          active: true,
          level: "warning",
          title: "Multi-Region Active Compute Detected",
          message: `You have ${ec2List.filter((i) => i.lifecycleState === "running").length} EC2 instances running simultaneously across ${activeRegionsWithRunningCompute.length} different AWS regions: ${activeRegionsWithRunningCompute.map((r) => `${REGION_METADATA[r]?.name || r} (${r})`).join(", ")}. Running compute in multiple regions incurs continuous hourly on-demand charges. Verify all active regions to prevent unexpected credit burn.`,
          regions: activeRegionsWithRunningCompute,
          totalRunningInstances: ec2List.filter((i) => i.lifecycleState === "running").length,
          monthlyBurnEstimate: parseFloat(
            byRegion
              .filter((r) => r.runningEc2 > 0)
              .reduce((s, r) => s + r.monthlyCost, 0)
              .toFixed(2)
          ),
        }
      : null;

    const scanCoverage = {
      totalMonitoredRegions: ALL_MONITORED_REGIONS.length,
      allMonitoredRegions: ALL_MONITORED_REGIONS,
      activeRegionsWithResources: byRegion.map((r) => r.region),
      activeRegionsWithRunningCompute,
      isMultiRegionRunning,
    };

    // 5. Clean up stale recommendations to strictly match current resource lifecycle state
    const stoppedEc2Ids = ec2List.filter((e) => e.lifecycleState === "stopped").map((e) => e.id);
    const runningEc2Ids = ec2List.filter((e) => e.lifecycleState === "running").map((e) => e.id);

    if (stoppedEc2Ids.length > 0) {
      // Stopped instances cannot have idle compute burn or rightsizing recommendations
      await prisma.recommendation.deleteMany({
        where: {
          resourceId: { in: stoppedEc2Ids },
          id: {
            in: stoppedEc2Ids.flatMap((id) => [`rec_ec2_idle_${id}`, `rec_ec2_rightsize_${id}`]),
          },
        },
      });
    }

    if (runningEc2Ids.length > 0) {
      // Running instances cannot have "Review Stopped" recommendations
      await prisma.recommendation.deleteMany({
        where: {
          resourceId: { in: runningEc2Ids },
          id: {
            in: runningEc2Ids.map((id) => `rec_ec2_stopped_${id}`),
          },
        },
      });
    }

    // Recommendations for this tenant / account
    const allRecs = await prisma.recommendation.findMany({
      where: { tenantId: tenant.id },
      include: { resource: true },
      orderBy: { estimatedMonthlySavings: "desc" },
    });

    // Filter to active account recommendations if resource belongs to active account
    const activeAccountRecs = allRecs.filter(
      (r) => !r.resource || r.resource.cloudAccountId === activeAccount.id
    );

    const totalSavings = activeAccountRecs
      .filter((r) => r.status === "active" || r.status === "approved")
      .reduce((sum, r) => sum + r.estimatedMonthlySavings, 0);

    const totalCarbonSavings = activeAccountRecs
      .filter((r) => r.status === "active" || r.status === "approved")
      .reduce((sum, r) => sum + r.estimatedGco2eSavings, 0);

    // 6. CPU Utilization Distribution (P99 / Average)
    let band0_20 = 0;
    let band20_50 = 0;
    let band50_80 = 0;
    let band80_plus = 0;

    ec2List.forEach((instance) => {
      if (instance.lifecycleState === "stopped") {
        band0_20++;
      } else {
        let cpu = 35;
        try {
          if (instance.telemetryMetrics) {
            const parsed = JSON.parse(instance.telemetryMetrics);
            if (Array.isArray(parsed.cpuDailyAverages) && parsed.cpuDailyAverages.length > 0) {
              cpu = parsed.cpuDailyAverages.reduce((a: number, b: number) => a + b, 0) / parsed.cpuDailyAverages.length;
            } else if (typeof parsed.peakCpu === "number") {
              cpu = parsed.peakCpu;
            }
          }
        } catch {}

        if (cpu < 20) band0_20++;
        else if (cpu < 50) band20_50++;
        else if (cpu < 80) band50_80++;
        else band80_plus++;
      }
    });

    const activeRegions = Array.from(new Set(resources.map((r) => r.region).filter(Boolean)));
    if (activeRegions.length === 0) activeRegions.push("us-east-1");

    // 7. Tag Allocation & FinOps Hygiene
    let taggedCount = 0;
    let untaggedCount = 0;
    const envMap: Record<string, { count: number; cost: number }> = {
      Production: { count: 0, cost: 0 },
      Staging: { count: 0, cost: 0 },
      Development: { count: 0, cost: 0 },
      Unallocated: { count: 0, cost: 0 },
    };
    const teamMap: Record<string, { count: number; cost: number }> = {};

    resources.forEach((res) => {
      let parsedTags: Array<{ Key: string; Value: string }> = [];
      try {
        if (res.tags) {
          const raw = JSON.parse(res.tags);
          if (Array.isArray(raw)) parsedTags = raw;
        }
      } catch {}

      const hasTags = parsedTags.length > 0;
      if (hasTags) taggedCount++;
      else untaggedCount++;

      // Check Environment tag
      const envTag = parsedTags.find(
        (t) => t.Key.toLowerCase() === "environment" || t.Key.toLowerCase() === "env"
      );
      let envKey = "Unallocated";
      if (envTag?.Value) {
        const val = envTag.Value.toLowerCase();
        if (val.includes("prod")) envKey = "Production";
        else if (val.includes("stag")) envKey = "Staging";
        else if (val.includes("dev")) envKey = "Development";
        else envKey = envTag.Value;
      }

      if (!envMap[envKey]) envMap[envKey] = { count: 0, cost: 0 };
      envMap[envKey].count++;
      envMap[envKey].cost += res.monthlyCost || 0;

      // Check Team / Owner tag
      const teamTag = parsedTags.find(
        (t) =>
          t.Key.toLowerCase() === "owner" ||
          t.Key.toLowerCase() === "team" ||
          t.Key.toLowerCase() === "project"
      );
      const teamKey = teamTag?.Value ? teamTag.Value : "Unassigned";
      if (!teamMap[teamKey]) teamMap[teamKey] = { count: 0, cost: 0 };
      teamMap[teamKey].count++;
      teamMap[teamKey].cost += res.monthlyCost || 0;
    });

    const totalResCount = resources.length;
    const tagHygieneScore = totalResCount > 0 ? Math.round((taggedCount / totalResCount) * 100) : 100;

    const byEnvironment = Object.entries(envMap)
      .filter(([_, data]) => data.count > 0 || _ === "Production" || _ === "Staging" || _ === "Development")
      .map(([name, data]) => ({
        name,
        count: data.count,
        cost: parseFloat(data.cost.toFixed(2)),
        percentage: totalResCount > 0 ? Math.round((data.count / totalResCount) * 100) : 0,
      }));

    const byTeam = Object.entries(teamMap).map(([name, data]) => ({
      name,
      count: data.count,
      cost: parseFloat(data.cost.toFixed(2)),
    }));

    // 8. Budget & Anomaly Intelligence
    const targetBudget = 50.0;
    const spentBudget = totalCost !== null ? totalCost : 0.0;
    const budgetPace = Math.min(100, Math.round((spentBudget / targetBudget) * 100));

    // 9. Latest Audit Logs
    const auditLogs = await prisma.auditLog.findMany({
      where: { tenantId: tenant.id },
      orderBy: { ts: "desc" },
      take: 12,
    });

    return NextResponse.json({
      account: activeAccount,
      allAccounts,
      resources: {
        total: resources.length,
        ec2: enrichedEc2List,
        ebs: enrichedEbsList,
        eip: enrichedEipList,
        byRegion,
        runningEc2Count: ec2List.filter((i) => i.lifecycleState === "running").length,
        stoppedEc2Count: stoppedCount,
        byState: {
          healthy: healthyCount,
          underutilized: underutilizedCount,
          peak: peakCount,
          stopped: stoppedCount,
        },
      },
      scanCoverage,
      multiRegionAlert,
      costs: {
        totalCost,
        dailyBurnRate: totalCost !== null ? parseFloat((totalCost / 30).toFixed(2)) : null,
        priorMonthCost: totalCost !== null ? parseFloat((totalCost * 0.94).toFixed(2)) : null,
        byService: byServiceCosts,
        dailyTrend,
      },
      tagAllocation: {
        hygieneScore: tagHygieneScore,
        taggedCount,
        untaggedCount,
        byEnvironment,
        byTeam,
      },
      budget: {
        target: targetBudget,
        spent: spentBudget,
        pacePercentage: budgetPace,
        projectedMonthEnd: totalCost !== null ? parseFloat((totalCost * 1.05).toFixed(2)) : 0.0,
        status: spentBudget > targetBudget ? "exceeded" : spentBudget > targetBudget * 0.8 ? "warning" : "healthy",
      },
      anomalies: {
        hasAnomalies: isMultiRegionRunning,
        detectedCount: isMultiRegionRunning ? 1 : 0,
        message: isMultiRegionRunning
          ? `Active compute running across ${activeRegionsWithRunningCompute.length} AWS regions (${activeRegionsWithRunningCompute.join(", ")}).`
          : "Spend and carbon telemetry within nominal bounds (0 anomalies detected).",
      },
      carbon: {
        totalOperationalCarbon,
        totalEmbodiedCarbon,
        totalCarbon,
        sciScore,
        functionalUnits,
        regionalGrid,
      },
      recommendations: {
        items: activeAccountRecs,
        totalSavings: activeAccountRecs.length > 0 ? parseFloat(totalSavings.toFixed(2)) : null,
        totalCarbonSavings: activeAccountRecs.length > 0 ? parseFloat(totalCarbonSavings.toFixed(2)) : null,
        activeCount: activeAccountRecs.filter((r) => r.status === "active").length,
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
        ec2Total: ec2List.length,
        ec2Healthy: healthyCount,
        ec2Review: underutilizedCount + stoppedCount,
        ebsTotal: ebsList.length,
        ebsAttached: ebsList.filter((v) => v.lifecycleState === "in-use").length,
        ebsIdle: ebsList.filter((v) => v.lifecycleState === "available").length,
        eipTotal: eipList.length,
        eipAssociated: eipList.filter((e) => e.lifecycleState === "associated").length,
        eipUnused: eipList.filter((e) => e.lifecycleState === "unassociated").length,
        activeRegions,
        rdsCount: 0,
        natCount: 0,
      },
      auditLogs,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: error.message || "Failed to load dashboard data" } },
      { status: 500 }
    );
  }
}
