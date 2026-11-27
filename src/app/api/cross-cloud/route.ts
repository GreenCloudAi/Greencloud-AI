import { NextResponse } from "next/server";
import { seedDefaultTenant } from "@/services/seed";
import { TenantIsolatedDb } from "@/services/db";
import { runCrossCloudAdvisor, type CrossCloudConfig } from "@/services/crossCloudAdvisor";
import { syncRegions } from "@/services/pricing/pricingSync";
import { candidateRegions, type Provider, type RegionMode } from "@/services/pricing/regionMap";
import { prisma } from "@/services/db";

export async function GET(request: Request) {
  try {
    const tenant = await seedDefaultTenant();
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId") || "all";

    const overrides: Partial<CrossCloudConfig> = {};
    const regionMode = searchParams.get("regionMode");
    if (regionMode === "paired" || regionMode === "same_country" || regionMode === "same_continent") {
      overrides.regionMode = regionMode as RegionMode;
    }

    const numParam = (k: string) => {
      const v = searchParams.get(k);
      if (v === null || v === "") return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    };

    const targetPeak = numParam("targetPeak");
    if (targetPeak !== undefined) overrides.targetPeakUtilizationPct = targetPeak;

    const allowArm = searchParams.get("allowArm");
    if (allowArm === "true" || allowArm === "false") {
      overrides.allowArchChange = allowArm === "true";
    }

    const laborHours = numParam("laborHours");
    if (laborHours !== undefined) overrides.laborHoursPerVm = laborHours;

    const laborRate = numParam("laborRate");
    if (laborRate !== undefined) overrides.laborRatePerHour = laborRate;

    const minUsd = numParam("minUsd");
    if (minUsd !== undefined) overrides.shiftMinMonthlyUsd = minUsd;

    const minPct = numParam("minPct");
    if (minPct !== undefined) overrides.shiftMinPct = minPct;

    const maxPayback = numParam("maxPayback");
    if (maxPayback !== undefined) overrides.shiftMaxPaybackMonths = maxPayback;

    const report = await runCrossCloudAdvisor(tenant.id, accountId, overrides);
    return NextResponse.json(report);
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: error.message || "Failed to generate Cross-Cloud Advisor report" } },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await seedDefaultTenant();
    const db = new TenantIsolatedDb(tenant.id);
    const body = await request.json();

    if (body?.action !== "refresh_prices") {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Unsupported action" } },
        { status: 400 }
      );
    }

    const accounts = await db.listAccounts();
    const resources = await prisma.cloudResource.findMany({
      where: {
        cloudAccountId: { in: accounts.map((a) => a.id) },
        resourceType: { in: ["ec2", "azure_vm"] },
      },
      select: { resourceType: true, region: true },
    });

    const targets: Array<{ provider: Provider; region: string }> = [
      { provider: "aws", region: "us-east-1" },
      { provider: "azure", region: "eastus" },
      { provider: "aws", region: "ap-south-1" },
      { provider: "azure", region: "centralindia" },
    ];

    for (const r of resources) {
      const prov: Provider = r.resourceType === "azure_vm" ? "azure" : "aws";
      const reg = r.region.toLowerCase();
      targets.push({ provider: prov, region: reg });
      const other: Provider = prov === "aws" ? "azure" : "aws";
      for (const cr of candidateRegions(prov, reg, "paired")) {
        targets.push({ provider: other, region: cr });
      }
    }

    const result = await syncRegions(targets, { force: true });
    return NextResponse.json({ ok: true, ...result });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: error.message || "Failed to refresh prices" } },
      { status: 500 }
    );
  }
}
