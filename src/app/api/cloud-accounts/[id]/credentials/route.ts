import { NextResponse } from "next/server";
import { TenantIsolatedDb } from "@/services/db";
import { seedDefaultTenant } from "@/services/seed";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await seedDefaultTenant();
    const db = new TenantIsolatedDb(tenant.id);
    const accountId = params.id;

    const body = await request.json();
    const { accessKeyId, secretAccessKey } = body;

    if (!accessKeyId || !secretAccessKey) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Both accessKeyId and secretAccessKey are required." } },
        { status: 400 }
      );
    }

    const updatedAccount = await db.updateAccountCredentials(
      accountId,
      accessKeyId.trim(),
      secretAccessKey.trim()
    );

    await db.logAction(
      "user",
      "credentials_encrypted_configured",
      "cloud_account",
      accountId,
      { provider: updatedAccount.provider, encryption: "AES-256-GCM" }
    );

    return NextResponse.json({
      success: true,
      account: db.sanitizeAccount(updatedAccount),
      message: "Credentials successfully encrypted with AES-256-GCM and stored for live sync."
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: error.message || "Failed to update credentials." } },
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
    const accountId = params.id;

    const account = await db.getAccount(accountId);
    if (!account) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Cloud account not found." } },
        { status: 404 }
      );
    }

    const { prisma } = await import("@/services/db");
    const updated = await prisma.cloudAccount.update({
      where: { id: accountId },
      data: {
        encryptedAccessKey: null,
        encryptedSecretKey: null,
      },
    });

    await db.logAction(
      "user",
      "credentials_purged",
      "cloud_account",
      accountId,
      { provider: account.provider }
    );

    return NextResponse.json({
      success: true,
      account: db.sanitizeAccount(updated),
      message: "Encrypted credentials purged completely from database."
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: error.message || "Failed to delete credentials." } },
      { status: 500 }
    );
  }
}
