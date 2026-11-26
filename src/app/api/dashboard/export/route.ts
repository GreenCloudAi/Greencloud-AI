import { NextResponse } from "next/server";
import { parseDashboardScope } from "@/services/dashboardScope";
import { prisma } from "@/services/db";
import { resolveWorkspaceAccess, workspaceAccessResponse } from "@/services/workspaceAccess";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const access = await resolveWorkspaceAccess(request);
    const { accountIds, providerSet, days } = parseDashboardScope(new URL(request.url).searchParams);
    const end = new Date();
    const start = new Date(end.getTime() - days * 86400000);
    const accounts = await prisma.cloudAccount.findMany({
      where: {
        tenantId: access.tenant.id,
        ...(accountIds === null ? {} : { id: { in: Array.from(accountIds) } }),
        provider: { in: Array.from(providerSet) },
      },
      select: { id: true, name: true, provider: true },
    });
    const permitted = accounts.filter((account) =>
      ["account:read", "dashboard:read", "billing:export"].every(
        (permission) => access.permits(permission, account.id, account.provider)
      )
    );
    if (!permitted.length) return NextResponse.json({ error: { message: "No accounts are authorized for billing export." } }, { status: 403 });

    const rows = await prisma.costLineItem.findMany({
      where: { cloudAccountId: { in: permitted.map(({ id }) => id) }, chargeDate: { gte: start, lte: end } },
      select: { cloudAccountId: true, chargeDate: true, providerService: true, billedCost: true, currency: true },
      orderBy: [{ chargeDate: "asc" }, { id: "asc" }],
      take: 10001,
    });
    if (rows.length > 10000) return NextResponse.json({ error: { message: "Select fewer accounts or a shorter period to export up to 10,000 rows." } }, { status: 413 });

    return NextResponse.json({ start, end, accounts: permitted, rows }, {
      headers: { "Cache-Control": "private, no-store", "Content-Disposition": "attachment; filename=greencloud-billing.json" },
    });
  } catch (error) {
    return workspaceAccessResponse(error) ?? NextResponse.json({ error: { message: "Failed to export billing data." } }, { status: 500 });
  }
}
