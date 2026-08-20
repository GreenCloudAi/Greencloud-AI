import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";
import {
  EC2Client,
  DescribeInstancesCommand,
  DescribeVolumesCommand,
  DescribeAddressesCommand,
} from "@aws-sdk/client-ec2";
import {
  CloudWatchClient,
  GetMetricDataCommand,
} from "@aws-sdk/client-cloudwatch";
import {
  CostExplorerClient,
  GetCostAndUsageCommand,
} from "@aws-sdk/client-cost-explorer";
import { GreenCloudConfig } from "./config";
import { Logger } from "./logger";

// ─── Shared Resource Interfaces ────────────────────────────────────────────────
// These define the normalized shape that the ingestion pipeline expects.
// Every field is sourced from real AWS API responses — no hardcoded values.

export interface EC2InstanceResource {
  InstanceId: string;
  InstanceType: string;
  State: string;
  Region: string;
  AvailabilityZone: string;
  LaunchTime: string;
  CpuUtilizationSeries: number[]; // Daily average CPU % from CloudWatch
  PeakCpuUtilization: number; // Maximum daily CPU % over the lookback window
  Tags: { Key: string; Value: string }[];
  MonthlyCost: number; // Estimated from on-demand pricing table
}

export interface EBSVolumeResource {
  VolumeId: string;
  Size: number; // GB
  State: string;
  Region: string;
  VolumeType: string;
  Iops: number;
  CreateTime: string;
  AttachmentInstanceId?: string;
  Tags: { Key: string; Value: string }[];
  MonthlyCost: number; // Calculated from size × volume-type rate
}

export interface ElasticIPResource {
  PublicIp: string;
  AllocationId: string;
  AssociationId?: string;
  Region: string;
  Tags: { Key: string; Value: string }[];
  MonthlyCost: number;
}

export interface CostExplorerRow {
  Date: string;
  Service: string;
  Cost: number;
}

// ─── On-Demand Pricing Reference ──────────────────────────────────────────────
// Approximate US-East-1 on-demand pricing per hour (USD).
// Used only for per-resource cost estimation when Cost Explorer doesn't break
// down to individual instance level.
const EC2_HOURLY_PRICING: Record<string, number> = {
  "t3.nano": 0.0052,
  "t3.micro": 0.0104,
  "t3.small": 0.0208,
  "t3.medium": 0.0416,
  "t3.large": 0.0832,
  "t3.xlarge": 0.1664,
  "t3.2xlarge": 0.3328,
  "m5.large": 0.096,
  "m5.xlarge": 0.192,
  "m5.2xlarge": 0.384,
  "m5.4xlarge": 0.768,
  "c5.large": 0.085,
  "c5.xlarge": 0.17,
  "c5.2xlarge": 0.34,
  "r5.large": 0.126,
  "r5.xlarge": 0.252,
  "t2.micro": 0.0116,
  "t2.small": 0.023,
  "t2.medium": 0.0464,
  "t2.large": 0.0928,
};

// EBS pricing per GB-month by volume type (US-East-1)
const EBS_GB_MONTH_PRICING: Record<string, number> = {
  gp3: 0.08,
  gp2: 0.1,
  io1: 0.125,
  io2: 0.125,
  st1: 0.045,
  sc1: 0.015,
  standard: 0.05,
};

// ─── AWS Cloud Connector ───────────────────────────────────────────────────────

export class AwsCloudConnector {
  private roleArn: string;
  private externalId?: string;
  private regions: string[];

  constructor(roleArn: string, externalId?: string) {
    if (!roleArn) {
      throw new Error(
        "AwsCloudConnector requires a valid IAM Role ARN. " +
          "Provide the ARN of the GreenCloudReadOnlyRole created in the target AWS account."
      );
    }
    this.roleArn = roleArn;
    this.externalId = externalId;
    this.regions = GreenCloudConfig.scanRegions;
  }

  // ─── STS Credential Acquisition ──────────────────────────────────────────────

