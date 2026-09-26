import { NextResponse } from "next/server";
import { prisma, TenantIsolatedDb } from "@/services/db";
import { seedDefaultTenant } from "@/services/seed";

export async function GET() {
  try {
    const tenant = await seedDefaultTenant();
    const db = new TenantIsolatedDb(tenant.id);
    const accounts = await db.listSanitizedAccounts();
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

    const { provider, externalAccountId, name, roleArn, externalId, accessKeyId, secretAccessKey } = body;

    if (!provider || !externalAccountId || !name) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Missing required fields (provider, externalAccountId, name)" } },
        { status: 400 }
      );
    }

    // Connect cloud account with optional AES-256-GCM encrypted credentials
    const newAccount = await db.createAccount({
      provider,
      externalAccountId,
      name,
      roleArn,
      externalId,
      accessKeyId,
      secretAccessKey,
    });

    await db.logAction(
      "admin",
      "connect_account",
      "cloud_account",
      newAccount.id,
      { provider, externalAccountId, name, hasCredentials: Boolean(accessKeyId && secretAccessKey) }
    );

    return NextResponse.json(db.sanitizeAccount(newAccount), { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: error.message || "Failed to connect account" } },
      { status: 500 }
    );
  }
}
