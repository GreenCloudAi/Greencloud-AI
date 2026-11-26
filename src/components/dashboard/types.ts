export type DashboardTab = "overview" | "costs" | "carbon" | "resources" | "actions";
export type TimeWindow = "7d" | "30d" | "90d";
export type RoleFilter =
  | "admin"
  | "finops"
  | "devops"
  | "architect"
  | "sustainability"
  | "viewer";
export type CloudProviderId = "aws" | "gcp" | "azure";

export interface CloudAccountSummary {
  id: string;
  provider: CloudProviderId;
  externalAccountId: string;
  name: string;
  primaryRegion?: string;
  roleArn?: string | null;
  hasEncryptedCredentials?: boolean;
  syncFreshness?: string | null;
  status?: string;
  syncError?: string | null;
  canSync?: boolean;
  sync?: {
    status: string;
    attemptedAt: string;
    sources: Record<string, { status: string; records: number; lastSuccess?: string | null; error?: string }>;
  } | null;
  providerConfig?: string | null;
}

export interface Ec2ResourceItem {
  id: string;
  cloudAccountId: string;
  accountName: string;
  provider: CloudProviderId;
  providerResourceId: string;
  name: string;
  region: string;
  regionName: string;
  gridIntensity: number;
  instanceType: string;
  lifecycleState: string;
  monthlyCost: number;
  avgCpu: number | null;
  peakCpu: number | null;
  cpuSeries: number[];
  tags: Array<{ Key: string; Value: string }>;
  carbonEmissions: Array<{
    energyKwh: number;
    operationalGco2e: number;
    embodiedGco2e: number;
  }>;
}

export interface EbsResourceItem {
  id: string;
  cloudAccountId: string;
  accountName: string;
  provider: CloudProviderId;
  providerResourceId: string;
  region: string;
  regionName: string;
  sizeGb: number;
  volumeType: string;
  lifecycleState: string;
  monthlyCost: number;
}

export interface EipResourceItem {
  id: string;
  cloudAccountId: string;
  accountName: string;
  provider: CloudProviderId;
  providerResourceId: string;
  region: string;
  publicIp: string;
  lifecycleState: string;
  monthlyCost: number;
}

export interface RegionSummaryItem {
  region: string;
  name: string;
  provider: CloudProviderId;
  gridIntensity: number;
  ec2Count: number;
  ebsCount: number;
  eipCount: number;
  resourceCount: number;
  accountCount: number;
  monthlyCost: number;
  operationalGco2e: number;
}

export interface RecommendationItem {
  id: string;
  title: string;
  category: string;
  description?: string;
  terraformHcl?: string;
  estimatedMonthlySavings: number;
  estimatedGco2eSavings: number;
  riskScore: number;
  status: string;
  evidence?: string;
  accountName: string;
  provider: CloudProviderId;
  resource?: {
    providerResourceId: string;
    region: string;
    resourceType: string;
  };
}

export interface AnomalyItem {
  id: string;
  date: string;
  dimension: string;
  entityName: string;
  actualCost: number;
  expectedBaseline: number;
  deviationPercent: number;
  zScore: number;
  severity: string;
  rootCauseHint: string;
  recommendedAction: string;
}

export interface ForecastPoint {
  date: string;
  actualCost?: number | null;
  projectedCost?: number | null;
  predictedCost?: number;
  lowerBoundCost?: number;
  upperBoundCost?: number;
  actualCarbon?: number | null;
  projectedCarbon?: number | null;
  predictedCarbonGco2e?: number;
  isForecast?: boolean;
}

export interface AccountComparisonItem {
  id: string;
  name: string;
  provider: CloudProviderId;
  externalAccountId: string;
  monthlySpend: number;
  effectiveCost: number;
  potentialSavings: number;
  operationalCarbonG: number;
  ec2Count: number;
  ebsCount: number;
  eipCount: number;
  resourceCount: number;
  activeRecCount: number;
  avgCpu: number | null;
  lastSyncedAt: string | null;
  billingTotals?: Array<{ currency: string; amount: number }>;
}

export interface ProviderComparisonItem {
  provider: CloudProviderId;
  accountCount: number;
  monthlySpend: number;
  effectiveCost: number;
  potentialSavings: number;
  operationalCarbonG: number;
  resourceCount: number;
  activeRecCount: number;
}

