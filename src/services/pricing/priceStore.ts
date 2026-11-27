import { prisma } from "../db";
import type { Provider } from "./regionMap";
import type { OsType } from "./pricingSync";
import {
  getSnapshotGeneratedAt,
  getSnapshotRegionPrices,
  HOURS_PER_MONTH,
  type PriceLookup,
  type PriceSource,
} from "./snapshotStore";

export { getSnapshotGeneratedAt, getSnapshotRegionPrices, HOURS_PER_MONTH };
export type { PriceLookup, PriceSource };

/**
 * Bulk: all priced SKUs in a region — DB first, snapshot fallback.
 */
export async function getRegionPrices(
  provider: Provider,
  region: string,
  os: OsType = "linux",
  cache?: Map<string, Map<string, PriceLookup>>
): Promise<Map<string, PriceLookup>> {
  const normRegion = region.toLowerCase();
  const cacheKey = `${provider}:${normRegion}:${os}`;
  if (cache?.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }

  const merged = getSnapshotRegionPrices(provider, normRegion, os);

  try {
    const dbRows = await prisma.priceCatalog.findMany({
      where: { provider, region: normRegion, os },
    });

    for (const row of dbRows) {
      if (row.hourlyUsd > 0) {
        merged.set(row.sku.toLowerCase(), {
          hourlyUsd: row.hourlyUsd,
          monthlyUsd: parseFloat((row.hourlyUsd * HOURS_PER_MONTH).toFixed(2)),
          source: (row.source as PriceSource) || "snapshot",
          fetchedAt: row.fetchedAt.toISOString(),
        });
      }
    }
  } catch {
    // Fall back gracefully to snapshot if DB is unavailable (e.g. unit tests)
  }

  cache?.set(cacheKey, merged);
  return merged;
}

/**
 * Single-SKU lookup — DB first, snapshot fallback, null if unknown.
 */
export async function getPrice(
  provider: Provider,
  sku: string,
  region: string,
  os: OsType = "linux",
  cache?: Map<string, Map<string, PriceLookup>>
): Promise<PriceLookup | null> {
  const regionMap = await getRegionPrices(provider, region, os, cache);
  return regionMap.get(sku.trim().toLowerCase()) || null;
}
