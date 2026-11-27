import { prisma } from "./db";
import { AwsCloudConnector } from "./awsConnector";
import { AzureCloudConnector } from "./azureConnector";
import { CarbonEngine } from "./carbonEngine";
import { GreenCloudConfig } from "./config";
import { Logger } from "./logger";
import { decryptCredential } from "./encryption";
import { syncRegions } from "./pricing/pricingSync";
import { pairedRegion, type Provider } from "./pricing/regionMap";

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

    if (account.provider === "azure") {
      return this.runAzureSync(account);
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
            attachedToResourceId: vol.AttachmentInstanceId || null,
            firstSeenAt: new Date(vol.CreateTime),
            lastSeenAt: syncTime,
          },
          update: {
            lifecycleState: vol.State,
            tags: JSON.stringify(vol.Tags),
            sizeGb: vol.Size,
            monthlyCost: vol.MonthlyCost,
            attachedToResourceId: vol.AttachmentInstanceId || null,
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
      const thirtyDaysAgo = new Date(
        syncTime.getTime() - 30 * 24 * 3600 * 1000
      );
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().slice(0, 10);
      // Cost Explorer End date is exclusive in UTC, so tomorrow ensures today's spend is included
      const tomorrow = new Date(syncTime.getTime() + 24 * 3600 * 1000);
      const tomorrowStr = tomorrow.toISOString().slice(0, 10);

      const billRows = await withRetry(
        () => connector.fetchBillingSummary(thirtyDaysAgoStr, tomorrowStr),
        "Cost Explorer Ingestion"
      );
      Logger.success("INGEST", "BILLING_INGEST_FETCHED", `Retrieved ${billRows.length} FOCUS-normalized cost records.`);

      // Clean up previous cost records for re-sync safety
      await prisma.costLineItem.deleteMany({
        where: { cloudAccountId: this.accountId },
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

    // Best-effort pricing sync for regions discovered during AWS ingestion
    if (isSuccess && syncedResourceIds.length > 0) {
      try {
        const syncedRegions = await prisma.cloudResource.findMany({
          where: { id: { in: syncedResourceIds } },
          select: { region: true },
          distinct: ["region"],
        });
        const targets: Array<{ provider: Provider; region: string }> = [];
        for (const r of syncedRegions) {
          targets.push({ provider: "aws", region: r.region });
          const pair = pairedRegion("aws", r.region);
          if (pair) targets.push({ provider: "azure", region: pair });
        }
        await syncRegions(targets, { maxAgeHours: GreenCloudConfig.crossCloud.priceMaxAgeHours });
      } catch (err: any) {
        Logger.warn("PRICING", "POST_SYNC_PRICING_WARN", err?.message || "Pricing sync skipped");
      }
    }

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

  /**
   * Runs the complete ingestion and normalization workflow for Microsoft Azure
   * using ARM, Azure Monitor, and Azure Cost Management APIs.
   */
  private async runAzureSync(account: any): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];
    const tenantId = account.externalId || account.roleArn;
    const clientId = account.encryptedAccessKey ? decryptCredential(account.encryptedAccessKey) : null;
    const clientSecret = account.encryptedSecretKey ? decryptCredential(account.encryptedSecretKey) : null;

    if (!tenantId || !clientId || !clientSecret) {
      throw new Error(
        `Azure account "${account.name}" is missing Service Principal credentials (Tenant ID, Client ID, or Client Secret).`
      );
    }

    await prisma.cloudAccount.update({
      where: { id: this.accountId },
      data: { status: "syncing" },
    });

    const connector = new AzureCloudConnector(
      account.externalAccountId,
      tenantId,
      clientId,
      clientSecret
    );
    const syncTime = new Date();
    const syncedResourceIds: string[] = [];

    // --- Sub-scan 1: Azure Virtual Machines ---
    try {
      Logger.info("INGEST", "AZURE_VM_START", "Starting Azure Virtual Machines and Azure Monitor telemetry scan...");
      const vms = await withRetry(() => connector.fetchVirtualMachines(), "Azure VM Ingestion");

      for (const vm of vms) {
        const resourceId = `${this.accountId}_azvm_${vm.VmId}`;
        const resource = await prisma.cloudResource.upsert({
          where: { id: resourceId },
          create: {
            id: resourceId,
            cloudAccountId: this.accountId,
            providerResourceId: vm.ResourceId,
            resourceType: "azure_vm",
            region: vm.Region,
            lifecycleState: vm.State,
            tags: JSON.stringify(vm.Tags),
            instanceType: vm.VmSize,
            monthlyCost: vm.MonthlyCost,
            telemetryMetrics: JSON.stringify({
              cpuDailyAverages: vm.CpuUtilizationSeries,
              peakCpu: vm.PeakCpuUtilization,
              lookbackDays: GreenCloudConfig.cloudwatchLookbackDays,
              collectedAt: syncTime.toISOString(),
            }),
            firstSeenAt: new Date(vm.TimeCreated),
            lastSeenAt: syncTime,
          },
          update: {
            lifecycleState: vm.State,
            tags: JSON.stringify(vm.Tags),
            instanceType: vm.VmSize,
            monthlyCost: vm.MonthlyCost,
            telemetryMetrics: JSON.stringify({
              cpuDailyAverages: vm.CpuUtilizationSeries,
              peakCpu: vm.PeakCpuUtilization,
              lookbackDays: GreenCloudConfig.cloudwatchLookbackDays,
              collectedAt: syncTime.toISOString(),
            }),
            lastSeenAt: syncTime,
          },
        });

        syncedResourceIds.push(resource.id);

        const avgCpu =
          vm.CpuUtilizationSeries.length > 0
            ? vm.CpuUtilizationSeries.reduce((a, b) => a + b, 0) / vm.CpuUtilizationSeries.length
            : 0;

        const carbonResult = CarbonEngine.calculateEC2Carbon(vm.VmSize, vm.Region, avgCpu);
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
      const msg = `Azure VM Ingestion failed: ${err.message || err}`;
      Logger.error("INGEST", "AZURE_VM_ERROR", err);
      errors.push(msg);
    }

    // --- Sub-scan 2: Azure Managed Disks ---
    try {
      Logger.info("INGEST", "AZURE_DISK_START", "Starting Azure Managed Disks scan...");
      const disks = await withRetry(() => connector.fetchManagedDisks(), "Azure Disk Ingestion");

      for (const disk of disks) {
        const resourceId = `${this.accountId}_azdisk_${disk.DiskId}`;
        const resource = await prisma.cloudResource.upsert({
          where: { id: resourceId },
          create: {
            id: resourceId,
            cloudAccountId: this.accountId,
            providerResourceId: disk.Name,
            resourceType: "azure_disk",
            region: disk.Region,
            lifecycleState: disk.State,
            tags: JSON.stringify(disk.Tags),
            sizeGb: disk.SizeGb,
            monthlyCost: disk.MonthlyCost,
            attachedToResourceId: disk.ManagedBy || null,
            firstSeenAt: new Date(disk.TimeCreated),
            lastSeenAt: syncTime,
          },
          update: {
            lifecycleState: disk.State,
            tags: JSON.stringify(disk.Tags),
            sizeGb: disk.SizeGb,
            monthlyCost: disk.MonthlyCost,
            attachedToResourceId: disk.ManagedBy || null,
            lastSeenAt: syncTime,
          },
        });

        syncedResourceIds.push(resource.id);

        const carbonResult = CarbonEngine.calculateEBSCarbon(disk.SizeGb, disk.Region);
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
      const msg = `Azure Managed Disk Ingestion failed: ${err.message || err}`;
      Logger.error("INGEST", "AZURE_DISK_ERROR", err);
      errors.push(msg);
    }

    // --- Sub-scan 3: Azure Public IPs ---
    try {
      Logger.info("INGEST", "AZURE_IP_START", "Starting Azure Public IP scan...");
      const ips = await withRetry(() => connector.fetchPublicIPs(), "Azure Public IP Ingestion");

      for (const ip of ips) {
        const resourceId = `${this.accountId}_azip_${ip.Name}`;
        const resource = await prisma.cloudResource.upsert({
          where: { id: resourceId },
          create: {
            id: resourceId,
            cloudAccountId: this.accountId,
            providerResourceId: ip.IpAddress,
            resourceType: "azure_ip",
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
      const msg = `Azure Public IP Ingestion failed: ${err.message || err}`;
      Logger.error("INGEST", "AZURE_IP_ERROR", err);
      errors.push(msg);
    }

    // --- Sub-scan 4: Azure Cost Management ---
    try {
      Logger.info("INGEST", "AZURE_BILLING_START", "Starting Azure Cost Management 30-day billing scan...");
      const thirtyDaysAgo = new Date(syncTime.getTime() - 30 * 24 * 3600 * 1000);
      const startStr = thirtyDaysAgo.toISOString().slice(0, 10);
      const endStr = syncTime.toISOString().slice(0, 10);

      const billRows = await withRetry(
        () => connector.fetchBillingSummary(startStr, endStr),
        "Azure Cost Management Ingestion"
      );

      await prisma.costLineItem.deleteMany({
        where: { cloudAccountId: this.accountId },
      });

      for (const row of billRows) {
        let matchedResourceId: string | null = null;
        const svcLower = row.Service.toLowerCase();
        if (svcLower.includes("virtual machines")) {
          const match = await prisma.cloudResource.findFirst({
            where: { cloudAccountId: this.accountId, resourceType: "azure_vm" },
          });
          if (match) matchedResourceId = match.id;
        } else if (svcLower.includes("storage")) {
          const match = await prisma.cloudResource.findFirst({
            where: { cloudAccountId: this.accountId, resourceType: "azure_disk" },
          });
          if (match) matchedResourceId = match.id;
        } else if (svcLower.includes("network") || svcLower.includes("ip")) {
          const match = await prisma.cloudResource.findFirst({
            where: { cloudAccountId: this.accountId, resourceType: "azure_ip" },
          });
          if (match) matchedResourceId = match.id;
        }

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
      const msg = `Azure Billing Ingestion failed: ${err.message || err}`;
      Logger.error("INGEST", "AZURE_BILLING_ERROR", err);
      errors.push(msg);
    }

    const isSuccess = errors.length < 4;
    const finalStatus = isSuccess ? "active" : "sync_failed";

    // Best-effort pricing sync for regions discovered during Azure ingestion
    if (isSuccess && syncedResourceIds.length > 0) {
      try {
        const syncedRegions = await prisma.cloudResource.findMany({
          where: { id: { in: syncedResourceIds } },
          select: { region: true },
          distinct: ["region"],
        });
        const targets: Array<{ provider: Provider; region: string }> = [];
        for (const r of syncedRegions) {
          targets.push({ provider: "azure", region: r.region });
          const pair = pairedRegion("azure", r.region);
          if (pair) targets.push({ provider: "aws", region: pair });
        }
        await syncRegions(targets, { maxAgeHours: GreenCloudConfig.crossCloud.priceMaxAgeHours });
      } catch (err: any) {
        Logger.warn("PRICING", "POST_SYNC_PRICING_WARN", err?.message || "Pricing sync skipped");
      }
    }

    await prisma.cloudAccount.update({
      where: { id: this.accountId },
      data: {
        status: finalStatus,
        syncFreshness: isSuccess ? syncTime : undefined,
        syncError: errors.length > 0 ? errors.join(" | ") : null,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: this.tenantId,
        actor: "system_ingest",
        action: "sync_completed",
        objectType: "cloud_account",
        objectId: this.accountId,
        metadata: JSON.stringify({
          provider: "azure",
          success: isSuccess,
          syncedResourceCount: syncedResourceIds.length,
          errors,
        }),
      },
    });

    return { success: isSuccess, errors };
  }
}