export interface DashboardData {
  accessMode: "scoped" | "local_demo";
  canExportBilling: boolean;
  scope: {
    accountIds: string[];
    providers: CloudProviderId[];
    window: TimeWindow;
    role: RoleFilter;
    isMultiAccount: boolean;
    isMultiProvider: boolean;
  };
  workspaceConfig: {
    monthlyBudget: number;
    functionalUnits: number;
    activeRole: RoleFilter;
  };
  account: CloudAccountSummary | null;
  selectedAccounts: CloudAccountSummary[];
  allAccounts: CloudAccountSummary[];
  resources: {
    total: number;
    ec2: Ec2ResourceItem[];
    ebs: EbsResourceItem[];
    eip: EipResourceItem[];
    byRegion: RegionSummaryItem[];
    runningEc2Count: number;
    stoppedEc2Count: number;
    byState: {
      healthy: number;
      underutilized: number;
      peak: number;
      stopped: number;
    };
  };
  scanCoverage: {
    totalMonitoredRegions: number;
    allMonitoredRegions: string[];
    activeRegionsWithResources: string[];
    activeRegionsWithRunningCompute: string[];
    isMultiRegionRunning: boolean;
  };
  multiRegionAlert: {
    regionsCount: number;
    regions: string[];
    monthlyBurnEstimate: number;
  } | null;
  costs: {
    totalCost: number | null;
    effectiveCostTotal: number | null;
    discountSavings: number;
    dailyBurnRate: number | null;
    priorPeriodCost: number | null;
    byService: Array<{
      service: string;
      category: string;
      provider: CloudProviderId;
      total: number;
    }>;
    dailyTrend: Array<{ date: string; cost: number }>;
    dailyByAccount: Array<Record<string, number | string>>;
    dailyByProvider: Array<{ date: string; aws: number; gcp: number; azure: number }>;
  };
  tagAllocation: {
    hygieneScore: number;
    taggedCount: number;
    untaggedCount: number;
    byEnvironment: Array<{ name: string; count: number; cost: number; percentage: number }>;
    byTeam: Array<{ name: string; count: number; cost: number }>;
  };
  budget: {
    target: number;
    spent: number;
    pacePercentage: number;
    projectedMonthEnd: number;
    status: string;
    riskLevel?: string;
    next30DaysProjected?: number;
    trendVelocity?: number;
  };
  forecast?: {
    trajectory: ForecastPoint[];
    forecastDaysCount: number;
    monthEndProjectedCost: number;
    monthEndProjectedCarbon: number;
    next30DaysProjectedCost: number;
    trendVelocity: number;
    budgetRisk: string;
  };
  anomalies: {
    hasAnomalies: boolean;
    detectedCount: number;
    criticalCount?: number;
    warningCount?: number;
    message: string;
    items: AnomalyItem[];
  };
  carbon: {
    totalOperationalCarbon: number | null;
    totalEmbodiedCarbon: number | null;
    totalCarbon: number | null;
    sciScore: number | null;
    functionalUnits: number;
    cleanGridSharePct: number;
    regionalGrid: Array<{
      region: string;
      name: string;
      provider: CloudProviderId;
      gridIntensity: number;
      mix: string;
      carbonStatus: string;
      resourceCount: number;
      monthlyCost: number;
      estimatedCarbonGco2e: number;
    }>;
  };
  recommendations: {
    items: RecommendationItem[];
    totalSavings: number | null;
    totalCarbonSavings: number | null;
    activeCount: number;
  };
  cpuDistribution: {
    band0_20: number;
    band20_50: number;
    band50_80: number;
    band80_plus: number;
    oversizedCount: number;
    potentialRightsizingSavings: number;
  };
  inventory: {
    ec2Total: number;
    ec2Healthy: number;
    ec2Review: number;
    ebsTotal: number;
    ebsAttached: number;
    ebsIdle: number;
    eipTotal: number;
    eipAssociated: number;
    eipUnused: number;
    activeRegions: string[];
  };
  comparisons: {
    byAccount: AccountComparisonItem[];
    byProvider: ProviderComparisonItem[];
  };
  auditLogs: Array<{
    id: string;
    ts: string;
    actor: string;
    action: string;
    targetType: string;
    targetId: string;
  }>;
}

export const ROLE_META: Record<
  RoleFilter,
  { label: string; summary: string; defaultTab: DashboardTab }
> = {
  admin: {
    label: "Workspace Admin",
    summary: "Cross-account governance, role controls, budgets, and approvals",
    defaultTab: "overview",
  },
  finops: {
    label: "FinOps Engineer",
    summary: "Billed vs. effective cost, commitment savings, budgets, and anomalies",
    defaultTab: "overview",
  },
  devops: {
    label: "DevOps Engineer",
    summary: "Fleet utilization bands, idle compute, storage waste, and Terraform PRs",
    defaultTab: "overview",
  },
  architect: {
    label: "Solutions Architect",
    summary: "Multi-region topology, CPU headroom, and regional carbon trade-offs",
    defaultTab: "overview",
  },
  sustainability: {
    label: "Sustainability Lead",
    summary: "Scope 2 operational + embodied CO2e, grid mix, and live SCI score",
    defaultTab: "overview",
  },
  viewer: {
    label: "Read-Only Viewer",
    summary: "High-level spend, savings, and carbon summary (read-only mode)",
    defaultTab: "overview",
  },
};
