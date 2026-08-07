import { NextResponse } from "next/server";
import { TenantIsolatedDb } from "@/services/db";
import { IngestionService } from "@/services/ingestion";
import { RecommendationEngine } from "@/services/recommendationEngine";
import { seedDefaultTenant } from "@/services/seed";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await seedDefaultTenant();
    const db = new TenantIsolatedDb(tenant.id);
    const accountId = params.id;

    const account = await db.getAccount(accountId);
    if (!account) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Cloud account not found or unauthorized" } },
        { status: 404 }
      );
    }

    // Trigger sync
    console.log(`Triggering ingestion sync for cloud account: ${accountId}`);
    const ingest = new IngestionService(tenant.id, accountId);
    const syncResult = await ingest.runSync();

    // Trigger recommendation sweep
    console.log(`Triggering recommendation sweep for tenant: ${tenant.id}`);
    const recs = new RecommendationEngine(tenant.id);
    const recCount = await recs.generateRecommendations();

    await db.logAction(
      "user",
      "sync_triggered",
      "cloud_account",
      accountId,
      { success: syncResult.success, errors: syncResult.errors, recommendationCount: recCount }
    );

    return NextResponse.json({
      accountId,
      success: syncResult.success,
      errors: syncResult.errors,
      recommendationCount: recCount
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: error.message || "Sync failed" } },
      { status: 500 }
    );
  }
}
