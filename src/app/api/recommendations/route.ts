import { NextResponse } from "next/server";
import { TenantIsolatedDb, prisma } from "@/services/db";
import { seedDefaultTenant } from "@/services/seed";

export async function GET(request: Request) {
  try {
    const tenant = await seedDefaultTenant();
    const db = new TenantIsolatedDb(tenant.id);
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || undefined;

    const recommendations = await db.listRecommendations(category);

    // Calculate aggregated metrics for dashboard summaries
    const totalPotentialSavings = recommendations
      .filter(r => r.status === "active" || r.status === "approved")
      .reduce((sum, r) => sum + r.estimatedMonthlySavings, 0);

    const totalPotentialCarbonSavings = recommendations
      .filter(r => r.status === "active" || r.status === "approved")
      .reduce((sum, r) => sum + r.estimatedGco2eSavings, 0);

    // Fetch total costs for last 30 days reconciled (EC2, EBS, VPC)
    const costTotals = await prisma.costLineItem.groupBy({
      by: ["providerService"],
      where: { cloudAccount: { tenantId: tenant.id } },
      _sum: { billedCost: true }
    });

    const formattedCosts = costTotals.map(c => ({
      service: c.providerService,
      total: parseFloat((c._sum.billedCost || 0).toFixed(2))
    }));

    const totalCost = formattedCosts.reduce((sum, c) => sum + c.total, 0);

    // Fetch total carbon emissions
    const carbonTotals = await prisma.carbonEmission.findMany({
      where: { resource: { cloudAccount: { tenantId: tenant.id } } },
      orderBy: { ts: "desc" }
    });

    // Deduplicate latest carbon entries per resource
    const uniqueResourceCarbonMap: Record<string, typeof carbonTotals[0]> = {};
    carbonTotals.forEach(c => {
      if (!uniqueResourceCarbonMap[c.resourceId]) {
        uniqueResourceCarbonMap[c.resourceId] = c;
      }
    });

    const uniqueCarbonList = Object.values(uniqueResourceCarbonMap);
    const totalOperationalCarbon = uniqueCarbonList.reduce((sum, c) => sum + c.operationalGco2e, 0);
    const totalEmbodiedCarbon = uniqueCarbonList.reduce((sum, c) => sum + c.embodiedGco2e, 0);

    // SCI calculation for entire tenant (mocking 100k requests functional units)
    const mockFunctionalUnits = 120000;
    const sciScore = (totalOperationalCarbon + totalEmbodiedCarbon) / mockFunctionalUnits;

    return NextResponse.json({
      recommendations,
      summary: {
        totalMonthlySavings: parseFloat(totalPotentialSavings.toFixed(2)),
        totalMonthlyCarbonSavings: parseFloat(totalPotentialCarbonSavings.toFixed(2)),
        totalCost: parseFloat(totalCost.toFixed(2)),
        byServiceCosts: formattedCosts,
        totalOperationalCarbon: parseFloat(totalOperationalCarbon.toFixed(2)),
        totalEmbodiedCarbon: parseFloat(totalEmbodiedCarbon.toFixed(2)),
        sciScore: parseFloat(sciScore.toFixed(5)),
        functionalUnits: mockFunctionalUnits
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: error.message || "Failed to fetch recommendations" } },
      { status: 500 }
    );
  }
}
