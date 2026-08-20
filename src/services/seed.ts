import { prisma } from "./db";

/**
 * Seeds a default tenant if one doesn't exist.
 * In production mode, no mock data is created — the user must connect
 * a real AWS account via the /onboarding page with a valid IAM Role ARN.
 */
export async function seedDefaultTenant() {
  // Check if tenant exists
  const existingTenant = await prisma.tenant.findFirst();
  if (existingTenant) {
    return existingTenant;
  }

  console.log("[Seed] Creating default tenant...");
  const tenant = await prisma.tenant.create({
    data: {
      name: "GreenCloud Default Organization",
      plan: "enterprise",
    },
  });

  // Create initial audit log
  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      actor: "system",
      action: "tenant_created",
      objectType: "tenant",
      objectId: tenant.id,
      metadata: JSON.stringify({
        message: "Default tenant created. Connect an AWS account via /onboarding to begin.",
      }),
    },
  });

  console.log(`[Seed] Tenant created: ${tenant.id}. Navigate to /onboarding to connect your AWS account.`);
  return tenant;
}
