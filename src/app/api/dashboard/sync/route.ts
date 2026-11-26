import { NextResponse } from "next/server";
import { TenantIsolatedDb } from "@/services/db";
import { IngestionService } from "@/services/ingestion";
import { RecommendationEngine } from "@/services/recommendationEngine";
import { seedDefaultTenant } from "@/services/seed";

export async function POST(request: Request) {
  try {
    const callerRole = request.headers.get("x-greencloud-role");
    if (callerRole === "viewer") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Read-Only Viewer cannot trigger live cloud syncs." } },
        { status: 403 }
      );
    }

    const tenant = await seedDefaultTenant();
    const db = new TenantIsolatedDb(tenant.id);
    const body = await request.json().catch(() => ({}));
    const requestedIds: string[] = Array.isArray(body.accountIds) ? body.accountIds : [];

    const allAccounts = await db.listAccounts();
    const targetAccounts =
      requestedIds.length > 0
        ? allAccounts.filter((a) => requestedIds.includes(a.id))
        : allAccounts;

    if (targetAccounts.length === 0) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "No matching cloud accounts to sync." } },
        { status: 404 }
      );
    }

    const results: Array<{ accountId: string; name: string; success: boolean; errors: string[] }> = [];
    for (const acc of targetAccounts) {
      try {
        const ingest = new IngestionService(tenant.id, acc.id);
        const res = await ingest.runSync();
        results.push({
          accountId: acc.id,
          name: acc.name,
          success: res.success,
          errors: res.errors,
        });
      } catch (err: any) {
        results.push({
          accountId: acc.id,
          name: acc.name,
          success: false,
          errors: [err.message || "Sync error"],
        });
      }
    }

    const recEngine = new RecommendationEngine(tenant.id);
    const recommendationCount = await recEngine.generateRecommendations();

    return NextResponse.json({
      syncedAccounts: results.length,
      results,
      recommendationCount,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: error.message || "Batch sync failed" } },
      { status: 500 }
    );
  }
}
