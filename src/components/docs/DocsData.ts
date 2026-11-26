export type ProviderDocId = "aws" | "gcp" | "azure";

export interface DocNavSection {
  id: string;
  label: string;
  icon: string;
}

export interface CodeBlockSpec {
  id: string;
  filename: string;
  language: string;
  code: string;
}

export interface ProviderSetupGuide {
  id: ProviderDocId;
  name: string;
  shortName: string;
  statusLabel: string;
  statusBg: string;
  statusInk: string;
  iconSrc: string;
  summary: string;
  authMethod: string;
  billingSource: string;
  metricsSource: string;
  optimizationChecklist: string[];
  steps: {
    num: string;
    title: string;
    detail: string;
    codeBlock?: CodeBlockSpec;
  }[];
}

export interface SecurityControl {
  title: string;
  detail: string;
  icon: string;
  shape: "sunny" | "clover" | "flower" | "cookie9";
  shapeColor: string;
  iconInk: string;
}

export interface TroubleshootingItem {
  symptom: string;
  cause: string;
  resolution: string;
}

export const DOC_NAV_SECTIONS: DocNavSection[] = [
  { id: "quickstart", label: "Quickstart", icon: "rocket_launch" },
  { id: "providers", label: "Cloud Providers", icon: "cloud_sync" },
  { id: "terraform", label: "Terraform Workflow", icon: "code" },
  { id: "methodology", label: "Cost & Carbon Math", icon: "calculate" },
  { id: "security", label: "Security & IAM", icon: "verified_user" },
  { id: "troubleshooting", label: "API & Troubleshooting", icon: "build" },
];

export const QUICKSTART_STEPS = [
  {
    num: "01",
    title: "Choose a cloud provider",
    desc: "Start with read-only AWS IAM Role delegation today, or configure Google Cloud and Microsoft Azure connectors.",
    shape: "sunny" as const,
    shapeColor: "text-[#FFE985]",
    numInk: "text-[#524305]",
  },
  {
    num: "02",
    title: "Enable billing & guest metrics",
    desc: "Activate resource-level billing exports alongside CPU, memory agent telemetry, and regional carbon feeds.",
    shape: "clover" as const,
    shapeColor: "text-[#FBE0BC]",
    numInk: "text-[#6B4814]",
  },
  {
    num: "03",
    title: "Tag ownership & environments",
    desc: "Ensure Owner and Environment tags or labels are present so dev shutdowns never touch production.",
    shape: "flower" as const,
    shapeColor: "text-[#CEECE0]",
    numInk: "text-[#155E4B]",
  },
  {
    num: "04",
    title: "Sync, review & verify",
    desc: "Review ranked savings and carbon diffs, apply Terraform PRs in Git, and verify post-change billing outcomes.",
    shape: "cookie9" as const,
    shapeColor: "text-[#EAE0BE]",
    numInk: "text-[#2E2B1A]",
  },
];

