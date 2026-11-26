import { prisma } from "./db";
import { AwsCloudConnector } from "./awsConnector";
import { CarbonEngine } from "./carbonEngine";
import { GreenCloudConfig } from "./config";
import { Logger } from "./logger";
import { decryptCredential } from "./encryption";
import { normalizeFocusServiceCategory, normalizeProviderId } from "./cloudMetadata";

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

export type SyncSource = "inventory" | "telemetry" | "billing";
export type SyncSourceResult = {
  status: "available" | "no_rows" | "partial" | "failed" | "not_run";
  records: number;
  error?: string;
};
export type SyncSources = Record<SyncSource, SyncSourceResult>;

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
  async runSync(): Promise<{ success: boolean; errors: string[]; sources?: SyncSources }> {
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

    const provider = normalizeProviderId(account.provider);
    if (provider !== "aws") {
      // GCP / Azure accounts ingest via CNCF FOCUS imports or project billing APIs;
      // recompute carbon emissions across stored resources on re-sync without requiring STS AssumeRole.
      const existingResources = await prisma.cloudResource.findMany({
        where: { cloudAccountId: this.accountId },
      });
      const syncTime = new Date();
      for (const res of existingResources) {
        let avgCpu = 25;
        if (res.telemetryMetrics) {
          try {
            const parsed = JSON.parse(res.telemetryMetrics);
            if (Array.isArray(parsed.cpuDailyAverages) && parsed.cpuDailyAverages.length > 0) {
              avgCpu =
                parsed.cpuDailyAverages.reduce((a: number, b: number) => a + b, 0) /
                parsed.cpuDailyAverages.length;
            }
          } catch {}
        }
        const carbonResult =
          res.serviceCategory === "Storage" || res.resourceType.includes("ebs") || res.resourceType.includes("disk")
            ? CarbonEngine.calculateEBSCarbon(res.sizeGb || 50, res.region)
            : CarbonEngine.calculateEC2Carbon(res.instanceType || "n2-standard-2", res.region, avgCpu);
        await prisma.carbonEmission.create({
          data: {
            resourceId: res.id,
            ts: syncTime,
            energyKwh: carbonResult.energyKwh,
            operationalGco2e: carbonResult.operationalGco2e,
            embodiedGco2e: carbonResult.embodiedGco2e,
            method: carbonResult.method,
          },
        });
      }
      await prisma.cloudAccount.update({
        where: { id: this.accountId },
        data: { status: "active", syncFreshness: syncTime, syncError: null },
      });
      return { success: true, errors: [] };
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

    // Check for encrypted credentials stored on the account
    let baseCredentials: { accessKeyId: string; secretAccessKey: string } | undefined = undefined;
    if (account.encryptedAccessKey && account.encryptedSecretKey) {
      const decAccess = decryptCredential(account.encryptedAccessKey);
      const decSecret = decryptCredential(account.encryptedSecretKey);
      if (decAccess && decSecret) {
        baseCredentials = { accessKeyId: decAccess, secretAccessKey: decSecret };
        Logger.info("INGEST", "ENCRYPTED_CREDENTIALS_LOADED", "Decrypted in-memory credentials for secure live sync.");
      }
    }

    // Create real AWS connector with the stored Role ARN, ExternalId, and optional decrypted base credentials
    const connector = new AwsCloudConnector(
      account.roleArn,
      account.externalId || undefined,
      baseCredentials
    );
    const syncTime = new Date();
    const syncedResourceIds: string[] = [];
    let cpuRecords = 0;
    let missingCpu = 0;
    let ec2Failed = false;

    // --- Sub-scan 1: EC2 Instances ---
    try {
      Logger.info("INGEST", "EC2_INGEST_START", "Starting EC2 inventory and CloudWatch telemetry scan...");
      const instances = await withRetry(() => connector.fetchEC2Instances(), "EC2 Ingestion");
      Logger.success("INGEST", "EC2_INGEST_FETCHED", `Discovered ${instances.length} EC2 instances in account.`);

      for (const inst of instances) {
        if (inst.State === "running" && inst.CpuUtilizationSeries.length === 0) missingCpu++;
        // Upsert resource into the Resource Graph
        const resource = await prisma.cloudResource.upsert({
          where: { id: `${this.accountId}_${inst.InstanceId}` },
          create: {
            id: `${this.accountId}_${inst.InstanceId}`,
            cloudAccountId: this.accountId,
            provider: "aws",
            providerResourceId: inst.InstanceId,
            resourceType: "ec2",
            serviceCategory: "Compute",
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
            provider: "aws",
            serviceCategory: "Compute",
            lifecycleState: inst.State,
            tags: JSON.stringify(inst.Tags),
            instanceType: inst.InstanceType,
            monthlyCost: inst.MonthlyCost,
            telemetryMetrics: inst.CpuUtilizationSeries.length ? JSON.stringify({
              cpuDailyAverages: inst.CpuUtilizationSeries,
              peakCpu: inst.PeakCpuUtilization,
              lookbackDays: GreenCloudConfig.cloudwatchLookbackDays,
              collectedAt: syncTime.toISOString(),
            }) : undefined,
            lastSeenAt: syncTime,
          },
        });

        syncedResourceIds.push(resource.id);
        if (inst.CpuUtilizationSeries.length > 0) cpuRecords++;

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
      ec2Failed = true;
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
            provider: "aws",
            providerResourceId: vol.VolumeId,
            resourceType: "ebs",
            serviceCategory: "Storage",
            region: vol.Region,
            lifecycleState: vol.State,
            tags: JSON.stringify(vol.Tags),
            sizeGb: vol.Size,
            monthlyCost: vol.MonthlyCost,
            firstSeenAt: new Date(vol.CreateTime),
            lastSeenAt: syncTime,
          },
          update: {
            provider: "aws",
            serviceCategory: "Storage",
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
            provider: "aws",
            providerResourceId: ip.PublicIp,
            resourceType: "eip",
            serviceCategory: "Network",
            region: ip.Region,
            lifecycleState: ip.AssociationId ? "associated" : "unassociated",
            tags: JSON.stringify(ip.Tags),
            monthlyCost: ip.MonthlyCost,
            firstSeenAt: syncTime,
            lastSeenAt: syncTime,
          },
          update: {
            provider: "aws",
            serviceCategory: "Network",
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

    // --- Sub-scan 4: Billing ---
    const dayMs = 24 * 60 * 60 * 1000;
    const billingEnd = new Date(syncTime.getTime() + dayMs).toISOString().slice(0, 10);
    const billingStart = new Date(syncTime.getTime() - 30 * dayMs).toISOString().slice(0, 10);
    const billing = {
      source: "aws_cost_explorer",
      metric: "UnblendedCost",
      start: billingStart,
      endExclusive: billingEnd,
      status: "failed",
      receivedRows: 0,
      storedRows: 0,
      estimatedRows: 0,
    };

    try {
      const billRows = await withRetry(
        () => connector.fetchBillingSummary(billingStart, billingEnd, account.externalAccountId),
        "Cost Explorer Ingestion"
      );
      billing.receivedRows = billRows.length;
      billing.estimatedRows = billRows.filter((row) => row.Estimated).length;

      if (billRows.length > 0) {
        const records = billRows.map((row) => ({
          cloudAccountId: this.accountId,
          provider: "aws",
          region: "global",
          chargeDate: new Date(row.Date),
          providerService: row.Service,
          serviceCategory: normalizeFocusServiceCategory(row.Service),
          chargeCategory: "Unclassified",
          billedCost: row.Cost,
          effectiveCost: row.Cost,
          currency: row.Currency,
        }));
        await prisma.$transaction([
          prisma.costLineItem.deleteMany({
            where: {
              cloudAccountId: this.accountId,
              provider: "aws",
              region: "global",
              chargeCategory: { in: ["Usage", "Unclassified"] },
              chargeDate: { gte: new Date(billingStart), lt: new Date(billingEnd) },
            },
          }),
          prisma.costLineItem.createMany({ data: records }),
        ]);
        billing.storedRows = records.length;
      }

      billing.status = billRows.length > 0 ? "available" : "no_rows";
      Logger.success("INGEST", "BILLING_INGEST_COMPLETE", `Billing status: ${billing.status}, rows stored: ${billing.storedRows}.`);
    } catch (err: any) {
      const msg = `Billing Ingestion failed: ${err.message || err}`;
      Logger.error("INGEST", "BILLING_INGEST_ERROR", err, "Ensure Cost Explorer is enabled and the IAM role has ce:GetCostAndUsage.");
      errors.push(msg);
    }

    const inventoryIssues = errors.filter((error) => !error.startsWith("Billing Ingestion")).length
      + (connector.scanIssues?.inventory ?? 0);
    const telemetryIssues = ec2Failed || (connector.scanIssues?.telemetry ?? 0) > 0;
    const sources: SyncSources = {
      inventory: {
        status: inventoryIssues ? (syncedResourceIds.length ? "partial" : "failed")
          : syncedResourceIds.length ? "available" : "no_rows",
        records: syncedResourceIds.length,
        ...(inventoryIssues ? { error: "Some AWS inventory reads or writes failed." } : {}),
      },
      telemetry: {
        status: telemetryIssues ? (cpuRecords ? "partial" : "failed")
          : cpuRecords ? (missingCpu ? "partial" : "available") : "no_rows",
        records: cpuRecords,
        ...(telemetryIssues ? { error: "Some CloudWatch CPU reads failed or could not run." }
          : missingCpu ? { error: "Some running instances had no CPU samples." } : {}),
      },
      billing: {
        status: billing.status === "failed" ? "failed" : billing.storedRows ? "available" : "no_rows",
        records: billing.storedRows,
        ...(billing.status === "failed" ? { error: "Cost Explorer billing could not be refreshed." } : {}),
      },
    };

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
          billing,
          sources,
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
      sources,
    };
  }
}
