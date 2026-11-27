import { PricingClient, GetProductsCommand } from "@aws-sdk/client-pricing";
import { prisma } from "../db";
import { Logger } from "../logger";
import { SKU_SPECS } from "./skuSpecs";
import type { Provider } from "./regionMap";

export type OsType = "linux" | "windows";

export interface FetchedPriceRow {
  provider: Provider;
  sku: string;
  region: string;
  os: OsType;
  hourlyUsd: number;
  source: "aws_price_list_api" | "azure_retail_api";
}

const KNOWN_SKUS = new Set(SKU_SPECS.map((s) => `${s.provider}:${s.sku}`));

/**
 * Fetches on-demand VM hourly prices from the public Azure Retail Prices API.
 * No authentication required.
 */
export async function fetchAzureRegionPrices(
  region: string,
  osFilter: OsType = "linux"
): Promise<FetchedPriceRow[]> {
  const normRegion = region.toLowerCase();
  const filter = `serviceName eq 'Virtual Machines' and armRegionName eq '${normRegion}' and priceType eq 'Consumption'`;
  let nextUrl: string | null =
    `https://prices.azure.com/api/retail/prices?api-version=2023-01-01-preview&$filter=${encodeURIComponent(filter)}`;

  const map = new Map<string, FetchedPriceRow>();
  let pages = 0;
  const maxPages = 25;

  while (nextUrl && pages < maxPages) {
    pages++;
    const res = await fetch(nextUrl);
    if (!res.ok) {
      throw new Error(`Azure Retail Prices API HTTP ${res.status} for ${normRegion}`);
    }
    const data: any = await res.json();
    const items: any[] = Array.isArray(data.Items) ? data.Items : [];

    for (const item of items) {
      if (item.unitOfMeasure !== "1 Hour" || item.type !== "Consumption") continue;
      const skuName = String(item.skuName || "");
      if (/spot|low priority/i.test(skuName)) continue;

      const armSku = String(item.armSkuName || "").toLowerCase();
      if (!armSku || !KNOWN_SKUS.has(`azure:${armSku}`)) continue;

      const isWindows = /windows/i.test(String(item.productName || ""));
      const os: OsType = isWindows ? "windows" : "linux";
      if (os !== osFilter) continue;

      const price = Number(item.retailPrice);
      if (!Number.isFinite(price) || price <= 0) continue;

      const key = `${armSku}:${os}`;
      const existing = map.get(key);
      if (!existing || price < existing.hourlyUsd) {
        map.set(key, {
          provider: "azure",
          sku: armSku,
          region: normRegion,
          os,
          hourlyUsd: price,
          source: "azure_retail_api",
        });
      }
    }

    nextUrl = data.NextPageLink || null;
  }

  return Array.from(map.values());
}

/**
 * Fetches on-demand EC2 hourly prices from AWS Price List Query API.
 * Requires AWS credentials (env vars or IAM role) with pricing:GetProducts.
 */
export async function fetchAwsRegionPrices(
  region: string,
  osFilter: OsType = "linux",
  credentials?: { accessKeyId: string; secretAccessKey: string; sessionToken?: string }
): Promise<FetchedPriceRow[]> {
  const normRegion = region.toLowerCase();
  const client = new PricingClient({
    region: "us-east-1",
    ...(credentials ? { credentials } : {}),
  });

  const rows: FetchedPriceRow[] = [];
  let nextToken: string | undefined = undefined;
  let pages = 0;
  const maxPages = 15;

  do {
    pages++;
    const cmd: GetProductsCommand = new GetProductsCommand({
      ServiceCode: "AmazonEC2",
      MaxResults: 100,
      NextToken: nextToken,
      Filters: [
        { Type: "TERM_MATCH", Field: "regionCode", Value: normRegion },
        { Type: "TERM_MATCH", Field: "operatingSystem", Value: osFilter === "windows" ? "Windows" : "Linux" },
        { Type: "TERM_MATCH", Field: "tenancy", Value: "Shared" },
        { Type: "TERM_MATCH", Field: "preInstalledSw", Value: "NA" },
        { Type: "TERM_MATCH", Field: "capacitystatus", Value: "Used" },
        { Type: "TERM_MATCH", Field: "licenseModel", Value: "No License required" },
      ],
    });

    const resp: any = await client.send(cmd);
    const priceList: string[] = resp.PriceList || [];

    for (const raw of priceList) {
      try {
        const doc = JSON.parse(raw);
        const instanceType = String(doc?.product?.attributes?.instanceType || "").toLowerCase();
        if (!instanceType || !KNOWN_SKUS.has(`aws:${instanceType}`)) continue;

        const onDemand = doc?.terms?.OnDemand || {};
        const firstTerm: any = Object.values(onDemand)[0];
        const dims: any = firstTerm?.priceDimensions || {};
        const firstDim: any = Object.values(dims)[0];
        const usd = Number(firstDim?.pricePerUnit?.USD);
        if (!Number.isFinite(usd) || usd <= 0) continue;

        rows.push({
          provider: "aws",
          sku: instanceType,
          region: normRegion,
          os: osFilter,
          hourlyUsd: usd,
          source: "aws_price_list_api",
        });
      } catch {
        // skip malformed product entry
      }
    }

    nextToken = resp.NextToken;
  } while (nextToken && pages < maxPages);

  return rows;
}

/**
 * Syncs live prices into PriceCatalog for the requested provider+region pairs
 * when existing rows are older than maxAgeHours (unless force = true).
 */
export async function syncRegions(
  targets: Array<{ provider: Provider; region: string }>,
  options: { maxAgeHours?: number; force?: boolean; os?: OsType } = {}
): Promise<{ regionsSynced: number; rows: number; errors: string[] }> {
  const maxAgeHours = options.maxAgeHours ?? 24;
  const force = options.force ?? false;
  const os: OsType = options.os ?? "linux";

  const seen = new Set<string>();
  let regionsSynced = 0;
  let totalRows = 0;
  const errors: string[] = [];

  for (const t of targets) {
    const key = `${t.provider}:${t.region.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    try {
      if (!force) {
        const latest = await prisma.priceCatalog.findFirst({
          where: { provider: t.provider, region: t.region.toLowerCase(), os },
          orderBy: { fetchedAt: "desc" },
        });
        if (latest) {
          const ageHours = (Date.now() - latest.fetchedAt.getTime()) / 3_600_000;
          if (ageHours < maxAgeHours) continue;
        }
      }

      const fetched =
        t.provider === "azure"
          ? await fetchAzureRegionPrices(t.region, os)
          : await fetchAwsRegionPrices(t.region, os);

      const now = new Date();
      for (const row of fetched) {
        await prisma.priceCatalog.upsert({
          where: {
            provider_sku_region_os: {
              provider: row.provider,
              sku: row.sku,
              region: row.region,
              os: row.os,
            },
          },
          create: {
            provider: row.provider,
            sku: row.sku,
            region: row.region,
            os: row.os,
            hourlyUsd: row.hourlyUsd,
            source: row.source,
            fetchedAt: now,
          },
          update: {
            hourlyUsd: row.hourlyUsd,
            source: row.source,
            fetchedAt: now,
          },
        });
      }

      regionsSynced++;
      totalRows += fetched.length;
    } catch (err: any) {
      const msg = `${key}: ${err?.message || String(err)}`;
      Logger.warn("PRICING", "PRICE_SYNC_WARN", `Skipped live price sync for ${key}: ${msg}`);
      errors.push(msg);
    }
  }

  return { regionsSynced, rows: totalRows, errors };
}
