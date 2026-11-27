export type Provider = "aws" | "azure";
export type RegionMode = "paired" | "same_country" | "same_continent";
export type Continent =
  | "asia"
  | "europe"
  | "north_america"
  | "south_america"
  | "oceania"
  | "africa"
  | "middle_east";

export interface RegionInfo {
  provider: Provider;
  code: string;
  displayName: string;
  name: string;
  country: string;
  countryCode: string;
  continent: Continent;
  flag: string;
  gridIntensity: number;
  mix: string;
  carbonStatus: string;
}

export const REGION_PAIRS: Array<[aws: string, azure: string]> = [
  ["ap-south-1", "centralindia"],
  ["ap-south-2", "southindia"],
  ["us-east-1", "eastus"],
  ["us-east-2", "eastus2"],
  ["us-west-1", "westus"],
  ["us-west-2", "westus2"],
  ["ca-central-1", "canadacentral"],
  ["eu-west-1", "northeurope"],
  ["eu-west-2", "uksouth"],
  ["eu-west-3", "francecentral"],
  ["eu-central-1", "germanywestcentral"],
  ["eu-north-1", "swedencentral"],
  ["ap-southeast-1", "southeastasia"],
  ["ap-southeast-2", "australiaeast"],
  ["ap-northeast-1", "japaneast"],
  ["ap-northeast-2", "koreacentral"],
  ["sa-east-1", "brazilsouth"],
];

