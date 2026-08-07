export interface MockEC2Instance {
  InstanceId: string;
  InstanceType: string;
  State: string; // "running" | "stopped"
  Region: string;
  LaunchTime: string;
  CpuUtilizationSeries: number[]; // 7 days of daily average CPU %
  Tags: { Key: string; Value: string }[];
  MonthlyCost: number;
}

export interface MockEBSVolume {
  VolumeId: string;
  Size: number; // GB
  State: string; // "in-use" | "available"
  Region: string;
  VolumeType: string; // "gp3" | "gp2" | "io2"
  CreateTime: string;
  AttachmentInstanceId?: string;
  Tags: { Key: string; Value: string }[];
  MonthlyCost: number;
}

export interface MockElasticIP {
  PublicIp: string;
  AllocationId: string;
  AssociationId?: string;
  Region: string;
  Tags: { Key: string; Value: string }[];
  MonthlyCost: number;
}

export interface MockCostExplorerRow {
  Date: string;
  Service: string;
  Cost: number;
}

export class AwsMockSimulator {
  private static instances: MockEC2Instance[] = [
    {
      InstanceId: "i-0123456789abcdef0",
      InstanceType: "t3.medium",
      State: "running",
      Region: "us-east-1",
      LaunchTime: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
      CpuUtilizationSeries: [42.1, 45.3, 40.8, 48.9, 44.2, 46.1, 45.0],
      Tags: [
        { Key: "Name", Value: "prod-web-server" },
        { Key: "Environment", Value: "production" },
        { Key: "Owner", Value: "WebTeam" }
      ],
      MonthlyCost: 30.34
    },
    {
      InstanceId: "i-0abcdef1234567890",
      InstanceType: "m5.large",
      State: "running",
      Region: "us-east-1",
      LaunchTime: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
      CpuUtilizationSeries: [1.2, 0.8, 1.5, 1.1, 0.9, 1.3, 1.0], // IDLE! CPU < 5%
      Tags: [
        { Key: "Name", Value: "staging-processor" },
        { Key: "Environment", Value: "staging" },
        { Key: "Owner", Value: "BatchTeam" }
      ],
      MonthlyCost: 69.35
    },
    {
      InstanceId: "i-0987654321fedcba0",
      InstanceType: "t3.large",
      State: "stopped",
      Region: "us-west-2",
      LaunchTime: new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString(),
      CpuUtilizationSeries: [0, 0, 0, 0, 0, 0, 0],
      Tags: [
        { Key: "Name", Value: "dev-analytics-db" },
        { Key: "Environment", Value: "dev" },
        { Key: "Owner", Value: "DataTeam" }
      ],
      MonthlyCost: 0.00 // Stopped compute costs $0 (only EBS bills)
    }
  ];

  private static volumes: MockEBSVolume[] = [
    {
      VolumeId: "vol-0123456789abcdef0",
      Size: 100,
      State: "in-use",
      Region: "us-east-1",
      VolumeType: "gp3",
      CreateTime: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
      AttachmentInstanceId: "i-0123456789abcdef0",
      Tags: [{ Key: "Name", Value: "prod-web-root" }],
      MonthlyCost: 8.00 // gp3 $0.08/GB
    },
    {
      VolumeId: "vol-0abcdef1234567890",
      Size: 200,
      State: "in-use",
      Region: "us-east-1",
      VolumeType: "gp3",
      CreateTime: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
      AttachmentInstanceId: "i-0abcdef1234567890",
      Tags: [{ Key: "Name", Value: "staging-processor-scratch" }],
      MonthlyCost: 16.00
    },
    {
      VolumeId: "vol-0987654321fedcba0",
      Size: 500,
      State: "available", // UNATTACHED!
      Region: "us-west-2",
      VolumeType: "gp3",
      CreateTime: new Date(Date.now() - 45 * 24 * 3600 * 1000).toISOString(),
      Tags: [
        { Key: "Name", Value: "deprecated-backup" },
        { Key: "Owner", Value: "OpsTeam" },
        { Key: "Environment", Value: "dev" }
      ],
      MonthlyCost: 40.00 //gp3 $0.08/GB * 500 = $40
    }
  ];

  private static elasticIps: MockElasticIP[] = [
    {
      PublicIp: "54.210.12.34",
      AllocationId: "eipalloc-0123456789abcdef0",
      AssociationId: "eipassoc-0123456789abcdef0", // Associated
      Region: "us-east-1",
      Tags: [{ Key: "Name", Value: "prod-web-ip" }],
      MonthlyCost: 0.00 // Standard associated IP is free
    },
    {
      PublicIp: "54.210.99.88",
      AllocationId: "eipalloc-0abcdef1234567890",
      AssociationId: undefined, // UNASSOCIATED!
      Region: "us-east-1",
      Tags: [
        { Key: "Owner", Value: "OpsTeam" },
        { Key: "Environment", Value: "staging" }
      ],
      MonthlyCost: 3.60 // Unassociated IP is charged ~$0.005/hr (~$3.60/month)
    }
  ];

  /**
   * Retrieves simulated resources from the AWS mock.
   */
  static getEC2Instances(): MockEC2Instance[] {
    return this.instances;
  }

  static getEBSVolumes(): MockEBSVolume[] {
    return this.volumes;
  }

  static getElasticIPs(): MockElasticIP[] {
    return this.elasticIps;
  }

  /**
   * Returns Cost Explorer billing totals reconciled with individual resources.
   * Also injects some background service costs (RDS, NAT Gateway, etc.).
   */
  static getCostExplorer(startDate: string, endDate: string): MockCostExplorerRow[] {
    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().slice(0, 10));
    }

    const rows: MockCostExplorerRow[] = [];
    
    // Inbound resources base costs / 30
    const ec2Daily = (30.34 + 69.35) / 30; // $3.32
    const ebsDaily = (8.00 + 16.00 + 40.00) / 30; // $2.13
    const eipDaily = 3.60 / 30; // $0.12

    dates.forEach(date => {
      // EC2 Compute cost
      rows.push({ Date: date, Service: "AmazonEC2", Cost: parseFloat((ec2Daily + Math.random() * 0.1).toFixed(2)) });
      // EBS Storage cost
      rows.push({ Date: date, Service: "AmazonEBS", Cost: parseFloat((ebsDaily).toFixed(2)) });
      // VPC Networking (Elastic IP) cost
      rows.push({ Date: date, Service: "AmazonVPC", Cost: parseFloat((eipDaily).toFixed(2)) });
      // Fixed databases RDS cost (simulated background cost)
      rows.push({ Date: date, Service: "AmazonRDS", Cost: parseFloat((4.50 + Math.random() * 0.2).toFixed(2)) });
    });

    return rows;
  }
}
