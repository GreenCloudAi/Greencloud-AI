import { NextResponse } from "next/server";
import { TenantIsolatedDb } from "@/services/db";
import { seedDefaultTenant } from "@/services/seed";

const VALID_ROLES = new Set([
  "admin",
  "finops",
  "devops",
  "architect",
  "sustainability",
  "viewer",
]);

export async function GET() {
  try {
    const tenant = await seedDefaultTenant();
    return NextResponse.json({
      monthlyBudget: tenant.monthlyBudget,
      functionalUnits: tenant.functionalUnits,
      activeRole: VALID_ROLES.has(tenant.activeRole) ? tenant.activeRole : "admin",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: error.message || "Failed to load workspace config" } },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const tenant = await seedDefaultTenant();
    const db = new TenantIsolatedDb(tenant.id);
    const body = await request.json();

    const callerRole = request.headers.get("x-greencloud-role");
    const isModifyingFinancialConfig =
      body.monthlyBudget !== undefined || body.functionalUnits !== undefined;

    if (callerRole === "viewer" && isModifyingFinancialConfig) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Read-Only Viewer cannot modify budget or SCI settings." } },
        { status: 403 }
      );
    }

    const updated = await db.updateWorkspaceConfig({
      monthlyBudget:
        typeof body.monthlyBudget === "number" ? body.monthlyBudget : undefined,
      functionalUnits:
        typeof body.functionalUnits === "number" ? body.functionalUnits : undefined,
      activeRole:
        typeof body.activeRole === "string" && VALID_ROLES.has(body.activeRole)
          ? body.activeRole
          : undefined,
    });

    await db.logAction("user", "workspace_config_updated", "tenant", tenant.id, {
      monthlyBudget: updated.monthlyBudget,
      functionalUnits: updated.functionalUnits,
      activeRole: updated.activeRole,
    });

    return NextResponse.json({
      monthlyBudget: updated.monthlyBudget,
      functionalUnits: updated.functionalUnits,
      activeRole: updated.activeRole,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: error.message || "Failed to update workspace config" } },
      { status: 500 }
    );
  }
}
