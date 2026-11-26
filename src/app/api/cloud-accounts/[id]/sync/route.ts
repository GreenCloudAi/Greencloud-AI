import { NextResponse } from "next/server";
import { prisma, TenantIsolatedDb } from "@/services/db";
import { IngestionService, type SyncSources } from "@/services/ingestion";
import { RecommendationEngine } from "@/services/recommendationEngine";
import { seedDefaultTenant } from "@/services/seed";
import { localDemoEnabled, resolveWorkspaceAccess, workspaceAccessResponse } from "@/services/workspaceAccess";

const sourceNames = ["inventory", "telemetry", "billing"] as const;

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const access = localDemoEnabled() ? null : await resolveWorkspaceAccess(request);
    const tenant = access?.tenant ?? await seedDefaultTenant();
    const db = new TenantIsolatedDb(tenant.id);
    const accountId = params.id;

    const account = await prisma.cloudAccount.findFirst({
      where: { id: accountId, tenantId: tenant.id },
      select: { provider: true, roleArn: true },
    });
    if (!account) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Cloud account not found or unauthorized" } },
        { status: 404 }
      );
    }

    if (access) {
      const origin = request.headers.get("origin");
      const host = request.headers.get("host");
      if (origin && origin !== `https://${host}` && origin !== `http://${host}`) {
        return NextResponse.json({ error: { message: "Sync must be started from this workspace." } }, { status: 403 });
      }
      if (!["account:read", "dashboard:read", "sync:trigger"].every(
        (permission) => access.permits(permission, accountId, account.provider)
      )) {
        return NextResponse.json({ error: { message: "Cloud account not found or unauthorized." } }, { status: 404 });
      }
      if (account.provider !== "aws" || !account.roleArn) {
        return NextResponse.json({ error: { message: "Live sync requires a configured AWS account." } }, { status: 422 });
      }

      const job = await prisma.$transaction(async (tx) => {
        const claimed = await tx.cloudAccount.updateMany({
          where: { id: accountId, tenantId: tenant.id, syncJobs: { none: { status: "running" } } },
          data: { status: "syncing" },
        });
        if (!claimed.count) return null;
        const previous = await tx.syncJob.findFirst({
          where: { tenantId: tenant.id, cloudAccountId: accountId, finishedAt: { not: null } },
          orderBy: [{ startedAt: "desc" }, { id: "desc" }],
        });
        const created = await tx.syncJob.create({
          data: { tenantId: tenant.id, cloudAccountId: accountId, provider: account.provider,
            triggerType: "manual", status: "running", subSourceStatuses: previous?.subSourceStatuses ?? "{}" },
        });
        await tx.auditLog.create({
          data: { tenantId: tenant.id, actor: access.actorId, action: "sync_triggered",
            objectType: "cloud_account", objectId: accountId, metadata: JSON.stringify({ jobId: created.id }) },
        });
        return created;
      });
      if (!job) return NextResponse.json({ error: { message: "A sync is already running for this account." } }, { status: 409 });

      let sources: SyncSources;
      try {
        const outcome = await new IngestionService(tenant.id, accountId).runSync();
        if (!outcome.sources) throw new Error("AWS source outcomes are missing.");
        sources = outcome.sources;
      } catch (error) {
        console.error("AWS account sync failed", error);
        sources = {
          inventory: { status: "not_run", records: 0 },
          telemetry: { status: "not_run", records: 0 },
          billing: { status: "not_run", records: 0 },
        };
      }
      const finishedAt = new Date();
      const prior = JSON.parse(job.subSourceStatuses);
      const results = Object.fromEntries(sourceNames.map((name) => {
        const result = sources[name];
        const complete = result.status === "available" || result.status === "no_rows";
        return [name, { ...result, lastSuccess: complete ? finishedAt.toISOString() : prior[name]?.lastSuccess ?? null }];
      }));
      const outcomes = Object.values(sources);
      const status = outcomes.every(({ status }) => status === "available" || status === "no_rows") ? "completed"
        : outcomes.some(({ status }) => status === "available" || status === "no_rows" || status === "partial") ? "partial" : "failed";
      await prisma.$transaction([
        prisma.syncJob.update({
          where: { id: job.id },
          data: { status, finishedAt, subSourceStatuses: JSON.stringify(results),
            recordsIngested: outcomes.reduce((sum, source) => sum + source.records, 0),
            errorSummary: status === "failed" ? "AWS sources could not be refreshed." : null },
        }),
        prisma.cloudAccount.update({
          where: { id: accountId },
          data: { status: status === "failed" ? "sync_failed" : "active", syncError: status === "completed" ? null
            : status === "partial" ? "Some AWS sources could not be refreshed." : "AWS sync failed." },
        }),
      ]);
      return NextResponse.json({ accountId, jobId: job.id, status, sources: results });
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
    const denied = workspaceAccessResponse(error);
    if (denied) return denied;
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Sync could not be completed." } },
      { status: 500 }
    );
  }
}
