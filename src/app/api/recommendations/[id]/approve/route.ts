import { NextResponse } from "next/server";
import { TenantIsolatedDb, prisma } from "@/services/db";
import { TicketService } from "@/services/ticketService";
import { seedDefaultTenant } from "@/services/seed";

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

    if (!mode || (mode !== "ticket" && mode !== "pull_request")) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Missing or invalid approval mode ('ticket' | 'pull_request')" } },
        { status: 400 }
      );
    }

    // 1. Get recommendation details
    const rec = await db.getRecommendation(recommendationId);
    if (!rec) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Recommendation not found or unauthorized" } },
        { status: 404 }
      );
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
