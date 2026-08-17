import { NextResponse } from "next/server";
import { prisma } from "@/services/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    const status = searchParams.get("status");

    const whereClause: any = {};
    if (tenantId) whereClause.tenantId = tenantId;
    if (status) whereClause.status = status;

    const recommendations = await prisma.recommendation.findMany({
      where: whereClause,
      include: {
        resource: true,
        approvals: {
          orderBy: { decidedAt: "desc" }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ success: true, recommendations });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch recommendations" },
      { status: 500 }
    );
  }
}
