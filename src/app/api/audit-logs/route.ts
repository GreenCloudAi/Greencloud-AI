import { NextResponse } from "next/server";
import { prisma } from "@/services/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");

    const logs = await prisma.auditLog.findMany({
      where: tenantId ? { tenantId } : undefined,
      orderBy: { ts: "desc" },
      take: 100
    });

    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
