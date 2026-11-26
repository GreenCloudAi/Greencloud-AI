import { NextResponse } from "next/server";
import { prisma, TenantIsolatedDb } from "@/services/db";
import { seedDefaultTenant } from "@/services/seed";
import { CarbonEngine } from "@/services/carbonEngine";
import { RecommendationEngine } from "@/services/recommendationEngine";
import {
  normalizeFocusServiceCategory,
  normalizeProviderId,
} from "@/services/cloudMetadata";

interface FocusImportRecord {
  ProviderName?: string;
  SubAccountId?: string;
  SubAccountName?: string;
  RegionId?: string;
  ServiceName?: string;
  ServiceCategory?: string;
  ChargeCategory?: string;
  ChargePeriodStart?: string;
  BilledCost?: number | string;
  EffectiveCost?: number | string;
  BillingCurrency?: string;
  ResourceId?: string;
  ResourceType?: string;
  InstanceType?: string;
  LifecycleState?: string;
  SizeGb?: number | string;
  CpuPercent?: number | string;
  Tags?: Record<string, string> | Array<{ Key: string; Value: string }>;
}

function parseCsvLines(csvText: string): FocusImportRecord[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = cols[i] ?? "";
    });
    return obj as unknown as FocusImportRecord;
  });
}

export async function POST(request: Request) {
  try {
    const callerRole = request.headers.get("x-greencloud-role");
    if (callerRole === "viewer") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Read-Only Viewer cannot import cloud accounts or billing records." } },
        { status: 403 }
      );
    }

    const tenant = await seedDefaultTenant();
    const db = new TenantIsolatedDb(tenant.id);
    const body = await request.json();

    let records: FocusImportRecord[] = [];
    if (Array.isArray(body.records)) {
      records = body.records;
    } else if (typeof body.csv === "string" && body.csv.trim()) {
      records = parseCsvLines(body.csv);
    }

    if (records.length === 0) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Provide non-empty CNCF FOCUS JSON records array or CSV text." } },
        { status: 400 }
      );
    }

    const defaultProvider = normalizeProviderId(body.provider);
    const defaultRegion = String(body.primaryRegion || "us-central1");
    const defaultExternalId = String(body.externalAccountId || "").trim();
    const defaultAccountName = String(body.accountName || "").trim();

    // Group rows by normalized (provider, subAccountId)
    const groupedAccounts = new Map<string, FocusImportRecord[]>();
    for (const row of records) {
      const prov = normalizeProviderId(row.ProviderName || defaultProvider);
      const extId = String(row.SubAccountId || defaultExternalId || `${prov}-org-001`).trim();
      const key = `${prov}::${extId}`;
      if (!groupedAccounts.has(key)) groupedAccounts.set(key, []);
      groupedAccounts.get(key)!.push(row);
    }

    let accountsTouched = 0;
    let lineItemsImported = 0;
    let resourcesImported = 0;
    const syncTime = new Date();

    for (const [key, rows] of Array.from(groupedAccounts.entries())) {
      const [prov, extId] = key.split("::");
      const acctName =
        rows[0].SubAccountName || defaultAccountName || `${prov.toUpperCase()} (${extId})`;

      const account = await db.createAccount({
        provider: prov,
        externalAccountId: extId,
        name: acctName,
        primaryRegion: rows[0].RegionId || defaultRegion,
        providerConfig: JSON.stringify({ ingestMode: "focus_import" }),
      });
      accountsTouched++;

      for (const row of rows) {
        const region = String(row.RegionId || account.primaryRegion || "us-east-1").trim();
        const service = String(row.ServiceName || "Compute Engine").trim();
        const serviceCat =
          row.ServiceCategory || normalizeFocusServiceCategory(service);
        const chargeCat = String(row.ChargeCategory || "Usage").trim();
        const billed = Number(row.BilledCost || 0);
        const effective =
          row.EffectiveCost !== undefined && row.EffectiveCost !== ""
            ? Number(row.EffectiveCost)
            : billed;
        const chargeDate = row.ChargePeriodStart
          ? new Date(row.ChargePeriodStart)
          : new Date();

        let resourceId: string | null = null;
        if (row.ResourceId) {
          const providerResId = String(row.ResourceId).trim();
          const resType =
            row.ResourceType ||
            (prov === "gcp"
              ? serviceCat === "Storage"
                ? "disk"
                : "gce_vm"
              : prov === "azure"
              ? serviceCat === "Storage"
                ? "disk"
                : "azure_vm"
              : serviceCat === "Storage"
              ? "ebs"
              : "ec2");

          const tagsArray = Array.isArray(row.Tags)
            ? row.Tags
            : row.Tags && typeof row.Tags === "object"
            ? Object.entries(row.Tags).map(([Key, Value]) => ({ Key, Value: String(Value) }))
            : [];

          const cpuPct =
            row.CpuPercent !== undefined && row.CpuPercent !== ""
              ? Number(row.CpuPercent)
              : null;

          const sizeGb =
            row.SizeGb !== undefined && row.SizeGb !== "" ? Number(row.SizeGb) : null;

          const resource = await prisma.cloudResource.upsert({
            where: { id: `${account.id}_${providerResId}` },
            create: {
              id: `${account.id}_${providerResId}`,
              cloudAccountId: account.id,
              provider: prov,
              providerResourceId: providerResId,
              resourceType: resType,
              serviceCategory: serviceCat,
              region,
              lifecycleState: String(row.LifecycleState || "running"),
              tags: JSON.stringify(tagsArray),
              instanceType: row.InstanceType ? String(row.InstanceType) : undefined,
              sizeGb: sizeGb ?? undefined,
              monthlyCost: billed > 0 ? billed : undefined,
              telemetryMetrics:
                cpuPct !== null
                  ? JSON.stringify({
                      cpuDailyAverages: [cpuPct],
                      peakCpu: cpuPct,
                      lookbackDays: 1,
                      collectedAt: syncTime.toISOString(),
                    })
                  : undefined,
              firstSeenAt: chargeDate,
              lastSeenAt: syncTime,
            },
            update: {
              provider: prov,
              serviceCategory: serviceCat,
              region,
              lifecycleState: String(row.LifecycleState || "running"),
              tags: JSON.stringify(tagsArray),
              instanceType: row.InstanceType ? String(row.InstanceType) : undefined,
              sizeGb: sizeGb ?? undefined,
              monthlyCost: billed > 0 ? billed : undefined,
              ...(cpuPct !== null
                ? {
                    telemetryMetrics: JSON.stringify({
                      cpuDailyAverages: [cpuPct],
                      peakCpu: cpuPct,
                      lookbackDays: 1,
                      collectedAt: syncTime.toISOString(),
                    }),
                  }
                : {}),
              lastSeenAt: syncTime,
            },
          });

          resourceId = resource.id;
          resourcesImported++;

          const carbonResult =
            serviceCat === "Storage"
              ? CarbonEngine.calculateEBSCarbon(sizeGb || 50, region)
              : CarbonEngine.calculateEC2Carbon(
                  row.InstanceType || "standard-2",
                  region,
                  cpuPct ?? 25
                );
          await prisma.carbonEmission.create({
            data: {
              resourceId: resource.id,
              ts: syncTime,
              energyKwh: carbonResult.energyKwh,
              operationalGco2e: carbonResult.operationalGco2e,
              embodiedGco2e: carbonResult.embodiedGco2e,
              method: carbonResult.method,
            },
          });
        }

        await prisma.costLineItem.create({
          data: {
            cloudAccountId: account.id,
            resourceId,
            provider: prov,
            region,
            chargeDate: Number.isNaN(chargeDate.getTime()) ? new Date() : chargeDate,
            providerService: service,
            serviceCategory: serviceCat,
            chargeCategory: chargeCat,
            billedCost: Number.isFinite(billed) ? billed : 0,
            effectiveCost: Number.isFinite(effective) ? effective : billed,
            currency: String(row.BillingCurrency || "USD"),
          },
        });
        lineItemsImported++;
      }

      await db.updateAccountStatus(account.id, "active");
    }

    const recEngine = new RecommendationEngine(tenant.id);
    const recommendationCount = await recEngine.generateRecommendations();

    await db.logAction("user", "focus_import_completed", "tenant", tenant.id, {
      accountsTouched,
      lineItemsImported,
      resourcesImported,
      recommendationCount,
    });

    return NextResponse.json({
      success: true,
      accountsTouched,
      lineItemsImported,
      resourcesImported,
      recommendationCount,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: error.message || "FOCUS import failed" } },
      { status: 500 }
    );
  }
}