export const REGION_INFO_LIST: RegionInfo[] = [
  // AWS Regions
  { provider: "aws", code: "ap-south-1", displayName: "Mumbai", name: "Asia Pacific (Mumbai)", country: "India", countryCode: "IN", continent: "asia", flag: "🇮🇳", gridIntensity: 680, mix: "Thermal & Solar", carbonStatus: "High Carbon" },
  { provider: "aws", code: "ap-south-2", displayName: "Hyderabad", name: "Asia Pacific (Hyderabad)", country: "India", countryCode: "IN", continent: "asia", flag: "🇮🇳", gridIntensity: 650, mix: "Thermal & Solar", carbonStatus: "High Carbon" },
  { provider: "aws", code: "us-east-1", displayName: "N. Virginia", name: "US East (N. Virginia)", country: "United States", countryCode: "US", continent: "north_america", flag: "🇺🇸", gridIntensity: 420, mix: "Gas & Coal", carbonStatus: "Moderate" },
  { provider: "aws", code: "us-east-2", displayName: "Ohio", name: "US East (Ohio)", country: "United States", countryCode: "US", continent: "north_america", flag: "🇺🇸", gridIntensity: 410, mix: "Coal & Gas", carbonStatus: "Moderate" },
  { provider: "aws", code: "us-west-1", displayName: "N. California", name: "US West (N. California)", country: "United States", countryCode: "US", continent: "north_america", flag: "🇺🇸", gridIntensity: 210, mix: "Solar & Gas", carbonStatus: "Clean" },
  { provider: "aws", code: "us-west-2", displayName: "Oregon", name: "US West (Oregon)", country: "United States", countryCode: "US", continent: "north_america", flag: "🇺🇸", gridIntensity: 80, mix: "Hydro & Wind", carbonStatus: "Ultra Clean" },
  { provider: "aws", code: "ca-central-1", displayName: "Canada Central", name: "Canada (Central)", country: "Canada", countryCode: "CA", continent: "north_america", flag: "🇨🇦", gridIntensity: 120, mix: "Hydro & Nuclear", carbonStatus: "Clean" },
  { provider: "aws", code: "eu-central-1", displayName: "Frankfurt", name: "Europe (Frankfurt)", country: "Germany", countryCode: "DE", continent: "europe", flag: "🇩🇪", gridIntensity: 340, mix: "Wind, Coal & Solar", carbonStatus: "Moderate" },
  { provider: "aws", code: "eu-west-1", displayName: "Ireland", name: "Europe (Ireland)", country: "Ireland", countryCode: "IE", continent: "europe", flag: "🇮🇪", gridIntensity: 310, mix: "Wind & Gas", carbonStatus: "Moderate" },
  { provider: "aws", code: "eu-west-2", displayName: "London", name: "Europe (London)", country: "United Kingdom", countryCode: "GB", continent: "europe", flag: "🇬🇧", gridIntensity: 220, mix: "Wind & Nuclear", carbonStatus: "Clean" },
  { provider: "aws", code: "eu-west-3", displayName: "Paris", name: "Europe (Paris)", country: "France", countryCode: "FR", continent: "europe", flag: "🇫🇷", gridIntensity: 75, mix: "Nuclear & Hydro", carbonStatus: "Ultra Clean" },
  { provider: "aws", code: "eu-north-1", displayName: "Stockholm", name: "Europe (Stockholm)", country: "Sweden", countryCode: "SE", continent: "europe", flag: "🇸🇪", gridIntensity: 45, mix: "Hydro & Nuclear", carbonStatus: "Ultra Clean" },
  { provider: "aws", code: "ap-southeast-1", displayName: "Singapore", name: "Asia Pacific (Singapore)", country: "Singapore", countryCode: "SG", continent: "asia", flag: "🇸🇬", gridIntensity: 480, mix: "Natural Gas", carbonStatus: "High Carbon" },
  { provider: "aws", code: "ap-southeast-2", displayName: "Sydney", name: "Asia Pacific (Sydney)", country: "Australia", countryCode: "AU", continent: "oceania", flag: "🇦🇺", gridIntensity: 560, mix: "Coal & Solar", carbonStatus: "High Carbon" },
  { provider: "aws", code: "ap-northeast-1", displayName: "Tokyo", name: "Asia Pacific (Tokyo)", country: "Japan", countryCode: "JP", continent: "asia", flag: "🇯🇵", gridIntensity: 470, mix: "LNG & Coal", carbonStatus: "High Carbon" },
  { provider: "aws", code: "ap-northeast-2", displayName: "Seoul", name: "Asia Pacific (Seoul)", country: "South Korea", countryCode: "KR", continent: "asia", flag: "🇰🇷", gridIntensity: 460, mix: "Nuclear & Coal", carbonStatus: "High Carbon" },
  { provider: "aws", code: "ap-northeast-3", displayName: "Osaka", name: "Asia Pacific (Osaka)", country: "Japan", countryCode: "JP", continent: "asia", flag: "🇯🇵", gridIntensity: 390, mix: "Nuclear & LNG", carbonStatus: "Moderate" },
  { provider: "aws", code: "sa-east-1", displayName: "São Paulo", name: "South America (São Paulo)", country: "Brazil", countryCode: "BR", continent: "south_america", flag: "🇧🇷", gridIntensity: 110, mix: "Hydroelectric", carbonStatus: "Clean" },

  // Azure Regions
  { provider: "azure", code: "centralindia", displayName: "Central India (Pune)", name: "Azure Central India", country: "India", countryCode: "IN", continent: "asia", flag: "🇮🇳", gridIntensity: 680, mix: "Thermal & Solar", carbonStatus: "High Carbon" },
  { provider: "azure", code: "southindia", displayName: "South India (Chennai)", name: "Azure South India", country: "India", countryCode: "IN", continent: "asia", flag: "🇮🇳", gridIntensity: 650, mix: "Thermal & Solar", carbonStatus: "High Carbon" },
  { provider: "azure", code: "eastus", displayName: "East US (Virginia)", name: "Azure East US", country: "United States", countryCode: "US", continent: "north_america", flag: "🇺🇸", gridIntensity: 420, mix: "Gas & Coal", carbonStatus: "Moderate" },
  { provider: "azure", code: "eastus2", displayName: "East US 2 (Virginia)", name: "Azure East US 2", country: "United States", countryCode: "US", continent: "north_america", flag: "🇺🇸", gridIntensity: 420, mix: "Gas & Coal", carbonStatus: "Moderate" },
  { provider: "azure", code: "westus", displayName: "West US (California)", name: "Azure West US", country: "United States", countryCode: "US", continent: "north_america", flag: "🇺🇸", gridIntensity: 210, mix: "Solar & Gas", carbonStatus: "Clean" },
  { provider: "azure", code: "westus2", displayName: "West US 2 (Washington)", name: "Azure West US 2", country: "United States", countryCode: "US", continent: "north_america", flag: "🇺🇸", gridIntensity: 80, mix: "Hydro & Wind", carbonStatus: "Ultra Clean" },
  { provider: "azure", code: "canadacentral", displayName: "Canada Central (Toronto)", name: "Azure Canada Central", country: "Canada", countryCode: "CA", continent: "north_america", flag: "🇨🇦", gridIntensity: 120, mix: "Hydro & Nuclear", carbonStatus: "Clean" },
  { provider: "azure", code: "northeurope", displayName: "North Europe (Ireland)", name: "Azure North Europe", country: "Ireland", countryCode: "IE", continent: "europe", flag: "🇮🇪", gridIntensity: 310, mix: "Wind & Gas", carbonStatus: "Moderate" },
  { provider: "azure", code: "westeurope", displayName: "West Europe (Netherlands)", name: "Azure West Europe", country: "Netherlands", countryCode: "NL", continent: "europe", flag: "🇳🇱", gridIntensity: 320, mix: "Wind & Gas", carbonStatus: "Moderate" },
  { provider: "azure", code: "uksouth", displayName: "UK South (London)", name: "Azure UK South", country: "United Kingdom", countryCode: "GB", continent: "europe", flag: "🇬🇧", gridIntensity: 220, mix: "Wind & Nuclear", carbonStatus: "Clean" },
  { provider: "azure", code: "francecentral", displayName: "France Central (Paris)", name: "Azure France Central", country: "France", countryCode: "FR", continent: "europe", flag: "🇫🇷", gridIntensity: 75, mix: "Nuclear & Hydro", carbonStatus: "Ultra Clean" },
  { provider: "azure", code: "germanywestcentral", displayName: "Germany West Central (Frankfurt)", name: "Azure Germany West Central", country: "Germany", countryCode: "DE", continent: "europe", flag: "🇩🇪", gridIntensity: 340, mix: "Wind, Coal & Solar", carbonStatus: "Moderate" },
  { provider: "azure", code: "swedencentral", displayName: "Sweden Central (Gävle)", name: "Azure Sweden Central", country: "Sweden", countryCode: "SE", continent: "europe", flag: "🇸🇪", gridIntensity: 45, mix: "Hydro & Nuclear", carbonStatus: "Ultra Clean" },
  { provider: "azure", code: "southeastasia", displayName: "Southeast Asia (Singapore)", name: "Azure Southeast Asia", country: "Singapore", countryCode: "SG", continent: "asia", flag: "🇸🇬", gridIntensity: 480, mix: "Natural Gas", carbonStatus: "High Carbon" },
  { provider: "azure", code: "australiaeast", displayName: "Australia East (NSW)", name: "Azure Australia East", country: "Australia", countryCode: "AU", continent: "oceania", flag: "🇦🇺", gridIntensity: 560, mix: "Coal & Solar", carbonStatus: "High Carbon" },
  { provider: "azure", code: "japaneast", displayName: "Japan East (Tokyo)", name: "Azure Japan East", country: "Japan", countryCode: "JP", continent: "asia", flag: "🇯🇵", gridIntensity: 470, mix: "LNG & Coal", carbonStatus: "High Carbon" },
  { provider: "azure", code: "koreacentral", displayName: "Korea Central (Seoul)", name: "Azure Korea Central", country: "South Korea", countryCode: "KR", continent: "asia", flag: "🇰🇷", gridIntensity: 460, mix: "Nuclear & Coal", carbonStatus: "High Carbon" },
  { provider: "azure", code: "brazilsouth", displayName: "Brazil South (São Paulo)", name: "Azure Brazil South", country: "Brazil", countryCode: "BR", continent: "south_america", flag: "🇧🇷", gridIntensity: 110, mix: "Hydroelectric", carbonStatus: "Clean" },
];

