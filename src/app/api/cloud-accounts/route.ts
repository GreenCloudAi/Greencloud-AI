import { NextResponse } from "next/server";
import { prisma, TenantIsolatedDb } from "@/services/db";
import { seedDefaultTenant } from "@/services/seed";

export async function GET() {
  try {
    const tenant = await seedDefaultTenant();
    const db = new TenantIsolatedDb(tenant.id);
    const accounts = await db.listAccounts();
    return NextResponse.json(accounts);
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: error.message || "Failed to list accounts" } },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await seedDefaultTenant();
    const db = new TenantIsolatedDb(tenant.id);
    const body = await request.json();

    const { provider, externalAccountId, name, roleArn } = body;

    if (!provider || !externalAccountId || !name) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Missing required fields (provider, externalAccountId, name)" } },
        { status: 400 }
      );
    }

    // Connect cloud account without sharing static credentials (role assumption only)
    const newAccount = await db.createAccount({
      provider,
      externalAccountId,
      name,
      roleArn
    });

    await db.logAction(
      "admin",
      "connect_account",
      "cloud_account",
      newAccount.id,
      { provider, externalAccountId, name }
    );

    return NextResponse.json(newAccount, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: error.message || "Failed to connect account" } },
      { status: 500 }
    );
  }
}
