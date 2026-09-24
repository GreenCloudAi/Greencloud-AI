import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanDup() {
  const accountId = 'b4fcf587-23aa-4e05-8f7e-a8161ac3609d';
  // Delete associated resources, emissions, and recommendations
  const resources = await prisma.cloudResource.findMany({ where: { cloudAccountId: accountId } });
  for (const r of resources) {
    await prisma.recommendation.deleteMany({ where: { resourceId: r.id } });
    await prisma.carbonEmission.deleteMany({ where: { resourceId: r.id } });
  }
  await prisma.cloudResource.deleteMany({ where: { cloudAccountId: accountId } });
  await prisma.costLineItem.deleteMany({ where: { cloudAccountId: accountId } });
  await prisma.cloudAccount.deleteMany({ where: { id: accountId } });
  console.log('Successfully cleaned duplicate account b4fcf587-23aa-4e05-8f7e-a8161ac3609d');

  // Also purge any recommendations for stopped resources across all accounts
  const stoppedRecs = await prisma.recommendation.findMany({
    where: {
      category: "idle_cleanup",
      title: { startsWith: "Stop Idle EC2" },
      resource: { lifecycleState: "stopped" }
    }
  });
  console.log(`Found ${stoppedRecs.length} obsolete "Stop Idle EC2" recommendations for stopped instances.`);
  if (stoppedRecs.length > 0) {
    await prisma.recommendation.deleteMany({
      where: { id: { in: stoppedRecs.map(r => r.id) } }
    });
    console.log("Deleted all obsolete recommendations.");
  }

  const remaining = await prisma.cloudAccount.findMany();
  console.log(`\nRemaining accounts count: ${remaining.length}`);
  remaining.forEach(a => console.log(`- ${a.name} (${a.externalAccountId})`));

  const recs = await prisma.recommendation.findMany({
    include: { resource: true }
  });
  console.log(`\nRemaining recommendations count: ${recs.length}`);
  recs.forEach(r => console.log(`- ${r.title} (resource state: ${r.resource?.lifecycleState})`));
}

cleanDup().catch(console.error).finally(() => prisma.$disconnect());
