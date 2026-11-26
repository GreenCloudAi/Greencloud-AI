import { prisma } from "../src/services/db";
import { seedDefaultTenant, seedRbacForTenant } from "../src/services/seed";

async function main() {
  const tenant = await seedDefaultTenant();
  await seedRbacForTenant(tenant.id, { force: true });

  const [roles, permissions, users, assignments, workloads, skus] = await Promise.all([
    prisma.role.count(),
    prisma.permission.count(),
    prisma.user.count({ where: { tenantId: tenant.id } }),
    prisma.roleAssignment.count({ where: { tenantId: tenant.id } }),
    prisma.workload.count({ where: { tenantId: tenant.id } }),
    prisma.compatibilitySku.count(),
  ]);

  console.log(
    `[Prisma Seed] Tenant=${tenant.id} Roles=${roles} Permissions=${permissions} Users=${users} Assignments=${assignments} Workloads=${workloads} CompatibilitySkus=${skus}`
  );
}

main()
  .catch((err) => {
    console.error("[Prisma Seed] Failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
