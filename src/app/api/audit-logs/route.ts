import { NextResponse } from "next/server";
import { TenantIsolatedDb } from "@/services/db";
import { seedDefaultTenant } from "@/services/seed";

export async function GET() {
  try {
    const tenant = await seedDefaultTenant();
    const db = new TenantIsolatedDb(tenant.id);
    const logs = await db.listAuditLogs();
    return NextResponse.json(logs);
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: error.message || "Failed to fetch audit logs" } },
      { status: 500 }
    );
  }
}
