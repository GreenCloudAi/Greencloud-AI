import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { seedDefaultTenant } from "@/services/seed";
import { TenantIsolatedDb } from "@/services/db";

const prisma = new PrismaClient();

export async function POST() {
  try {
    const tenant = await seedDefaultTenant();
    const db = new TenantIsolatedDb(tenant.id);

    // Find all accounts for tenant
    const accounts = await prisma.cloudAccount.findMany({
      where: { tenantId: tenant.id },
      include: {
        _count: {
          select: { resources: true }
        }
      }
    });

    let deletedCount = 0;
    const keptAccountIds = new Set<string>();

    // 1. Identify primary account (the one with most resources or real AWS ID)
    const validAccounts = accounts.filter(a => a._count.resources > 0);
    if (validAccounts.length > 0) {
      // Keep valid accounts with resources
      validAccounts.forEach(a => keptAccountIds.add(a.id));
    } else if (accounts.length > 0) {
      // If none have resources, keep at least the first one
      keptAccountIds.add(accounts[0].id);
    }

    // 2. Delete empty duplicate test accounts (e.g. 123456789012 or duplicates with 0 resources)
    for (const acc of accounts) {
      if (!keptAccountIds.has(acc.id) || acc.externalAccountId === "123456789012") {
        if (keptAccountIds.size > 0 && keptAccountIds.has(acc.id) && validAccounts.length > 0) {
          // don't delete if it's the only one
        } else {
          try {
            await db.deleteAccount(acc.id);
            deletedCount++;
          } catch (e) {
            console.error(`Failed to delete account ${acc.id}:`, e);
          }
        }
      }
    }

    // 3. Purge any recommendations for stopped EC2 instances
    const stoppedResources = await prisma.cloudResource.findMany({
      where: { resourceType: "ec2", lifecycleState: "stopped" }
    });
    for (const inst of stoppedResources) {
      await prisma.recommendation.deleteMany({
        where: {
          resourceId: inst.id,
          id: { in: [`rec_ec2_idle_${inst.id}`, `rec_ec2_rightsize_${inst.id}`] }
        }
      });
    }

    const remainingAccounts = await prisma.cloudAccount.findMany({
      where: { tenantId: tenant.id },
      include: {
        _count: { select: { resources: true } }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${deletedCount} duplicate/empty accounts.`,
      deletedCount,
      remainingAccounts: remainingAccounts.map(a => ({
        id: a.id,
        name: a.name,
        externalAccountId: a.externalAccountId,
        resourceCount: a._count.resources
      }))
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: error.message || "Failed to clean duplicates" } },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
