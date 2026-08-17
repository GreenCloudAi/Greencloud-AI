import { NextResponse } from "next/server";
import { prisma } from "@/services/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");

    const accounts = await prisma.cloudAccount.findMany({
      where: tenantId ? { tenantId } : undefined,
      include: {
        _count: {
          select: { resources: true }
        }
      },
      orderBy: { syncFreshness: "desc" }
    });

    return NextResponse.json({ success: true, accounts });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch cloud accounts" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tenantId, provider, externalAccountId, name, roleArn } = body;

    if (!provider || !name) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: provider and name are required." },
        { status: 400 }
      );
    }

    // Default tenant if none specified
    let targetTenantId = tenantId;
    if (!targetTenantId) {
      let firstTenant = await prisma.tenant.findFirst();
      if (!firstTenant) {
        firstTenant = await prisma.tenant.create({
          data: { name: "Default Enterprise", plan: "enterprise" }
        });
      }
      targetTenantId = firstTenant.id;
    }

    const account = await prisma.cloudAccount.create({
      data: {
        tenantId: targetTenantId,
        provider: provider.toLowerCase(),
        externalAccountId: externalAccountId || "123456789012",
        name,
        roleArn: roleArn || null,
        status: "active"
      }
    });

    await prisma.auditLog.create({
      data: {
        tenantId: targetTenantId,
        actor: "SystemAdmin",
        action: "connect_account",
        objectType: "CloudAccount",
        objectId: account.id,
        metadata: JSON.stringify({ name, provider, roleArn })
      }
    });

    return NextResponse.json({ success: true, account });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to connect cloud account" },
      { status: 500 }
    );
  }
}