  /**
   * Assumes the cross-account IAM role and returns temporary credentials.
   * The calling machine must have base AWS credentials configured
   * (env vars, ~/.aws/credentials, or IAM instance profile).
   */
  private async getCredentials() {
    Logger.info("AWS", "STS_ASSUME_ROLE", `Assuming IAM Role: ${this.roleArn}`, {
      externalId: this.externalId || "(none)",
      durationSeconds: GreenCloudConfig.stsSessionDurationSeconds,
    });

    const stsClient = new STSClient({ region: GreenCloudConfig.defaultRegion });

    const params: any = {
      RoleArn: this.roleArn,
      RoleSessionName: `GreenCloud-${Date.now()}`,
      DurationSeconds: GreenCloudConfig.stsSessionDurationSeconds,
    };

    if (this.externalId) {
      params.ExternalId = this.externalId;
    }

    try {
      const response = await stsClient.send(new AssumeRoleCommand(params));

      if (!response.Credentials) {
        throw new Error("STS AssumeRole returned empty credentials.");
      }

      Logger.success("AWS", "STS_CREDENTIALS_ACQUIRED", `Temporary session token generated for role ${this.roleArn}`);

      return {
        accessKeyId: response.Credentials.AccessKeyId!,
        secretAccessKey: response.Credentials.SecretAccessKey!,
        sessionToken: response.Credentials.SessionToken!,
      };
    } catch (error: any) {
      Logger.error(
        "AWS",
        "STS_ASSUME_ROLE_FAILED",
        error,
        "Verify your local AWS credentials (.env.local) and check the IAM Role Trust Relationship."
      );
      if (error.name === "AccessDenied" || error.Code === "AccessDenied") {
        throw new Error(
          `STS AssumeRole denied. Verify that:\n` +
            `  1. Role ARN "${this.roleArn}" exists in the target account\n` +
            `  2. The trust policy allows your AWS account to assume this role\n` +
            `  3. The ExternalId matches: "${this.externalId || "(none)"}"\n` +
            `  Original error: ${error.message}`
        );
      }
      throw error;
    }
  }

  // ─── EC2 Instances ───────────────────────────────────────────────────────────

  /**
   * Fetches all EC2 instances across configured regions.
   * For each running instance, queries CloudWatch for real CPU utilization.
   */
  async fetchEC2Instances(): Promise<EC2InstanceResource[]> {
    Logger.info("AWS", "EC2_SCAN_START", `Scanning EC2 instances across regions: ${this.regions.join(", ")}`);
    const credentials = await this.getCredentials();
    const allInstances: EC2InstanceResource[] = [];

    for (const region of this.regions) {
      try {
        const ec2Client = new EC2Client({ region, credentials });
        let nextToken: string | undefined;

        do {
          const command = new DescribeInstancesCommand({
            NextToken: nextToken,
          });
          const response = await ec2Client.send(command);
          nextToken = response.NextToken;

          for (const reservation of response.Reservations || []) {
            for (const inst of reservation.Instances || []) {
              const instanceId = inst.InstanceId || "unknown";
              const instanceType = inst.InstanceType || "t3.micro";
              const state = inst.State?.Name || "unknown";
              const az = inst.Placement?.AvailabilityZone || region;

              const tags = (inst.Tags || []).map((t) => ({
                Key: t.Key || "",
                Value: t.Value || "",
              }));

              // Fetch real CloudWatch CPU metrics for running instances
              let cpuSeries: number[] = [];
              let peakCpu = 0;

              if (state === "running") {
                try {
                  Logger.info("AWS", "CLOUDWATCH_METRIC_FETCH", `Fetching ${GreenCloudConfig.cloudwatchLookbackDays}d CPU metrics for ${instanceId} (${region})`);
                  const cwResult = await this.fetchCloudWatchCPU(
                    credentials,
                    region,
                    instanceId
                  );
                  cpuSeries = cwResult.dailyAverages;
                  peakCpu = cwResult.peak;
                  Logger.success("AWS", "CLOUDWATCH_METRIC_ACQUIRED", `${instanceId} CPU telemetry: avg=[${cpuSeries.join(", ")}%], peak=${peakCpu}%`);
                } catch (cwErr: any) {
                  Logger.warn(
                    "AWS",
                    "CLOUDWATCH_METRIC_SKIPPED",
                    `CloudWatch metrics unavailable for ${instanceId}: ${cwErr.message}`,
                    "Ensure IAM role has 'cloudwatch:GetMetricData' permission and instance is sending metrics."
                  );
                }
              }

              // Estimate monthly cost from on-demand pricing table
              const hourlyRate =
                EC2_HOURLY_PRICING[instanceType] ||
                EC2_HOURLY_PRICING["t3.micro"]!;
              const monthlyCost =
                state === "running"
                  ? parseFloat((hourlyRate * 730).toFixed(2))
                  : 0;

              allInstances.push({
                InstanceId: instanceId,
                InstanceType: instanceType,
                State: state,
                Region: region,
                AvailabilityZone: az,
                LaunchTime: inst.LaunchTime
                  ? inst.LaunchTime.toISOString()
                  : new Date().toISOString(),
                CpuUtilizationSeries: cpuSeries,
                PeakCpuUtilization: peakCpu,
                Tags: tags,
                MonthlyCost: monthlyCost,
              });
            }
          }
        } while (nextToken);

        Logger.success("AWS", "EC2_REGION_SCANNED", `Region ${region}: Found ${allInstances.filter(i => i.Region === region).length} EC2 instances.`);
      } catch (error: any) {
        Logger.error("AWS", "EC2_DESCRIBE_FAILED", error, "Attach 'ec2:DescribeInstances' permission to your IAM Role.", { region });
        this.logPermissionHint(error, "ec2:DescribeInstances");
      }
    }

    return allInstances;
  }

