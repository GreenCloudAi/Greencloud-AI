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
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: { message: "Provide valid cloud account settings." } }, { status: 400 });
    }

    const {
      provider,
      externalAccountId,
      name,
      primaryRegion,
      providerConfig,
      roleArn,
      externalId,
      accessKeyId,
      secretAccessKey,
    } = body;

    if (![provider, externalAccountId, name].every((value) => typeof value === "string" && value.trim())) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Missing required fields (provider, externalAccountId, name)" } },
        { status: 400 }
      );
    }

    if (provider === "aws" && roleArn !== undefined && roleArn !== null
      && (typeof roleArn !== "string" || !/^\d{12}$/.test(externalAccountId)
        || !roleArn.startsWith("arn:aws:iam::" + externalAccountId + ":role/")
        || roleArn.endsWith(":role/"))) {
      return NextResponse.json({ error: { message: "The role ARN must belong to the AWS account being connected." } }, { status: 400 });
    }
    if (Boolean(accessKeyId) !== Boolean(secretAccessKey)
      || [accessKeyId, secretAccessKey].some((value) => value != null && typeof value !== "string")) {
      return NextResponse.json({ error: { message: "Provide both AWS credential fields or leave both blank." } }, { status: 400 });
    }

    // Connect cloud account with optional AES-256-GCM encrypted credentials
    const newAccount = await db.createAccount({
      provider,
      externalAccountId,
      name,
      primaryRegion,
      providerConfig,
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
