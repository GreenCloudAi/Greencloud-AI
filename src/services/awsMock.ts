export interface MockTag {
  Key: string;
  Value: string;
}

export interface MockEC2Instance {
  InstanceId: string;
  InstanceType: string;
  State: string;
  Region: string;
  LaunchTime: string;
  CpuUtilizationSeries: number[];
  Tags: MockTag[];
  MonthlyCost: number;
}

export interface MockEBSVolume {
  VolumeId: string;
  Size: number;
  State: string;
  Region: string;
  VolumeType: string;
  CreateTime: string;
  AttachmentInstanceId?: string;
  Tags: MockTag[];
  MonthlyCost: number;
}

export interface MockElasticIP {
  PublicIp: string;
  AllocationId: string;
  AssociationId?: string;
  Region: string;
  Tags: MockTag[];
  MonthlyCost: number;
}

export interface MockCostExplorerRow {
  Date: string;
  Service: string;
  Cost: number;
}

export class AwsMockSimulator {
  static getEC2Instances(): MockEC2Instance[] {
    return [
      {
        InstanceId: "i-0a1b2c3d4e5f6789a",
        InstanceType: "m5.large",
        State: "running",
        Region: "us-east-1",
        LaunchTime: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
        CpuUtilizationSeries: [3.2, 4.1, 2.8, 3.9, 4.5, 3.1, 2.9],
        Tags: [
          { Key: "Name", Value: "legacy-analytics-worker" },
          { Key: "Environment", Value: "staging" },
          { Key: "Owner", Value: "data-team" }
        ],
        MonthlyCost: 69.36
      },
      {
        InstanceId: "i-0987654321fedcba0",
        InstanceType: "c5.xlarge",
        State: "running",
        Region: "us-east-1",
        LaunchTime: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
        CpuUtilizationSeries: [12.4, 15.1, 14.2, 13.8, 16.0, 14.5, 13.9],
        Tags: [
          { Key: "Name", Value: "api-backend-node" },
          { Key: "Environment", Value: "production" },
          { Key: "Owner", Value: "core-engineering" }
        ],
        MonthlyCost: 124.10
      }
    ];
  }

  static getEBSVolumes(): MockEBSVolume[] {
    return [
      {
        VolumeId: "vol-0123456789abcdef0",
        Size: 100,
        State: "available", // Unattached idle disk!
        Region: "us-east-1",
        VolumeType: "gp3",
        CreateTime: new Date(Date.now() - 45 * 24 * 3600 * 1000).toISOString(),
        AttachmentInstanceId: undefined,
        Tags: [
          { Key: "Name", Value: "old-backup-temp" },
          { Key: "Environment", Value: "dev" }
        ],
        MonthlyCost: 8.00
      }
    ];
  }

  static getElasticIPs(): MockElasticIP[] {
    return [
      {
        PublicIp: "54.210.12.99",
        AllocationId: "eipalloc-0a1b2c3d4e",
        AssociationId: undefined, // Unassociated EIP!
        Region: "us-east-1",
        Tags: [
          { Key: "Name", Value: "unused-staging-ip" }
        ],
        MonthlyCost: 3.60
      }
    ];
  }

  static getCostExplorer(startDate: string, endDate: string): MockCostExplorerRow[] {
    return [
      { Date: startDate, Service: "Amazon EC2", Cost: 193.46 },
      { Date: startDate, Service: "Amazon EBS", Cost: 8.00 },
      { Date: startDate, Service: "Amazon VPC Elastic IP", Cost: 3.60 }
    ];
  }
}
