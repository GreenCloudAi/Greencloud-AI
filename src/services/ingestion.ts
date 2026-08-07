import { prisma } from "./db";
import { AwsCloudConnector } from "./awsConnector";
import { CarbonEngine } from "./carbonEngine";

/**
 * Resilient Retry Helper
 * Executes an async operation, retrying up to maxRetries on failure with exponential backoff.
 */
async function withRetry<T>(operation: () => Promise<T>, maxRetries = 3, delayMs = 1000): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await operation();
    } catch (error) {
      attempt++;
      if (attempt >= maxRetries) {
        throw error;
      }
      console.warn(`Ingestion retry attempt ${attempt} failed. Retrying in ${delayMs}ms...`, error);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      delayMs *= 2; // Exponential backoff
    }
  }
  throw new Error("Retry logic failed");
}

export class IngestionService {
  private tenantId: string;
  private accountId: string;

  constructor(tenantId: string, accountId: string) {
    this.tenantId = tenantId;
    this.accountId = accountId;
  }

  /**
   * Runs the complete ingestion and normalization workflow.
   * Isolates failures in sub-scans (EC2, EBS, EIP, Billing) so that partial failures do not prevent progress.
   */
  async runSync(): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];

    // 1. Fetch Cloud Account
    const account = await prisma.cloudAccount.findFirst({
      where: { id: this.accountId, tenantId: this.tenantId }
    });

    if (!account) {
      throw new Error(`Cloud account ${this.accountId} not found for tenant ${this.tenantId}`);
    }

    await prisma.cloudAccount.update({
      where: { id: this.accountId },
      data: { status: "syncing" }
    });

    const connector = new AwsCloudConnector(account.roleArn || undefined, account.id);
    const syncTime = new Date();

    let syncedResourceIds: string[] = [];

    // --- Sub-scan 1: EC2 Instances ---
    try {
      console.log("Ingesting EC2 instances...");
      const instances = await withRetry(() => connector.fetchEC2Instances());
      
      for (const inst of instances) {
        // Find or create resource in Resource Graph
        const resource = await prisma.cloudResource.upsert({
          where: { id: `${this.accountId}_${inst.InstanceId}` },
          create: {
            id: `${this.accountId}_${inst.InstanceId}`,
            cloudAccountId: this.accountId,
            providerResourceId: inst.InstanceId,
            resourceType: "ec2",
            region: inst.Region,
            lifecycleState: inst.State,
            tags: JSON.stringify(inst.Tags),
            firstSeenAt: new Date(inst.LaunchTime),
            lastSeenAt: syncTime
          },
          update: {
            lifecycleState: inst.State,
            tags: JSON.stringify(inst.Tags),
            lastSeenAt: syncTime
          }
        });

        syncedResourceIds.push(resource.id);

        // Calculate and write operational + embodied carbon emissions
        // Average CPU: if running, average CPU utilization series; if stopped, 0%
        const avgCpu = inst.State === "running" 
          ? inst.CpuUtilizationSeries.reduce((a, b) => a + b, 0) / inst.CpuUtilizationSeries.length 
          : 0;

        const carbonResult = CarbonEngine.calculateEC2Carbon(inst.InstanceType, inst.Region, avgCpu);
        await prisma.carbonEmission.create({
          data: {
            resourceId: resource.id,
            ts: syncTime,
            energyKwh: carbonResult.energyKwh,
            operationalGco2e: carbonResult.operationalGco2e,
            embodiedGco2e: carbonResult.embodiedGco2e,
            method: carbonResult.method
          }
        });
      }
    } catch (err: any) {
      const msg = `EC2 Ingestion failed: ${err.message || err}`;
      console.error(msg);
      errors.push(msg);
    }

    // --- Sub-scan 2: EBS Volumes ---
    try {
      console.log("Ingesting EBS volumes...");
      const volumes = await withRetry(() => connector.fetchEBSVolumes());

      for (const vol of volumes) {
        const resource = await prisma.cloudResource.upsert({
          where: { id: `${this.accountId}_${vol.VolumeId}` },
          create: {
            id: `${this.accountId}_${vol.VolumeId}`,
            cloudAccountId: this.accountId,
            providerResourceId: vol.VolumeId,
            resourceType: "ebs",
            region: vol.Region,
            lifecycleState: vol.State,
            tags: JSON.stringify(vol.Tags),
            firstSeenAt: new Date(vol.CreateTime),
            lastSeenAt: syncTime
          },
          update: {
            lifecycleState: vol.State,
            tags: JSON.stringify(vol.Tags),
            lastSeenAt: syncTime
          }
        });

        syncedResourceIds.push(resource.id);

        // Carbon calculation
        const carbonResult = CarbonEngine.calculateEBSCarbon(vol.Size, vol.Region);
        await prisma.carbonEmission.create({
          data: {
            resourceId: resource.id,
            ts: syncTime,
            energyKwh: carbonResult.energyKwh,
            operationalGco2e: carbonResult.operationalGco2e,
            embodiedGco2e: carbonResult.embodiedGco2e,
            method: carbonResult.method
          }
        });
      }
    } catch (err: any) {
      const msg = `EBS Ingestion failed: ${err.message || err}`;
      console.error(msg);
      errors.push(msg);
    }

    // --- Sub-scan 3: Elastic IPs ---
    try {
      console.log("Ingesting Elastic IPs...");
      const ips = await withRetry(() => connector.fetchElasticIPs());

      for (const ip of ips) {
        const resource = await prisma.cloudResource.upsert({
          where: { id: `${this.accountId}_${ip.AllocationId}` },
          create: {
            id: `${this.accountId}_${ip.AllocationId}`,
            cloudAccountId: this.accountId,
            providerResourceId: ip.PublicIp,
            resourceType: "eip",
            region: ip.Region,
            lifecycleState: ip.AssociationId ? "associated" : "unassociated",
            tags: JSON.stringify(ip.Tags),
            firstSeenAt: syncTime,
            lastSeenAt: syncTime
          },
          update: {
            lifecycleState: ip.AssociationId ? "associated" : "unassociated",
            tags: JSON.stringify(ip.Tags),
            lastSeenAt: syncTime
          }
        });

        syncedResourceIds.push(resource.id);

        // Elastic IPs do not emit operational carbon, but create a zero entry for completeness
        await prisma.carbonEmission.create({
          data: {
            resourceId: resource.id,
            ts: syncTime,
            energyKwh: 0,
            operationalGco2e: 0,
            embodiedGco2e: 0,
            method: "zero_emission_source"
          }
        });
      }
    } catch (err: any) {
      const msg = `EIP Ingestion failed: ${err.message || err}`;
      console.error(msg);
      errors.push(msg);
    }

    // --- Sub-scan 4: Billing (FOCUS Normalization) ---
    try {
      console.log("Ingesting Cost Explorer / Billing data...");
      const todayStr = syncTime.toISOString().slice(0, 10);
      const thirtyDaysAgo = new Date(syncTime.getTime() - 30 * 24 * 3600 * 1000);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().slice(0, 10);

      const billRows = await withRetry(() => connector.fetchBillingSummary(thirtyDaysAgoStr, todayStr));

      // Clean up previous cost records for the same range to avoid duplication (re-sync safety)
      await prisma.costLineItem.deleteMany({
        where: {
          cloudAccountId: this.accountId,
          chargeDate: {
            gte: thirtyDaysAgo,
            lte: syncTime
          }
        }
      });

      for (const row of billRows) {
        // Match billing item to a resource type to link resource references where possible
        let matchedResourceId: string | null = null;

        if (row.Service === "AmazonEC2") {
          // Find any EC2 resource associated with this account
          const matches = await prisma.cloudResource.findMany({
            where: { cloudAccountId: this.accountId, resourceType: "ec2" }
          });
          // In a mock environment, associate billing items evenly or with the first matched EC2
          if (matches.length > 0) matchedResourceId = matches[0].id;
        } else if (row.Service === "AmazonEBS") {
          const matches = await prisma.cloudResource.findMany({
            where: { cloudAccountId: this.accountId, resourceType: "ebs" }
          });
          if (matches.length > 0) matchedResourceId = matches[0].id;
        } else if (row.Service === "AmazonVPC") {
          const matches = await prisma.cloudResource.findMany({
            where: { cloudAccountId: this.accountId, resourceType: "eip" }
          });
          if (matches.length > 0) matchedResourceId = matches[0].id;
        }

        // Write as FOCUS normalized item
        await prisma.costLineItem.create({
          data: {
            cloudAccountId: this.accountId,
            resourceId: matchedResourceId,
            chargeDate: new Date(row.Date),
            providerService: row.Service,
            billedCost: row.Cost,
            effectiveCost: row.Cost, // Standard normalization maps unblended -> effective cost
            currency: "USD"
          }
        });
      }
    } catch (err: any) {
      const msg = `Billing Ingestion failed: ${err.message || err}`;
      console.error(msg);
      errors.push(msg);
    }

    // --- Finalize Sync Status ---
    const isSuccess = errors.length < 4; // Succeeds if at least one sub-scan worked (resilience)
    const finalStatus = isSuccess ? "active" : "sync_failed";

    await prisma.cloudAccount.update({
      where: { id: this.accountId },
      data: {
        status: finalStatus,
        syncFreshness: isSuccess ? syncTime : undefined,
        syncError: errors.length > 0 ? errors.join(" | ") : null
      }
    });

    // Write audit logs
    await prisma.auditLog.create({
      data: {
        tenantId: this.tenantId,
        actor: "system_ingest",
        action: "sync_completed",
        objectType: "cloud_account",
        objectId: this.accountId,
        metadata: JSON.stringify({
          success: isSuccess,
          syncedResourceCount: syncedResourceIds.length,
          errors
        })
      }
    });

    return {
      success: isSuccess,
      errors
    };
  }
}
