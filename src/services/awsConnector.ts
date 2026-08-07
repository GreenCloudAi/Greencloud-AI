import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";
import { EC2Client, DescribeInstancesCommand, DescribeVolumesCommand, DescribeAddressesCommand } from "@aws-sdk/client-ec2";
import { CostExplorerClient, GetCostAndUsageCommand } from "@aws-sdk/client-cost-explorer";
import { AwsMockSimulator, MockEC2Instance, MockEBSVolume, MockElasticIP, MockCostExplorerRow } from "./awsMock";

export class AwsCloudConnector {
  private roleArn?: string;
  private externalId?: string;
  private isMockMode: boolean = true;

  constructor(roleArn?: string, externalId?: string) {
    if (roleArn) {
      this.roleArn = roleArn;
      this.externalId = externalId;
      this.isMockMode = false;
    }
  }

  /**
   * Helper to retrieve temporary credentials by assuming the cross-account role.
   */
  private async getCredentials() {
    if (this.isMockMode || !this.roleArn) {
      throw new Error("Cannot assume role in mock mode");
    }

    const stsClient = new STSClient({ region: "us-east-1" });
    const command = new AssumeRoleCommand({
      RoleArn: this.roleArn,
      RoleSessionName: "GreenCloudSyncSession",
      ExternalId: this.externalId,
      DurationSeconds: 900 // 15 mins least privilege
    });

    const response = await stsClient.send(command);
    if (!response.Credentials) {
      throw new Error("STS AssumeRole returned empty credentials");
    }

    return {
      accessKeyId: response.Credentials.AccessKeyId!,
      secretAccessKey: response.Credentials.SecretAccessKey!,
      sessionToken: response.Credentials.SessionToken!
    };
  }

  /**
   * Fetches EC2 instances. Fallback to mock on any failures.
   */
  async fetchEC2Instances(): Promise<MockEC2Instance[]> {
    if (this.isMockMode) {
      return AwsMockSimulator.getEC2Instances();
    }

    try {
      const credentials = await this.getCredentials();
      const ec2Client = new EC2Client({ region: "us-east-1", credentials });
      const command = new DescribeInstancesCommand({});
      const response = await ec2Client.send(command);

      const list: MockEC2Instance[] = [];
      const reservations = response.Reservations || [];

      for (const res of reservations) {
        const instances = res.Instances || [];
        for (const inst of instances) {
          // Simplistic mapping for the SDK output
          const tags = (inst.Tags || []).map((t: { Key?: string; Value?: string }) => ({ Key: t.Key || "", Value: t.Value || "" }));
          const env = tags.find((t: { Key: string; Value: string }) => t.Key.toLowerCase() === "environment")?.Value || "unknown";
          
          list.push({
            InstanceId: inst.InstanceId || "unknown",
            InstanceType: inst.InstanceType || "t3.micro",
            State: inst.State?.Name || "stopped",
            Region: "us-east-1",
            LaunchTime: inst.LaunchTime ? inst.LaunchTime.toISOString() : new Date().toISOString(),
            CpuUtilizationSeries: inst.State?.Name === "running" ? [15, 12, 18, 14, 13, 11, 14] : [0, 0, 0, 0, 0, 0, 0],
            Tags: tags,
            MonthlyCost: inst.InstanceType === "m5.large" ? 69.35 : 30.34
          });
        }
      }
      return list;
    } catch (error) {
      console.warn("Failed to fetch live AWS EC2 instances, falling back to mock mode:", error);
      return AwsMockSimulator.getEC2Instances();
    }
  }

