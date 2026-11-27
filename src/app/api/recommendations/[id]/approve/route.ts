import { NextResponse } from "next/server";
import { TenantIsolatedDb, prisma } from "@/services/db";
import { TicketService } from "@/services/ticketService";
import { seedDefaultTenant } from "@/services/seed";
import { AgentDeploymentService } from "@/services/agentDeploymentService";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await seedDefaultTenant();
    const db = new TenantIsolatedDb(tenant.id);
    const recommendationId = params.id;
    const body = await request.json();

    const { mode, comment, approver = "user_reviewer" } = body;

    if (!mode || (mode !== "ticket" && mode !== "pull_request" && mode !== "agent_execute" && mode !== "direct_agent")) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Missing or invalid approval mode ('ticket' | 'pull_request' | 'agent_execute')" } },
        { status: 400 }
      );
    }

    if (mode === "agent_execute" || mode === "direct_agent") {
      const result = await AgentDeploymentService.executeFastOptimization(
        tenant.id,
        recommendationId,
        approver
      );
      return NextResponse.json({
        recommendationId,
        status: "executed",
        mode: "agent_execute",
        result,
      });
    }

    // 1. Get recommendation details
    const rec = await db.getRecommendation(recommendationId);
    if (!rec) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Recommendation not found or unauthorized" } },
        { status: 404 }
      );
    }

    // Cross-cloud migrations are human-guided only (never auto-executed)
    if (rec.category === "cross_cloud_migration") {
      await db.approveRecommendation(
        recommendationId,
        approver,
        comment || "Cross-cloud migration plan approved for human execution"
      );

      let outputPath = "";
      try {
        outputPath = await TicketService.createJiraTicket({
          recommendationId: rec.id,
          title: rec.title,
          category: rec.category,
          estimatedMonthlySavings: rec.estimatedMonthlySavings,
          estimatedGco2eSavings: rec.estimatedGco2eSavings,
          riskScore: rec.riskScore,
          evidence: JSON.parse(rec.evidence),
          resourceId: rec.resource.providerResourceId,
        });
      } catch {
        // Ticket creation is optional
      }

      await db.logAction(
        approver,
        "cross_cloud_migration_approved",
        "recommendation",
        recommendationId,
        { mode, outputPath }
      );

      return NextResponse.json({
        recommendationId,
        status: "approved",
        mode,
        outputPath: outputPath ? outputPath.replace(/\\/g, "/") : "",
      });
    }

    // 2. Approve in Database (transaction isolates and audits)
    await db.approveRecommendation(recommendationId, approver, comment || "Approved via dashboard workflow");

    // 3. Trigger Ticket or PR Generation
    const ticketPayload = {
      recommendationId: rec.id,
      title: rec.title,
      category: rec.category,
      estimatedMonthlySavings: rec.estimatedMonthlySavings,
      estimatedGco2eSavings: rec.estimatedGco2eSavings,
      riskScore: rec.riskScore,
      evidence: JSON.parse(rec.evidence),
      resourceId: rec.resource.providerResourceId
    };

    let outputPath = "";
    if (mode === "ticket") {
      outputPath = await TicketService.createJiraTicket(ticketPayload);
    } else {
      outputPath = await TicketService.createPullRequest(ticketPayload);
    }

    // Mark as executed since the IaC PR / ticket is created
    await prisma.recommendation.update({
      where: { id: recommendationId },
      data: { status: "executed" }
    });

    await db.logAction(
      approver,
      "recommendation_executed",
      "recommendation",
      recommendationId,
      { mode, outputPath }
    );

    return NextResponse.json({
      recommendationId,
      status: "executed",
      mode,
      outputPath: outputPath.replace(/\\/g, "/") // Normalized for web
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: error.message || "Failed to approve recommendation" } },
      { status: 500 }
    );
  }
}
