export type CloudProviderId = "aws" | "gcp" | "azure";

export interface RegionInfo {
  region: string;
  provider: CloudProviderId;
  name: string;
  country: string;
  gridIntensity: number; // gCO2e / kWh
  mix: string;
  carbonStatus: "Ultra Clean" | "Clean" | "Moderate" | "High Carbon";
}

export const CLOUD_REGION_CATALOG: Record<string, RegionInfo> = {
  // AWS Regions
  "us-east-1": { region: "us-east-1", provider: "aws", name: "US East (N. Virginia)", country: "United States", gridIntensity: 420, mix: "Gas & Coal", carbonStatus: "Moderate" },
  "us-east-2": { region: "us-east-2", provider: "aws", name: "US East (Ohio)", country: "United States", gridIntensity: 410, mix: "Coal & Gas", carbonStatus: "Moderate" },
  "us-west-1": { region: "us-west-1", provider: "aws", name: "US West (N. California)", country: "United States", gridIntensity: 210, mix: "Solar & Gas", carbonStatus: "Clean" },
  "us-west-2": { region: "us-west-2", provider: "aws", name: "US West (Oregon)", country: "United States", gridIntensity: 80, mix: "Hydro & Wind", carbonStatus: "Ultra Clean" },
  "ca-central-1": { region: "ca-central-1", provider: "aws", name: "Canada (Central)", country: "Canada", gridIntensity: 120, mix: "Hydro & Nuclear", carbonStatus: "Clean" },
  "eu-west-1": { region: "eu-west-1", provider: "aws", name: "Europe (Ireland)", country: "Ireland", gridIntensity: 310, mix: "Wind & Gas", carbonStatus: "Moderate" },
  "eu-west-2": { region: "eu-west-2", provider: "aws", name: "Europe (London)", country: "United Kingdom", gridIntensity: 220, mix: "Wind & Nuclear", carbonStatus: "Clean" },
  "eu-west-3": { region: "eu-west-3", provider: "aws", name: "Europe (Paris)", country: "France", gridIntensity: 75, mix: "Nuclear & Hydro", carbonStatus: "Ultra Clean" },
  "eu-central-1": { region: "eu-central-1", provider: "aws", name: "Europe (Frankfurt)", country: "Germany", gridIntensity: 340, mix: "Wind, Coal & Solar", carbonStatus: "Moderate" },
  "eu-north-1": { region: "eu-north-1", provider: "aws", name: "Europe (Stockholm)", country: "Sweden", gridIntensity: 45, mix: "Hydro & Nuclear", carbonStatus: "Ultra Clean" },
  "ap-south-1": { region: "ap-south-1", provider: "aws", name: "Asia Pacific (Mumbai)", country: "India", gridIntensity: 680, mix: "Thermal & Solar", carbonStatus: "High Carbon" },
  "ap-south-2": { region: "ap-south-2", provider: "aws", name: "Asia Pacific (Hyderabad)", country: "India", gridIntensity: 660, mix: "Thermal & Solar", carbonStatus: "High Carbon" },
  "ap-southeast-1": { region: "ap-southeast-1", provider: "aws", name: "Asia Pacific (Singapore)", country: "Singapore", gridIntensity: 480, mix: "Natural Gas", carbonStatus: "High Carbon" },
  "ap-southeast-2": { region: "ap-southeast-2", provider: "aws", name: "Asia Pacific (Sydney)", country: "Australia", gridIntensity: 560, mix: "Coal & Solar", carbonStatus: "High Carbon" },
  "ap-northeast-1": { region: "ap-northeast-1", provider: "aws", name: "Asia Pacific (Tokyo)", country: "Japan", gridIntensity: 470, mix: "LNG & Coal", carbonStatus: "High Carbon" },
  "ap-northeast-2": { region: "ap-northeast-2", provider: "aws", name: "Asia Pacific (Seoul)", country: "South Korea", gridIntensity: 460, mix: "Nuclear & Coal", carbonStatus: "High Carbon" },
  "ap-northeast-3": { region: "ap-northeast-3", provider: "aws", name: "Asia Pacific (Osaka)", country: "Japan", gridIntensity: 390, mix: "Nuclear & LNG", carbonStatus: "Moderate" },
  "sa-east-1": { region: "sa-east-1", provider: "aws", name: "South America (Sao Paulo)", country: "Brazil", gridIntensity: 110, mix: "Hydroelectric", carbonStatus: "Clean" },

  // GCP Regions
  "us-central1": { region: "us-central1", provider: "gcp", name: "Iowa (us-central1)", country: "United States", gridIntensity: 394, mix: "Wind & Coal", carbonStatus: "Moderate" },
  "europe-west1": { region: "europe-west1", provider: "gcp", name: "Belgium (europe-west1)", country: "Belgium", gridIntensity: 148, mix: "Nuclear & Wind", carbonStatus: "Clean" },
  "europe-north1": { region: "europe-north1", provider: "gcp", name: "Finland (europe-north1)", country: "Finland", gridIntensity: 62, mix: "Hydro, Nuclear & Wind", carbonStatus: "Ultra Clean" },
  "northamerica-northeast1": { region: "northamerica-northeast1", provider: "gcp", name: "Montreal (northamerica-northeast1)", country: "Canada", gridIntensity: 24, mix: "Hydroelectric", carbonStatus: "Ultra Clean" },
  "asia-south1": { region: "asia-south1", provider: "gcp", name: "Mumbai (asia-south1)", country: "India", gridIntensity: 675, mix: "Thermal & Solar", carbonStatus: "High Carbon" },

  // Azure Regions
  "eastus": { region: "eastus", provider: "azure", name: "East US (Virginia)", country: "United States", gridIntensity: 385, mix: "Gas & Nuclear", carbonStatus: "Moderate" },
  "westus2": { region: "westus2", provider: "azure", name: "West US 2 (Washington)", country: "United States", gridIntensity: 78, mix: "Hydro & Wind", carbonStatus: "Ultra Clean" },
  "swedencentral": { region: "swedencentral", provider: "azure", name: "Sweden Central", country: "Sweden", gridIntensity: 42, mix: "Hydro & Nuclear", carbonStatus: "Ultra Clean" },
  "westeurope": { region: "westeurope", provider: "azure", name: "West Europe (Netherlands)", country: "Netherlands", gridIntensity: 280, mix: "Wind & Gas", carbonStatus: "Moderate" },
  "centralindia": { region: "centralindia", provider: "azure", name: "Central India (Pune)", country: "India", gridIntensity: 690, mix: "Thermal & Solar", carbonStatus: "High Carbon" },
};