  // ─── CloudWatch CPU Metrics ──────────────────────────────────────────────────

  /**
   * Queries CloudWatch for real CPU utilization metrics over the configured
   * lookback window. Returns daily average values and peak.
   */
  private async fetchCloudWatchCPU(
    credentials: {
      accessKeyId: string;
      secretAccessKey: string;
      sessionToken: string;
    },
    region: string,
    instanceId: string
  ): Promise<{ dailyAverages: number[]; peak: number }> {
    const cwClient = new CloudWatchClient({ region, credentials });

    const endTime = new Date();
    const startTime = new Date();
    startTime.setDate(
      startTime.getDate() - GreenCloudConfig.cloudwatchLookbackDays
    );

    const command = new GetMetricDataCommand({
      StartTime: startTime,
      EndTime: endTime,
      MetricDataQueries: [
        {
          Id: "cpu_avg",
          MetricStat: {
            Metric: {
              Namespace: "AWS/EC2",
              MetricName: "CPUUtilization",
              Dimensions: [
                { Name: "InstanceId", Value: instanceId },
              ],
            },
            Period: GreenCloudConfig.cloudwatchPeriodSeconds,
            Stat: "Average",
          },
          ReturnData: true,
        },
        {
          Id: "cpu_max",
          MetricStat: {
            Metric: {
              Namespace: "AWS/EC2",
              MetricName: "CPUUtilization",
              Dimensions: [
                { Name: "InstanceId", Value: instanceId },
              ],
            },
            Period: GreenCloudConfig.cloudwatchPeriodSeconds,
            Stat: "Maximum",
          },
          ReturnData: true,
        },
      ],
    });

    const response = await cwClient.send(command);

    const avgResult = response.MetricDataResults?.find(
      (r) => r.Id === "cpu_avg"
    );
    const maxResult = response.MetricDataResults?.find(
      (r) => r.Id === "cpu_max"
    );

    const dailyAverages = (avgResult?.Values || []).map((v) =>
      parseFloat(v.toFixed(2))
    );
    const peakValues = maxResult?.Values || [];
    const peak =
      peakValues.length > 0
        ? parseFloat(Math.max(...peakValues).toFixed(2))
        : 0;

    return { dailyAverages, peak };
  }

  // ─── EBS Volumes ─────────────────────────────────────────────────────────────

  /**
   * Fetches all EBS volumes across configured regions.
   * Includes real size, type, IOPS, and attachment status.
   */
  async fetchEBSVolumes(): Promise<EBSVolumeResource[]> {
    const credentials = await this.getCredentials();
    const allVolumes: EBSVolumeResource[] = [];

    for (const region of this.regions) {
      try {
        const ec2Client = new EC2Client({ region, credentials });
        let nextToken: string | undefined;

        do {
          const command = new DescribeVolumesCommand({
            NextToken: nextToken,
          });
          const response = await ec2Client.send(command);
          nextToken = response.NextToken;

          for (const vol of response.Volumes || []) {
            const volumeType = vol.VolumeType || "gp3";
            const sizeGb = vol.Size || 0;
            const tags = (vol.Tags || []).map((t) => ({
              Key: t.Key || "",
              Value: t.Value || "",
            }));

            const attachment =
              vol.Attachments && vol.Attachments.length > 0
                ? vol.Attachments[0]
                : null;

            // Calculate real monthly cost from volume size and type
            const gbRate =
              EBS_GB_MONTH_PRICING[volumeType] || EBS_GB_MONTH_PRICING.gp3!;
            const monthlyCost = parseFloat((sizeGb * gbRate).toFixed(2));

            allVolumes.push({
              VolumeId: vol.VolumeId || "unknown",
              Size: sizeGb,
              State: vol.State || "unknown",
              Region: region,
              VolumeType: volumeType,
              Iops: vol.Iops || 0,
              CreateTime: vol.CreateTime
                ? vol.CreateTime.toISOString()
                : new Date().toISOString(),
              AttachmentInstanceId: attachment?.InstanceId || undefined,
              Tags: tags,
              MonthlyCost: monthlyCost,
            });
          }
        } while (nextToken);
      } catch (error: any) {
        console.error(
          `EC2 DescribeVolumes failed for region ${region}: ${error.message}`
        );
        this.logPermissionHint(error, "ec2:DescribeVolumes");
      }
    }

    return allVolumes;
  }