export const REGION_INFO_BY_CODE: Record<string, RegionInfo> = Object.fromEntries(
  REGION_INFO_LIST.map((r) => [r.code, r])
);

/**
 * Unified region metadata map for dashboard & APIs (single source of truth).
 */
export const REGION_METADATA: Record<
  string,
  { name: string; country: string; flag: string; gridIntensity: number; mix: string; carbonStatus: string }
> = Object.fromEntries(
  REGION_INFO_LIST.map((r) => [
    r.code,
    {
      name: r.name,
      country: r.country,
      flag: r.flag,
      gridIntensity: r.gridIntensity,
      mix: r.mix,
      carbonStatus: r.carbonStatus,
    },
  ])
);

export function getRegionDisplayName(region: string): string {
  return REGION_INFO_BY_CODE[region]?.displayName || region;
}

export function pairedRegion(provider: Provider, region: string): string | null {
  const norm = region.toLowerCase();
  for (const [awsReg, azureReg] of REGION_PAIRS) {
    if (provider === "aws" && awsReg === norm) return azureReg;
    if (provider === "azure" && azureReg === norm) return awsReg;
  }
  return null;
}

export function candidateRegions(
  sourceProvider: Provider,
  sourceRegion: string,
  mode: RegionMode = "paired"
): string[] {
  const targetProvider: Provider = sourceProvider === "aws" ? "azure" : "aws";
  const pair = pairedRegion(sourceProvider, sourceRegion);

  if (mode === "paired") {
    return pair ? [pair] : [];
  }

  const sourceInfo = REGION_INFO_BY_CODE[sourceRegion.toLowerCase()];
  if (!sourceInfo) {
    return pair ? [pair] : [];
  }

  if (mode === "same_country") {
    const matches = REGION_INFO_LIST.filter(
      (r) => r.provider === targetProvider && r.countryCode === sourceInfo.countryCode
    ).map((r) => r.code);
    if (matches.length > 0) return matches;
    return pair ? [pair] : [];
  }

  // same_continent
  const matches = REGION_INFO_LIST.filter(
    (r) => r.provider === targetProvider && r.continent === sourceInfo.continent
  ).map((r) => r.code);
  if (matches.length > 0) return matches;
  return pair ? [pair] : [];
}

export function getAllRegionsForProvider(provider: Provider): string[] {
  return REGION_INFO_LIST.filter((r) => r.provider === provider).map((r) => r.code);
}
