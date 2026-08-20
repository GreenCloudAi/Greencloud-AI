import { prisma } from "./db";
import { AwsCloudConnector } from "./awsConnector";
import { CarbonEngine } from "./carbonEngine";
import { GreenCloudConfig } from "./config";
import { Logger } from "./logger";

/**
 * Resilient Retry Helper
 * Executes an async operation, retrying up to maxRetries on failure with exponential backoff.
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries = GreenCloudConfig.maxRetries,
  delayMs = GreenCloudConfig.retryBaseDelayMs
): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await operation();
    } catch (error) {
      attempt++;
      if (attempt >= maxRetries) {
        throw error;
      }
      Logger.warn(
        "INGEST",
        "RETRY_ATTEMPT",
        `${operationName} attempt ${attempt} failed. Retrying in ${delayMs}ms...`,
        "Check network latency or transient AWS API availability.",
        { error: (error as any)?.message }
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
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
   * Runs the complete ingestion and normalization workflow using real AWS APIs.
   * Isolates failures in sub-scans (EC2, EBS, EIP, Billing) so that partial
   * failures do not prevent progress.
   */
  async runSync(): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];

    // 1. Fetch Cloud Account from DB
    const account = await prisma.cloudAccount.findFirst({
      where: { id: this.accountId, tenantId: this.tenantId },
    });

    if (!account) {
      throw new Error(
        `Cloud account ${this.accountId} not found for tenant ${this.tenantId}`
      );
    }

    if (!account.roleArn) {
      throw new Error(
        `Cloud account "${account.name}" has no IAM Role ARN configured. ` +
          `Please provide the GreenCloudReadOnlyRole ARN in the onboarding form.`
      );
    }

    // Mark account as syncing
    await prisma.cloudAccount.update({
      where: { id: this.accountId },
      data: { status: "syncing" },
    });

    // Create real AWS connector with the stored Role ARN and ExternalId
    const connector = new AwsCloudConnector(
      account.roleArn,
      account.externalId || undefined
    );
    const syncTime = new Date();
    const syncedResourceIds: string[] = [];

    // --- Sub-scan 1: EC2 Instances ---
    try {
      Logger.info("INGEST", "EC2_INGEST_START", "Starting EC2 inventory and CloudWatch telemetry scan...");
      const instances = await withRetry(() => connector.fetchEC2Instances(), "EC2 Ingestion");
      Logger.success("INGEST", "EC2_INGEST_FETCHED", `Discovered ${instances.length} EC2 instances in account.`);

      for (const inst of instances) {
        // Upsert resource into the Resource Graph
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
            instanceType: inst.InstanceType,
            monthlyCost: inst.MonthlyCost,
            telemetryMetrics: JSON.stringify({
              cpuDailyAverages: inst.CpuUtilizationSeries,
              peakCpu: inst.PeakCpuUtilization,
              lookbackDays: GreenCloudConfig.cloudwatchLookbackDays,
              collectedAt: syncTime.toISOString(),
            }),
            firstSeenAt: new Date(inst.LaunchTime),
            lastSeenAt: syncTime,
          },
          update: {
            lifecycleState: inst.State,
            tags: JSON.stringify(inst.Tags),
            instanceType: inst.InstanceType,
            monthlyCost: inst.MonthlyCost,
            telemetryMetrics: JSON.stringify({
              cpuDailyAverages: inst.CpuUtilizationSeries,
              peakCpu: inst.PeakCpuUtilization,
              lookbackDays: GreenCloudConfig.cloudwatchLookbackDays,
              collectedAt: syncTime.toISOString(),
            }),
            lastSeenAt: syncTime,
          },
        });

        syncedResourceIds.push(resource.id);

        // Calculate carbon emissions from real CPU data
        const avgCpu =
          inst.CpuUtilizationSeries.length > 0
            ? inst.CpuUtilizationSeries.reduce((a, b) => a + b, 0) /
              inst.CpuUtilizationSeries.length
            : 0;

        const carbonResult = CarbonEngine.calculateEC2Carbon(
          inst.InstanceType,
          inst.Region,
          avgCpu
        );

        await prisma.carbonEmission.create({
          data: {
            resourceId: resource.id,
            ts: syncTime,
            energyKwh: carbonResult.energyKwh,
            operationalGco2e: carbonResult.operationalGco2e,
            embodiedGco2e: carbonResult.embodiedGco2e,
            method: carbonResult.method,
          },
        });
      }
    } catch (err: any) {
      const msg = `EC2 Ingestion failed: ${err.message || err}`;
      Logger.error("INGEST", "EC2_INGEST_ERROR", err, "Check 'ec2:DescribeInstances' permission and IAM role trust relationship.");
      errors.push(msg);
    }

    // --- Sub-scan 2: EBS Volumes ---
    try {
      Logger.info("INGEST", "EBS_INGEST_START", "Starting EBS storage scan...");
      const volumes = await withRetry(() => connector.fetchEBSVolumes(), "EBS Ingestion");
      Logger.success("INGEST", "EBS_INGEST_FETCHED", `Discovered ${volumes.length} EBS volumes.`);

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
            sizeGb: vol.Size,
            monthlyCost: vol.MonthlyCost,
            firstSeenAt: new Date(vol.CreateTime),
            lastSeenAt: syncTime,
          },
          update: {
            lifecycleState: vol.State,
            tags: JSON.stringify(vol.Tags),
            sizeGb: vol.Size,
            monthlyCost: vol.MonthlyCost,
            lastSeenAt: syncTime,
          },
        });

        syncedResourceIds.push(resource.id);

        // Carbon calculation for storage
        const carbonResult = CarbonEngine.calculateEBSCarbon(
          vol.Size,
          vol.Region
        );
        await prisma.carbonEmission.create({
          data: {
            resourceId: resource.id,
            ts: syncTime,
            energyKwh: carbonResult.energyKwh,
            operationalGco2e: carbonResult.operationalGco2e,
            embodiedGco2e: carbonResult.embodiedGco2e,
            method: carbonResult.method,
          },
        });
      }
    } catch (err: any) {
      const msg = `EBS Ingestion failed: ${err.message || err}`;
      Logger.error("INGEST", "EBS_INGEST_ERROR", err, "Check 'ec2:DescribeVolumes' permission in target AWS account.");
      errors.push(msg);
    }

    // --- Sub-scan 3: Elastic IPs ---
    try {
      Logger.info("INGEST", "EIP_INGEST_START", "Starting Elastic IP network scan...");
      const ips = await withRetry(() => connector.fetchElasticIPs(), "EIP Ingestion");
      Logger.success("INGEST", "EIP_INGEST_FETCHED", `Discovered ${ips.length} Elastic IPs.`);

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
            monthlyCost: ip.MonthlyCost,
            firstSeenAt: syncTime,
            lastSeenAt: syncTime,
          },
          update: {
            lifecycleState: ip.AssociationId ? "associated" : "unassociated",
            tags: JSON.stringify(ip.Tags),
            monthlyCost: ip.MonthlyCost,
            lastSeenAt: syncTime,
          },
        });

        syncedResourceIds.push(resource.id);

        // Elastic IPs: minimal operational carbon
        await prisma.carbonEmission.create({
          data: {
            resourceId: resource.id,
            ts: syncTime,
            energyKwh: 0,
            operationalGco2e: 0,
            embodiedGco2e: 0,
            method: "zero_emission_source",
          },
        });
      }
    } catch (err: any) {
      const msg = `EIP Ingestion failed: ${err.message || err}`;
      Logger.error("INGEST", "EIP_INGEST_ERROR", err, "Check 'ec2:DescribeAddresses' permission in target AWS account.");
      errors.push(msg);
    }

    // --- Sub-scan 4: Billing (Cost Explorer → FOCUS Normalization) ---
    try {
      Logger.info("INGEST", "BILLING_INGEST_START", "Starting Cost Explorer 30-day billing scan...");
      const todayStr = syncTime.toISOString().slice(0, 10);
      const thirtyDaysAgo = new Date(
        syncTime.getTime() - 30 * 24 * 3600 * 1000
      );
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().slice(0, 10);

      const billRows = await withRetry(
        () => connector.fetchBillingSummary(thirtyDaysAgoStr, todayStr),
        "Cost Explorer Ingestion"
      );
      Logger.success("INGEST", "BILLING_INGEST_FETCHED", `Retrieved ${billRows.length} FOCUS-normalized cost records.`);

      // Clean up previous cost records for re-sync safety
      await prisma.costLineItem.deleteMany({
        where: {
          cloudAccountId: this.accountId,
          chargeDate: {
            gte: thirtyDaysAgo,
            lte: syncTime,
          },
        },
      });

      for (const row of billRows) {
        // Attempt to match billing service to resource type
        let matchedResourceId: string | null = null;

        if (
          row.Service === "Amazon Elastic Compute Cloud - Compute" ||
          row.Service === "AmazonEC2"
        ) {
          const matches = await prisma.cloudResource.findMany({
            where: {
              cloudAccountId: this.accountId,
              resourceType: "ec2",
            },
          });
          if (matches.length > 0) matchedResourceId = matches[0].id;
        } else if (
          row.Service === "Amazon Elastic Block Store" ||
          row.Service === "AmazonEBS"
        ) {
          const matches = await prisma.cloudResource.findMany({
            where: {
              cloudAccountId: this.accountId,
              resourceType: "ebs",
            },
          });
          if (matches.length > 0) matchedResourceId = matches[0].id;
        } else if (
          row.Service === "Amazon Virtual Private Cloud" ||
          row.Service === "AmazonVPC"
        ) {
          const matches = await prisma.cloudResource.findMany({
            where: {
              cloudAccountId: this.accountId,
              resourceType: "eip",
            },
          });
          if (matches.length > 0) matchedResourceId = matches[0].id;
        }

        // Write as FOCUS normalized cost line item
        await prisma.costLineItem.create({
          data: {
            cloudAccountId: this.accountId,
            resourceId: matchedResourceId,
            chargeDate: new Date(row.Date),
            providerService: row.Service,
            billedCost: row.Cost,
            effectiveCost: row.Cost,
            currency: "USD",
          },
        });
      }
    } catch (err: any) {
      const msg = `Billing Ingestion failed: ${err.message || err}`;
      Logger.error("INGEST", "BILLING_INGEST_ERROR", err, "Ensure Cost Explorer is enabled in AWS Console and IAM role has 'ce:GetCostAndUsage'.");
      errors.push(msg);
    }

    // --- Finalize Sync Status ---
    const isSuccess = errors.length < 4; // Resilient: succeeds if at least one sub-scan worked
    const finalStatus = isSuccess ? "active" : "sync_failed";

    await prisma.cloudAccount.update({
      where: { id: this.accountId },
      data: {
        status: finalStatus,
        syncFreshness: isSuccess ? syncTime : undefined,
        syncError: errors.length > 0 ? errors.join(" | ") : null,
      },
    });

    // Write audit log
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
          errors,
        }),
      },
    });

    if (isSuccess) {
      Logger.success(
        "INGEST",
        "SYNC_WORKFLOW_COMPLETE",
        `Ingestion finished successfully. Status: ${finalStatus}. Total resources synced: ${syncedResourceIds.length}.`,
        { errorsCount: errors.length }
      );
    } else {
      Logger.error(
        "INGEST",
        "SYNC_WORKFLOW_FAILED",
        new Error(errors.join(" | ")),
        "Review AWS permissions above and ensure credentials are valid."
      );
    }

    return {
      success: isSuccess,
      errors,
    };
  }
}
