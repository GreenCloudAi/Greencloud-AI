import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const accounts = await prisma.cloudAccount.findMany({
    include: {
      _count: {
        select: { resources: true }
      }
    }
  });

  console.log(`Total accounts in DB: ${accounts.length}`);
  accounts.forEach((a, i) => {
    console.log(`${i + 1}. [${a.id}] "${a.name}" (${a.externalAccountId}) - ${a._count.resources} resources - Created: ${a.createdAt}`);
  });

  // Also check recommendations
  const recs = await prisma.recommendation.findMany({
    include: { resource: true }
  });
  console.log(`\nTotal recommendations in DB: ${recs.length}`);
  recs.forEach((r, i) => {
    console.log(`${i + 1}. [${r.id}] "${r.title}" (status: ${r.status}, resource state: ${r.resource?.lifecycleState || 'no-res'}, type: ${r.resource?.resourceType || 'none'})`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
