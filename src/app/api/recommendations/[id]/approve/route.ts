import { NextResponse } from "next/server";
import { prisma } from "@/services/db";
import { TicketService } from "@/services/ticketService";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const recommendationId = params.id;
    const body = await request.json();
    const { approver = "devops-lead@company.com", decision = "approved", comment } = body;

    const recommendation = await prisma.recommendation.findUnique({
      where: { id: recommendationId },
      include: { resource: true }
    });

    if (!recommendation) {
      return NextResponse.json(
        { success: false, error: "Recommendation not found" },
        { status: 404 }
      );
    }

    // Record human approval decision
    const approval = await prisma.approval.create({
      data: {
        recommendationId,
        approver,
        decision,
        comment: comment || null
      }
    });

    // Update recommendation status
    const newStatus = decision === "approved" ? "approved" : "dismissed";
    await prisma.recommendation.update({
      where: { id: recommendationId },
      data: { status: newStatus }
    });

    let ticketResult = null;
    if (decision === "approved") {
      let evidenceObj: any = {};
      try {
        evidenceObj = JSON.parse(recommendation.evidence);
      } catch (e) {}

      ticketResult = await TicketService.createTicket({
        recommendationId,
        title: recommendation.title,
        category: recommendation.category,
        savingsMonthly: recommendation.estimatedMonthlySavings,
        gco2eSavings: recommendation.estimatedGco2eSavings,
        evidenceSummary: evidenceObj.metricsSummary || recommendation.title,
        suggestedAction: evidenceObj.suggestedAction || "Execute approved FinOps action"
      });
    }

    // Write audit log entry
    await prisma.auditLog.create({
      data: {
        tenantId: recommendation.tenantId,
        actor: approver,
        action: `recommendation_${decision}`,
        objectType: "Recommendation",
        objectId: recommendationId,
        metadata: JSON.stringify({
          approvalId: approval.id,
          decision,
          comment,
          ticketResult
        })
      }
    });

    return NextResponse.json({
      success: true,
      approval,
      ticket: ticketResult,
      status: newStatus
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process approval" },
      { status: 500 }
    );
  }
}
