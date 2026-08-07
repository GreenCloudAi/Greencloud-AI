import { prisma } from "./db";
import { IngestionService } from "./ingestion";
import { RecommendationEngine } from "./recommendationEngine";

export async function seedDefaultTenant() {
  // Check if tenant exists
  const existingTenant = await prisma.tenant.findFirst();
  if (existingTenant) {
    return existingTenant;
  }

  console.log("Seeding default tenant...");
  const tenant = await prisma.tenant.create({
    data: {
      name: "Acme Cloud Corp",
      plan: "enterprise"
    }
  });

  // Create default mock AWS account
  console.log("Seeding default AWS account...");
  const account = await prisma.cloudAccount.create({
    data: {
      tenantId: tenant.id,
      provider: "aws",
      externalAccountId: "112233445566",
      name: "Acme AWS Production",
      status: "pending_validation"
    }
  });

  // Run the first ingestion automatically to populate the dashboard!
  console.log("Running initial sync for default AWS account...");
  const ingest = new IngestionService(tenant.id, account.id);
  await ingest.runSync();

  // Run recommendation engine
  console.log("Running initial recommendation sweep...");
  const recs = new RecommendationEngine(tenant.id);
  await recs.generateRecommendations();

  // Create an initial audit log
  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      actor: "system",
      action: "database_seeded",
      objectType: "tenant",
      objectId: tenant.id,
      metadata: JSON.stringify({ message: "Default tenant and mock AWS account provisioned." })
    }
  });

  return tenant;
}
