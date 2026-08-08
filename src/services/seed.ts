import { prisma } from "./db";
import { IngestionService } from "./ingestion";

export async function seedDemoData() {
  console.log("[Seed] Cleaning database...");
  await prisma.auditLog.deleteMany({});
  await prisma.approval.deleteMany({});
  await prisma.recommendation.deleteMany({});
  await prisma.carbonEmission.deleteMany({});
  await prisma.costLineItem.deleteMany({});
  await prisma.cloudResource.deleteMany({});
  await prisma.cloudAccount.deleteMany({});
  await prisma.tenant.deleteMany({});

  console.log("[Seed] Creating demo Tenant and Cloud Account...");
  const tenant = await prisma.tenant.create({
    data: {
      name: "Acme Enterprises",
      plan: "enterprise"
    }
  });

  const account = await prisma.cloudAccount.create({
    data: {
      tenantId: tenant.id,
      provider: "aws",
      externalAccountId: "112233445566",
      name: "Acme AWS Production",
      roleArn: "arn:aws:iam::112233445566:role/GreenCloudReadOnlyRole",
      status: "active"
    }
  });

  console.log("[Seed] Running Ingestion Sync...");
  await IngestionService.syncCloudAccount({ cloudAccountId: account.id });

  console.log("[Seed] Seeding completed successfully!");
}

if (require.main === module) {
  seedDemoData().catch(console.error);
}