export function getRegionMeta(region: string, providerHint: CloudProviderId = "aws"): RegionInfo {
  const found = CLOUD_REGION_CATALOG[region];
  if (found) return found;
  return {
    region,
    provider: providerHint,
    name: region,
    country: "Global",
    gridIntensity: 350,
    mix: "Regional Grid",
    carbonStatus: "Moderate",
  };
}

/**
 * Normalizes provider-specific service strings into CNCF FOCUS ServiceCategory buckets.
 */
export function normalizeFocusServiceCategory(serviceName: string): string {
  const s = serviceName.toLowerCase();
  if (
    s.includes("ec2") ||
    s.includes("compute") ||
    s.includes("virtual machine") ||
    s.includes("lambda") ||
    s.includes("ecs") ||
    s.includes("eks") ||
    s.includes("kubernetes") ||
    s.includes("app engine") ||
    s.includes("functions")
  ) {
    return "Compute";
  }
  if (
    s.includes("ebs") ||
    s.includes("s3") ||
    s.includes("storage") ||
    s.includes("disk") ||
    s.includes("blob") ||
    s.includes("filestore") ||
    s.includes("glacier")
  ) {
    return "Storage";
  }
  if (
    s.includes("rds") ||
    s.includes("sql") ||
    s.includes("dynamo") ||
    s.includes("database") ||
    s.includes("cosmos") ||
    s.includes("bigquery") ||
    s.includes("spanner") ||
    s.includes("redshift")
  ) {
    return "Database";
  }
  if (
    s.includes("vpc") ||
    s.includes("network") ||
    s.includes("nat") ||
    s.includes("elb") ||
    s.includes("load balanc") ||
    s.includes("cloudfront") ||
    s.includes("cdn") ||
    s.includes("route 53") ||
    s.includes("dns")
  ) {
    return "Network";
  }
  return "Platform";
}

export function normalizeProviderId(raw?: string | null): CloudProviderId {
  const v = (raw || "aws").toLowerCase().trim();
  if (v.includes("gcp") || v.includes("google")) return "gcp";
  if (v.includes("azure") || v.includes("microsoft")) return "azure";
  return "aws";
}
