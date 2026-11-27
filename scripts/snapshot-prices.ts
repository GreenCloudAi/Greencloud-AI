import fs from "fs";
import path from "path";
import { getAllRegionsForProvider } from "../src/services/pricing/regionMap";
import { fetchAwsRegionPrices, fetchAzureRegionPrices } from "../src/services/pricing/pricingSync";

async function main() {
  const snapshot: {
    generatedAt: string;
    aws: Record<string, Record<string, Record<string, number>>>;
    azure: Record<string, Record<string, Record<string, number>>>;
  } = {
    generatedAt: new Date().toISOString(),
    aws: {},
    azure: {},
  };

  const azureRegions = getAllRegionsForProvider("azure");
  for (const region of azureRegions) {
    try {
      const rows = await fetchAzureRegionPrices(region, "linux");
      if (rows.length > 0) {
        snapshot.azure[region] = { linux: {} };
        for (const r of rows) {
          snapshot.azure[region].linux[r.sku] = r.hourlyUsd;
        }
        console.log(`[snapshot] azure/${region}: ${rows.length} SKUs`);
      }
    } catch (err: any) {
      console.warn(`[snapshot] azure/${region} failed: ${err?.message || err}`);
    }
  }

  const awsRegions = getAllRegionsForProvider("aws");
  for (const region of awsRegions) {
    try {
      const rows = await fetchAwsRegionPrices(region, "linux");
      if (rows.length > 0) {
        snapshot.aws[region] = { linux: {} };
        for (const r of rows) {
          snapshot.aws[region].linux[r.sku] = r.hourlyUsd;
        }
        console.log(`[snapshot] aws/${region}: ${rows.length} SKUs`);
      }
    } catch (err: any) {
      console.warn(`[snapshot] aws/${region} failed: ${err?.message || err}`);
    }
  }

  const outPath = path.resolve(process.cwd(), "src/services/pricing/priceSnapshot.json");
  fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2));
  console.log(`[snapshot] Wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