export const PROVIDER_GUIDES: Record<ProviderDocId, ProviderSetupGuide> = {
  aws: {
    id: "aws",
    name: "Amazon Web Services",
    shortName: "AWS",
    statusLabel: "Production connector",
    statusBg: "bg-[#E2F5EF]",
    statusInk: "text-[#155E4B]",
    iconSrc: "/icons/aws-dark.svg",
    summary:
      "Connects via cross-account STS AssumeRole with ExternalId validation, ingesting EC2, RDS, EBS, S3, EIP, CloudWatch CPU/memory telemetry, Compute Optimizer baselines, and Cost Explorer / CUR 2.0 billing.",
    authMethod: "Cross-account IAM Role + External ID (STS AssumeRole)",
    billingSource: "AWS Cost Explorer & CUR 2.0 (resource IDs)",
    metricsSource: "CloudWatch + CloudWatch Agent (CPU, RAM, IOPS)",
    optimizationChecklist: [
      "Cost Explorer & CUR 2.0 resource IDs enabled",
      "GreenCloudReadOnlyPolicy attached to role",
      "CloudWatch Agent reporting memory & disk stats",
      "Owner & Environment tags applied to workloads",
    ],
    steps: [
      {
        num: "1",
        title: "Enable AWS Cost Explorer & CUR 2.0 resource IDs",
        detail:
          "Activate Cost Explorer in AWS Billing (takes up to 24 hours) and enable CUR 2.0 with resource IDs so per-instance EC2, RDS, EBS, and Public IPv4 charges attribute cleanly.",
        codeBlock: {
          id: "aws-ce-check",
          filename: "Verify Cost Explorer CLI",
          language: "bash",
          code: `aws ce get-cost-and-usage \\
  --time-period Start=2026-11-01,End=2026-11-26 \\
  --granularity MONTHLY \\
  --metrics "UnblendedCost"`,
        },
      },
      {
        num: "2",
        title: "Create the least-privilege read-only IAM policy",
        detail:
          "Create GreenCloudReadOnlyPolicy with read-only access to Cost Explorer, EC2/EBS/EIP/RDS inventory, CloudWatch metrics, Resource Tagging, and Compute Optimizer.",
        codeBlock: {
          id: "aws-iam-policy",
          filename: "GreenCloudReadOnlyPolicy.json",
          language: "json",
          code: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CostExplorerRead",
      "Effect": "Allow",
      "Action": [
        "ce:GetCostAndUsage",
        "ce:GetCostForecast",
        "ce:GetDimensionValues",
        "ce:GetReservationUtilization",
        "ce:GetTags"
      ],
      "Resource": "*"
    },
    {
      "Sid": "InfraInventoryRead",
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeInstances",
        "ec2:DescribeVolumes",
        "ec2:DescribeAddresses",
        "ec2:DescribeRegions",
        "ec2:DescribeSnapshots",
        "ec2:DescribeTags",
        "ec2:DescribeInstanceTypes",
        "rds:DescribeDBInstances"
      ],
      "Resource": "*"
    },
    {
      "Sid": "CloudWatchMetricsRead",
      "Effect": "Allow",
      "Action": [
        "cloudwatch:GetMetricData",
        "cloudwatch:GetMetricStatistics",
        "cloudwatch:ListMetrics"
      ],
      "Resource": "*"
    },
    {
      "Sid": "TaggingAndComputeOptimizerRead",
      "Effect": "Allow",
      "Action": [
        "sts:GetCallerIdentity",
        "tag:GetResources",
        "compute-optimizer:GetEC2InstanceRecommendations",
        "compute-optimizer:GetEBSVolumeRecommendations"
      ],
      "Resource": "*"
    }
  ]
}`,
        },
      },
      {
        num: "3",
        title: "Deploy the cross-account IAM Role with ExternalId",
        detail:
          "Deploy GreenCloudReadOnlyRole via CloudFormation so GreenCloud assumes short-lived STS tokens guarded by sts:ExternalId.",
        codeBlock: {
          id: "aws-cfn-deploy",
          filename: "Deploy via CloudFormation",
          language: "bash",
          code: `aws cloudformation deploy \\
  --template-file infra/cloudformation.template.json \\
  --stack-name GreenCloudReadOnlyRoleStack \\
  --parameter-overrides \\
    GreenCloudTenantExternalId=greencloud-prod-tenant \\
    GreenCloudAccountId=YOUR_AWS_ACCOUNT_ID \\
  --capabilities CAPABILITY_NAMED_IAM`,
        },
      },
      {
        num: "4",
        title: "Enable CloudWatch Agent memory metrics & Compute Optimizer",
        detail:
          "Default EC2 metrics exclude host RAM. Enable CloudWatch Agent memory collection and AWS Compute Optimizer so GreenCloud has verified memory headroom before suggesting smaller instance types.",
        codeBlock: {
          id: "aws-cw-agent",
          filename: "Enable Compute Optimizer & CW Agent",
          language: "bash",
          code: `# Opt in to AWS Compute Optimizer
aws compute-optimizer update-enrollment-status --status Active

# Configure CloudWatch Agent memory metric (mem_used_percent) on EC2
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \\
  -a fetch-config -m ec2 -s -c ssm:AmazonCloudWatch-linux`,
        },
      },
      {
        num: "5",
        title: "Apply Owner & Environment tags, then connect",
        detail:
          "Tag workloads with Owner and Environment (dev, staging, prod) so safety rules distinguish non-prod auto-shutdown candidates from critical production nodes, then link the Role ARN in Onboarding.",
        codeBlock: {
          id: "aws-tags",
          filename: "Tag resources for safe policy checks",
          language: "bash",
          code: `aws ec2 create-tags \\
  --resources i-0a883e2 \\
  --tags Key=Environment,Value=development Key=Owner,Value=platform-team`,
        },
      },
    ],
  },
  gcp: {
    id: "gcp",
    name: "Google Cloud Platform",
    shortName: "Google Cloud",
    statusLabel: "Connector specification",
    statusBg: "bg-[#E6F0FE]",
    statusInk: "text-[#174EA6]",
    iconSrc: "/icons/gcp.svg",
    summary:
      "Uses keyless Workload Identity Federation (OIDC), BigQuery detailed billing and Carbon Footprint exports, Cloud Monitoring Ops Agent RAM metrics, and Recommender API insights.",
    authMethod: "Workload Identity Federation (OIDC, zero JSON keys)",
    billingSource: "BigQuery Detailed Usage Cost + Carbon Footprint Export",
    metricsSource: "Cloud Monitoring API + Ops Agent (CPU, RAM, disk)",
    optimizationChecklist: [
      "Compute, Monitoring, BigQuery & Recommender APIs active",
      "BigQuery Detailed Billing & Carbon exports enabled",
      "Workload Identity Federation OIDC pool configured",
      "Cloud Ops Agent reporting guest memory & env/owner labels",
    ],
    steps: [
      {
        num: "1",
        title: "Enable required Google Cloud APIs",
        detail:
          "Activate Compute Engine, Cloud Monitoring, BigQuery, and Recommender APIs across target projects so inventory, telemetry, and baseline sizing signals are readable.",
        codeBlock: {
          id: "gcp-apis",
          filename: "Enable GCP APIs",
          language: "bash",
          code: `gcloud services enable \\
  compute.googleapis.com \\
  monitoring.googleapis.com \\
  bigquery.googleapis.com \\
  recommender.googleapis.com`,
        },
      },
      {
        num: "2",
        title: "Enable BigQuery Detailed Billing & Carbon Footprint exports",
        detail:
          "In Cloud Billing -> Billing export, turn on Detailed usage cost export and Carbon Footprint export into a dedicated BigQuery dataset for per-VM, GKE, and Cloud SQL attribution.",
        codeBlock: {
          id: "gcp-bq-check",
          filename: "Verify BigQuery billing & carbon tables",
          language: "bash",
          code: `bq ls --project_id=YOUR_BILLING_PROJECT billing_export`,
        },
      },
      {
        num: "3",
        title: "Configure Workload Identity Federation & read-only IAM",
        detail:
          "Avoid exported JSON service account keys. Bind strictly read-only viewer roles to the federated service account for monitoring, BigQuery billing reads, and Recommender insights.",
        codeBlock: {
          id: "gcp-iam",
          filename: "Grant read-only IAM bindings",
          language: "bash",
          code: `gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \\
  --member="serviceAccount:greencloud-reader@YOUR_PROJECT_ID.iam.gserviceaccount.com" \\
  --role="roles/monitoring.viewer"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \\
  --member="serviceAccount:greencloud-reader@YOUR_PROJECT_ID.iam.gserviceaccount.com" \\
  --role="roles/bigquery.dataViewer"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \\
  --member="serviceAccount:greencloud-reader@YOUR_PROJECT_ID.iam.gserviceaccount.com" \\
  --role="roles/recommender.computeViewer"`,
        },
      },
      {
        num: "4",
        title: "Install Cloud Ops Agent for host memory visibility",
        detail:
          "Install Google Cloud Ops Agent on Compute Engine instances so memory utilization (agent.googleapis.com/memory/percent_used) is available alongside CPU before any machine-type downsize.",
        codeBlock: {
          id: "gcp-ops-agent",
          filename: "Install Ops Agent on Compute Engine",
          language: "bash",
          code: `curl -sSO https://dl.google.com/cloudagents/add-google-cloud-ops-agent-repo.sh
sudo bash add-google-cloud-ops-agent-repo.sh --also-install`,
        },
      },
      {
        num: "5",
        title: "Apply environment & owner labels for safe filtering",
        detail:
          "Label VMs, disks, and Cloud SQL instances with env and owner so GreenCloud separates non-production schedules from production SLA workloads.",
        codeBlock: {
          id: "gcp-labels",
          filename: "Label GCP instances",
          language: "bash",
          code: `gcloud compute instances add-labels dev-worker-01 \\
  --zone=us-central1-a \\
  --labels=env=development,owner=platform-team`,
        },
      },
    ],
  },
  azure: {
    id: "azure",
    name: "Microsoft Azure",
    shortName: "Azure",
    statusLabel: "Connector specification",
    statusBg: "bg-[#E0F2FE]",
    statusInk: "text-[#004E8C]",
    iconSrc: "/icons/azure.svg",
    summary:
      "Connects via Microsoft Entra ID federated OIDC credentials with read-only RBAC across Subscriptions, ingesting daily FOCUS Cost Management exports, Azure Monitor VM Insights, Azure Advisor, and Emissions Impact data.",
    authMethod: "Microsoft Entra ID (Federated OIDC, zero client secrets)",
    billingSource: "Azure Cost Management Daily FOCUS Export",
    metricsSource: "Azure Monitor Metrics + VM Insights (CPU, RAM, IOPS)",
    optimizationChecklist: [
      "Entra ID App with Reader & Cost Management Reader RBAC",
      "Daily amortized FOCUS cost export configured",
      "Azure Monitor Agent / VM Insights collecting memory",
      "Owner & Environment resource tags applied",
    ],
    steps: [
      {
        num: "1",
        title: "Assign read-only Entra ID RBAC roles",
        detail:
          "Register an Entra ID Application with federated OIDC credentials and assign strictly read-only Reader, Cost Management Reader, and Monitoring Reader roles at Subscription scope.",
        codeBlock: {
          id: "azure-rbac",
          filename: "Assign Azure RBAC roles",
          language: "bash",
          code: `az role assignment create \\
  --assignee "<APP_CLIENT_ID>" \\
  --role "Cost Management Reader" \\
  --scope "/subscriptions/<SUBSCRIPTION_ID>"

az role assignment create \\
  --assignee "<APP_CLIENT_ID>" \\
  --role "Monitoring Reader" \\
  --scope "/subscriptions/<SUBSCRIPTION_ID>"

az role assignment create \\
  --assignee "<APP_CLIENT_ID>" \\
  --role "Reader" \\
  --scope "/subscriptions/<SUBSCRIPTION_ID>"`,
        },
      },
      {
        num: "2",
        title: "Configure daily FOCUS Cost Management export",
        detail:
          "Enable daily amortized FOCUS cost exports in Azure Cost Management to a storage container so VM, Managed Disk, SQL, and Public IP costs map cleanly to resource IDs.",
        codeBlock: {
          id: "azure-export",
          filename: "Verify Cost Management Export",
          language: "bash",
          code: `az costmanagement export list \\
  --scope "/subscriptions/<SUBSCRIPTION_ID>"`,
        },
      },
      {
        num: "3",
        title: "Enable Azure Monitor Agent & VM Insights for RAM",
        detail:
          "Host memory metrics require Azure Monitor Agent / VM Insights. Enable guest performance collection so GreenCloud checks Available MBytes before proposing VM SKU downsizes.",
        codeBlock: {
          id: "azure-ama",
          filename: "Enable Azure Monitor Agent extension",
          language: "bash",
          code: `az vm extension set \\
  --name AzureMonitorLinuxAgent \\
  --publisher Microsoft.Azure.Monitor \\
  --vm-name dev-api-vm \\
  --resource-group rg-greencloud-dev`,
        },
      },
      {
        num: "4",
        title: "Enable Azure Advisor & Carbon Optimization scope",
        detail:
          "Grant read access to Azure Advisor recommendations and Azure Carbon Optimization (Emissions Impact) so regional carbon intensity and SKU efficiency stay aligned.",
        codeBlock: {
          id: "azure-advisor",
          filename: "Check Azure Advisor cost recommendations",
          language: "bash",
          code: `az advisor recommendation list --category Cost --output table`,
        },
      },
      {
        num: "5",
        title: "Tag subscriptions & resource groups for safety rules",
        detail:
          "Apply Environment and Owner tags so GreenCloud enforces strict production guardrails and routes unowned assets to human review first.",
        codeBlock: {
          id: "azure-tags",
          filename: "Tag Azure resource groups",
          language: "bash",
          code: `az tag create \\
  --resource-id "/subscriptions/<SUBSCRIPTION_ID>/resourceGroups/rg-greencloud-dev" \\
  --tags Environment=development Owner=platform-team`,
        },
      },
    ],
  },
};

export const TERRAFORM_EXAMPLE_BLOCK: CodeBlockSpec = {
  id: "tf-rightsize-rds",
  filename: "infra/rds-staging.tf",
  language: "hcl",
  code: `# Generated by GreenCloud AI for human PR review
resource "aws_db_instance" "staging_postgres" {
  identifier        = "staging-postgres-db"
  instance_class    = "db.t4g.medium" # Downsized from db.m5.xlarge (30d peak RAM < 10%)
  allocated_storage = 100

  tags = {
    ManagedBy    = "terraform"
    GreenCloudId = "rec-rds-staging-01"
  }
}`,
};

export const SECURITY_CONTROLS: SecurityControl[] = [
  {
    title: "Read-only by default",
    detail:
      "Ingestion roles hold describe and metrics read permissions only. Production servers, databases, and disks are never modified automatically.",
    icon: "visibility",
    shape: "sunny",
    shapeColor: "text-[#FFE985]",
    iconInk: "text-[#524305]",
  },
  {
    title: "External ID protection",
    detail:
      "Every cross-account STS AssumeRole handshake enforces a tenant-specific sts:ExternalId condition to prevent confused-deputy access.",
    icon: "key",
    shape: "clover",
    shapeColor: "text-[#FBE0BC]",
    iconInk: "text-[#6B4814]",
  },
  {
    title: "Zero committed secrets",
    detail:
      "Use OIDC federation, IRSA, or IAM Roles in production rather than static keys. Local development credentials stay strictly in ignored .env.local files.",
    icon: "lock",
    shape: "flower",
    shapeColor: "text-[#CEECE0]",
    iconInk: "text-[#155E4B]",
  },
  {
    title: "Immutable audit ledger",
    detail:
      "Every account link, telemetry sync, recommendation approval, and Terraform export is recorded with actor and timestamp in Audit History.",
    icon: "history",
    shape: "cookie9",
    shapeColor: "text-[#EAE0BE]",
    iconInk: "text-[#2E2B1A]",
  },
];

export const API_ENDPOINTS = [
  {
    method: "GET / POST",
    path: "/api/cloud-accounts",
    purpose: "List connected cloud accounts (sanitized) or register a new read-only IAM Role connection.",
  },
  {
    method: "GET",
    path: "/api/dashboard",
    purpose: "Fetch normalized spend, utilization metrics, carbon totals, and ranked optimization items.",
  },
  {
    method: "POST",
    path: "/api/recommendations/[id]/approve",
    purpose: "Record human approval and export reviewable Terraform or Markdown change artifacts.",
  },
  {
    method: "GET",
    path: "/api/audit-logs",
    purpose: "Query the chronological ledger of sync runs, approvals, and configuration changes.",
  },
];

export const TROUBLESHOOTING_ITEMS: TroubleshootingItem[] = [
  {
    symptom: "Cost Explorer returns empty or disabled error",
    cause: "AWS Cost Explorer was not activated 24 hours prior, or billing permissions are missing on the role.",
    resolution:
      "Open AWS Billing -> Cost Explorer to activate it, wait up to 24 hours, and confirm ce:GetCostAndUsage is in GreenCloudReadOnlyPolicy.",
  },
  {
    symptom: "STS AssumeRole fails with AccessDenied",
    cause: "Trust policy Account ID or sts:ExternalId does not match the value entered in Onboarding.",
    resolution:
      "Verify the exact 12-digit Account ID, Role ARN, and External ID string match the CloudFormation stack parameters.",
  },
  {
    symptom: "Memory utilization shows as missing on EC2, GCP, or Azure",
    cause: "Guest memory metrics require CloudWatch Agent (AWS), Ops Agent (GCP), or Azure Monitor Agent.",
    resolution:
      "Install the provider guest agent for RAM metrics; until then, GreenCloud withholds memory-sensitive downsizes safely.",
  },
  {
    symptom: "Post-change savings show pending after deploy",
    cause: "Cloud billing exports take 24 to 72 hours to settle recent resource changes.",
    resolution:
      "Wait for the current-period billing refresh before running matched pre/post verification windows.",
  },
];
