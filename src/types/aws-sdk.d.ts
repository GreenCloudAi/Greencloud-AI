// Ambient module declarations to resolve IDE warnings when node_modules is not yet populated
declare module "@aws-sdk/client-sts" {
  export class STSClient {
    constructor(config: any);
    send(command: any): Promise<any>;
  }
  export class AssumeRoleCommand {
    constructor(input: any);
  }
}

declare module "@aws-sdk/client-ec2" {
  export class EC2Client {
    constructor(config: any);
    send(command: any): Promise<any>;
  }
  export class DescribeInstancesCommand {
    constructor(input: any);
  }
  export class DescribeVolumesCommand {
    constructor(input: any);
  }
  export class DescribeAddressesCommand {
    constructor(input: any);
  }
}

declare module "@aws-sdk/client-cost-explorer" {
  export class CostExplorerClient {
    constructor(config: any);
    send(command: any): Promise<any>;
  }
  export class GetCostAndUsageCommand {
    constructor(input: any);
  }
}
