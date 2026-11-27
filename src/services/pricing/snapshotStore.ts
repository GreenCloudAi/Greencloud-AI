import snapshotData from "./priceSnapshot.json";
import type { Provider } from "./regionMap";
import type { OsType } from "./pricingSync";

export const HOURS_PER_MONTH = 730;

export type PriceSource = "aws_price_list_api" | "azure_retail_api" | "snapshot";

export interface PriceLookup {
  hourlyUsd: number;
  monthlyUsd: number;
  source: PriceSource;
  fetchedAt: string;
}

interface SnapshotShape {
  generatedAt: string;
  aws: Record<string, Record<string, Record<string, number>>>;
  azure: Record<string, Record<string, Record<string, number>>>;
}

const snapshot = snapshotData as SnapshotShape;

export function getSnapshotGeneratedAt(): string {
  return snapshot.generatedAt;
}

export function getSnapshotRegionPrices(
  provider: Provider,
  region: string,
  os: OsType = "linux"
): Map<string, PriceLookup> {
  const normRegion = region.toLowerCase();
  const table = snapshot[provider]?.[normRegion]?.[os] || {};
  const result = new Map<string, PriceLookup>();

  for (const [sku, hourlyUsd] of Object.entries(table)) {
    if (typeof hourlyUsd === "number" && hourlyUsd > 0) {
      result.set(sku.toLowerCase(), {
        hourlyUsd,
        monthlyUsd: parseFloat((hourlyUsd * HOURS_PER_MONTH).toFixed(2)),
        source: "snapshot",
        fetchedAt: snapshot.generatedAt,
      });
    }
  }

  return result;
}
