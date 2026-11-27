/**
 * GreenCloud AI — Centralized Configuration
 * All tunable parameters are driven from environment variables.
 * Never hardcode AWS credentials, regions, or thresholds in service files.
 */

export const GreenCloudConfig = {
  /** AWS regions to scan during ingestion. Comma-separated or 'all' for automatic global discovery. */
  scanRegions: (process.env.GREENCLOUD_SCAN_REGIONS || "all")
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean),

  /** Whether automatic multi-region global discovery is active. */
  isAllRegions: (process.env.GREENCLOUD_SCAN_REGIONS || "all").toLowerCase().trim() === "all",

  /** Default region for STS and Cost Explorer (global services). */
  defaultRegion: process.env.AWS_DEFAULT_REGION || "us-east-1",

  /** CPU utilization percentage below which an EC2 instance is considered idle. */
  idleCpuThreshold: parseFloat(process.env.GREENCLOUD_IDLE_CPU_THRESHOLD || "5.0"),

  /** Number of days of CloudWatch metrics to fetch for CPU/Memory analysis. */
  cloudwatchLookbackDays: parseInt(process.env.GREENCLOUD_CLOUDWATCH_LOOKBACK_DAYS || "7", 10),

  /** CloudWatch metric period in seconds (3600 = hourly, 86400 = daily). */
  cloudwatchPeriodSeconds: parseInt(process.env.GREENCLOUD_CLOUDWATCH_PERIOD_SECONDS || "86400", 10),

  /** Peak CPU threshold below which a rightsizing (downsize) recommendation is generated. */
  rightsizingPeakCpuThreshold: parseFloat(process.env.GREENCLOUD_RIGHTSIZING_PEAK_CPU || "40.0"),

  /** STS AssumeRole session duration in seconds (900–3600). */
  stsSessionDurationSeconds: parseInt(process.env.GREENCLOUD_STS_SESSION_DURATION || "900", 10),

  /** Maximum retries for AWS API calls before giving up. */
  maxRetries: parseInt(process.env.GREENCLOUD_MAX_RETRIES || "3", 10),

  /** Initial delay in ms for exponential backoff between retries. */
  retryBaseDelayMs: parseInt(process.env.GREENCLOUD_RETRY_BASE_DELAY_MS || "1000", 10),

  /** Cross-Cloud Advisor configuration (§14) */
  crossCloud: {
    enabled: (process.env.GREENCLOUD_XC_ENABLED || "true").toLowerCase() !== "false",
    regionMode: (process.env.GREENCLOUD_XC_REGION_MODE || "paired") as "paired" | "same_country" | "same_continent",
    targetPeakUtilizationPct: parseFloat(process.env.GREENCLOUD_XC_TARGET_PEAK || "70"),
    allowArchChange: (process.env.GREENCLOUD_XC_ALLOW_ARM || "false").toLowerCase() === "true",
    maxMemoryOverprovisionRatio: 2,
    shiftMinMonthlyUsd: parseFloat(process.env.GREENCLOUD_XC_MIN_USD || "10"),
    shiftMinPct: parseFloat(process.env.GREENCLOUD_XC_MIN_PCT || "10"),
    shiftMaxPaybackMonths: parseFloat(process.env.GREENCLOUD_XC_MAX_PAYBACK || "6"),
    considerMaxPaybackMonths: 12,
    laborHoursPerVm: parseFloat(process.env.GREENCLOUD_XC_LABOR_HOURS || "8"),
    laborRatePerHour: parseFloat(process.env.GREENCLOUD_XC_LABOR_RATE || "75"),
    archChangeExtraHours: 8,
    parallelRunDays: 3,
    dataToMoveRatio: 1.0,
    defaultRootDiskGb: 30,
    egressFreeGb: { aws: 100, azure: 100 } as Record<"aws" | "azure", number>,
    egressPerGb: {
      aws: { north_america: 0.09, europe: 0.09, asia: 0.109, oceania: 0.114, south_america: 0.15, africa: 0.15, middle_east: 0.11 },
      azure: { north_america: 0.087, europe: 0.087, asia: 0.12, oceania: 0.12, south_america: 0.16, africa: 0.16, middle_east: 0.11 },
    } as Record<"aws" | "azure", Record<string, number>>,
    publicIpMonthly: { aws: 3.65, azure: 3.65 } as Record<"aws" | "azure", number>,
    priceMaxAgeHours: 24,
    greenWeighting: 0,
    carbonPricePerKg: 0.08,
  },
} as const;

export type GreenCloudConfigType = typeof GreenCloudConfig;
