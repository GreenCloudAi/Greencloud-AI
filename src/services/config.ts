/**
 * GreenCloud AI — Centralized Configuration
 * All tunable parameters are driven from environment variables.
 * Never hardcode AWS credentials, regions, or thresholds in service files.
 */

export const GreenCloudConfig = {
  /** AWS regions to scan during ingestion. Comma-separated in env var. */
  scanRegions: (process.env.GREENCLOUD_SCAN_REGIONS || "us-east-1")
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean),

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
} as const;

export type GreenCloudConfigType = typeof GreenCloudConfig;