  /**
   * Fetches EBS volumes. Fallback to mock on failures.
   */
  async fetchEBSVolumes(): Promise<MockEBSVolume[]> {
    if (this.isMockMode) {
      return AwsMockSimulator.getEBSVolumes();
    }

    try {
      const credentials = await this.getCredentials();
      const ec2Client = new EC2Client({ region: "us-east-1", credentials });
      const command = new DescribeVolumesCommand({});
      const response = await ec2Client.send(command);

      const list: MockEBSVolume[] = [];
      const volumes = response.Volumes || [];

      for (const vol of volumes) {
        const tags = (vol.Tags || []).map((t: { Key?: string; Value?: string }) => ({ Key: t.Key || "", Value: t.Value || "" }));
        const attachment = vol.Attachments && vol.Attachments.length > 0 ? vol.Attachments[0] : null;

        list.push({
          VolumeId: vol.VolumeId || "unknown",
          Size: vol.Size || 8,
          State: vol.State || "available",
          Region: "us-east-1",
          VolumeType: vol.VolumeType || "gp3",
          CreateTime: vol.CreateTime ? vol.CreateTime.toISOString() : new Date().toISOString(),
          AttachmentInstanceId: attachment?.InstanceId || undefined,
          Tags: tags,
          MonthlyCost: (vol.Size || 8) * 0.08
        });
      }
      return list;
    } catch (error) {
      console.warn("Failed to fetch live AWS EBS volumes, falling back to mock mode:", error);
      return AwsMockSimulator.getEBSVolumes();
    }
  }

  /**
   * Fetches Elastic IPs. Fallback to mock on failures.
   */
  async fetchElasticIPs(): Promise<MockElasticIP[]> {
    if (this.isMockMode) {
      return AwsMockSimulator.getElasticIPs();
    }

    try {
      const credentials = await this.getCredentials();
      const ec2Client = new EC2Client({ region: "us-east-1", credentials });
      const command = new DescribeAddressesCommand({});
      const response = await ec2Client.send(command);

      const list: MockElasticIP[] = [];
      const addresses = response.Addresses || [];

      for (const addr of addresses) {
        const tags = (addr.Tags || []).map((t: { Key?: string; Value?: string }) => ({ Key: t.Key || "", Value: t.Value || "" }));
        list.push({
          PublicIp: addr.PublicIp || "0.0.0.0",
          AllocationId: addr.AllocationId || "unknown",
          AssociationId: addr.AssociationId || undefined,
          Region: "us-east-1",
          Tags: tags,
          MonthlyCost: addr.AssociationId ? 0 : 3.60
        });
      }
      return list;
    } catch (error) {
      console.warn("Failed to fetch live AWS Elastic IPs, falling back to mock mode:", error);
      return AwsMockSimulator.getElasticIPs();
    }
  }

  /**
   * Fetches billing totals from AWS Cost Explorer. Fallback to mock.
   */
  async fetchBillingSummary(startDate: string, endDate: string): Promise<MockCostExplorerRow[]> {
    if (this.isMockMode) {
      return AwsMockSimulator.getCostExplorer(startDate, endDate);
    }

    try {
      const credentials = await this.getCredentials();
      const ceClient = new CostExplorerClient({ region: "us-east-1", credentials });
      const command = new GetCostAndUsageCommand({
        TimePeriod: { Start: startDate, End: endDate },
        Granularity: "DAILY",
        Metrics: ["UnblendedCost"],
        GroupBy: [{ Type: "DIMENSION", Key: "SERVICE" }]
      });

      const response = await ceClient.send(command);
      const results = response.ResultsByTime || [];
      const rows: MockCostExplorerRow[] = [];

      for (const day of results) {
        const date = day.TimePeriod?.Start || "";
        const groups = day.Groups || [];
        for (const grp of groups) {
          const service = grp.Keys && grp.Keys.length > 0 ? grp.Keys[0] : "Other";
          const cost = parseFloat(grp.Metrics?.UnblendedCost?.Amount || "0");
          rows.push({ Date: date, Service: service, Cost: parseFloat(cost.toFixed(2)) });
        }
      }
      return rows;
    } catch (error) {
      console.warn("Failed to fetch live Cost Explorer data, falling back to mock mode:", error);
      return AwsMockSimulator.getCostExplorer(startDate, endDate);
    }
  }
}
