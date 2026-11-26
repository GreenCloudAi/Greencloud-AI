import { NextResponse } from "next/server";
import { AgentDeploymentService } from "@/services/agentDeploymentService";
import { seedDefaultTenant } from "@/services/seed";
import { Logger } from "@/services/logger";

export async function GET(request: Request) {
  try {
    const tenant = await seedDefaultTenant();
    const manifest = AgentDeploymentService.generateCloudAgentManifest();

    return NextResponse.json({
      tenantId: tenant.id,
      manifest,
    });
  } catch (error: any) {
    Logger.error("API", "AGENT_GET_MANIFEST_FAILED", error.message);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: error.message || "Failed to load agent deployment manifest" } },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await seedDefaultTenant();
    const body = await request.json().catch(() => ({}));
    const { action = "fast_optimize_all", recommendationId, approver = "autonomous_agent_user" } = body;

    if (action === "fast_optimize_single" || action === "fast_optimize_resource") {
      if (!recommendationId) {
        return NextResponse.json(
          { error: { code: "BAD_REQUEST", message: "recommendationId is required for single resource optimization" } },
          { status: 400 }
        );
      }

      const result = await AgentDeploymentService.executeFastOptimization(
        tenant.id,
        recommendationId,
        approver
      );

      return NextResponse.json({
        action: "fast_optimize_single",
        result,
      });
    }

    if (action === "fast_optimize_all") {
      const result = await AgentDeploymentService.executeBatchFleetOptimization(
        tenant.id,
        approver
      );

      return NextResponse.json({
        action: "fast_optimize_all",
        result,
      });
    }

    if (action === "get_manifest") {
      const manifest = AgentDeploymentService.generateCloudAgentManifest();
      return NextResponse.json({
        action: "get_manifest",
        manifest,
      });
    }

    return NextResponse.json(
      { error: { code: "INVALID_ACTION", message: `Unknown agent deployment action: ${action}` } },
      { status: 400 }
    );
  } catch (error: any) {
    Logger.error("API", "AGENT_DEPLOY_ACTION_FAILED", error.message);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: error.message || "Agent execution failed" } },
      { status: 500 }
    );
  }
}