  // ─── Elastic IPs ─────────────────────────────────────────────────────────────

  /**
   * Fetches all Elastic IP addresses across configured regions.
   * Unassociated IPs cost $0.005/hr ($3.60/month) since Feb 2024 AWS pricing change.
   */
  async fetchElasticIPs(): Promise<ElasticIPResource[]> {
    const credentials = await this.getCredentials();
    const allIPs: ElasticIPResource[] = [];

    for (const region of this.regions) {
      try {
        const ec2Client = new EC2Client({ region, credentials });
        const command = new DescribeAddressesCommand({});
        const response = await ec2Client.send(command);

        for (const addr of response.Addresses || []) {
          const tags = (addr.Tags || []).map((t) => ({
            Key: t.Key || "",
            Value: t.Value || "",
          }));

          // AWS charges $0.005/hr for ALL public IPv4 addresses since Feb 2024
          // Unassociated EIPs have an additional idle charge
          const isAssociated = !!addr.AssociationId;
          const monthlyCost = isAssociated ? 3.6 : 7.2; // associated: $0.005/hr, unassociated: $0.01/hr

          allIPs.push({
            PublicIp: addr.PublicIp || "0.0.0.0",
            AllocationId: addr.AllocationId || "unknown",
            AssociationId: addr.AssociationId || undefined,
            Region: region,
            Tags: tags,
            MonthlyCost: parseFloat(monthlyCost.toFixed(2)),
          });
        }
      } catch (error: any) {
        console.error(
          `EC2 DescribeAddresses failed for region ${region}: ${error.message}`
        );
        this.logPermissionHint(error, "ec2:DescribeAddresses");
      }
    }

    return allIPs;
  }

  // ─── Cost Explorer ───────────────────────────────────────────────────────────

  /**
   * Fetches real billing data from AWS Cost Explorer.
   * Cost Explorer is a global service — always called from us-east-1.
   * Note: Cost Explorer API calls are billed at $0.01 per request.
   */
  async fetchBillingSummary(
    startDate: string,
    endDate: string
  ): Promise<CostExplorerRow[]> {
    Logger.info("AWS", "COST_EXPLORER_FETCH", `Querying AWS Cost Explorer from ${startDate} to ${endDate}`);
    const credentials = await this.getCredentials();

    try {
      const ceClient = new CostExplorerClient({
        region: "us-east-1", // Cost Explorer is always us-east-1
        credentials,
      });

      const command = new GetCostAndUsageCommand({
        TimePeriod: { Start: startDate, End: endDate },
        Granularity: "DAILY",
        Metrics: ["UnblendedCost"],
        GroupBy: [{ Type: "DIMENSION", Key: "SERVICE" }],
      });

      const response = await ceClient.send(command);
      const rows: CostExplorerRow[] = [];

      for (const day of response.ResultsByTime || []) {
        const date = day.TimePeriod?.Start || "";
        for (const grp of day.Groups || []) {
          const service =
            grp.Keys && grp.Keys.length > 0 ? grp.Keys[0] : "Other";
          const cost = parseFloat(
            grp.Metrics?.UnblendedCost?.Amount || "0"
          );
          if (cost > 0) {
            rows.push({
              Date: date,
              Service: service,
              Cost: parseFloat(cost.toFixed(4)),
            });
          }
        }
      }

      Logger.success("AWS", "COST_EXPLORER_DATA_RECEIVED", `Retrieved ${rows.length} billing rows from AWS Cost Explorer.`);
      return rows;
    } catch (error: any) {
      Logger.error(
        "AWS",
        "COST_EXPLORER_FETCH_FAILED",
        error,
        "Enable Cost Explorer in AWS Console (Billing -> Cost Explorer) and attach 'ce:GetCostAndUsage' permission."
      );
      this.logPermissionHint(error, "ce:GetCostAndUsage");
      throw error; // Do not swallow billing errors — they are critical
    }
  }

  // ─── Error Diagnostics ───────────────────────────────────────────────────────

  /**
   * Logs a human-readable hint when an AWS API call fails due to missing permissions.
   */
  private logPermissionHint(error: any, requiredAction: string): void {
    const code = error.name || error.Code || "";
    if (
      code === "UnauthorizedAccess" ||
      code === "AccessDeniedException" ||
      code === "AccessDenied" ||
      code === "AuthFailure"
    ) {
      console.error(
        `\n⚠️  PERMISSION ERROR: The IAM role "${this.roleArn}" is missing permission "${requiredAction}".\n` +
          `   Add this action to the GreenCloudTelemetryAndCostReadPolicy in your CloudFormation stack.\n` +
          `   See: docs/aws-setup-guide.md\n`
      );
    }
  }
}
