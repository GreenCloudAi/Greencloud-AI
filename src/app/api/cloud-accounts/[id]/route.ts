import { NextResponse } from "next/server";
import { TenantIsolatedDb } from "@/services/db";
import { seedDefaultTenant } from "@/services/seed";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await seedDefaultTenant();
    const db = new TenantIsolatedDb(tenant.id);
    const account = await db.getAccount(params.id);

    if (!account) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Cloud account not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json(account);
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: error.message || "Failed to fetch account" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await seedDefaultTenant();
    const db = new TenantIsolatedDb(tenant.id);

    const account = await db.getAccount(params.id);
    if (!account) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Cloud account not found" } },
        { status: 404 }
      );
    }

    await db.deleteAccount(params.id);

    return NextResponse.json({ success: true, message: `Account ${account.name} disconnected successfully` });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: error.message || "Failed to disconnect account" } },
      { status: 500 }
    );
  }
}
