# Cross-Cloud Advisor — Implementation Spec

> **Status:** Planned · **Branch:** `beta-dev` · **Owner:** GreenCloud AI core
> **One-line goal:** For every *running* VM (AWS EC2 or Azure VM), tell the user whether to **stay** on their current cloud or **shift** to the other one, name the **exact target machine + region**, and show **how much money they save** (monthly, yearly, net of migration cost, with payback period).

This document is the working spec. Each phase ends with a checklist and acceptance criteria — tick them off as you go.

---

## Table of contents

1. [Problem & user story](#1-problem--user-story)
2. [Current state of the codebase (what exists, what's broken)](#2-current-state-of-the-codebase)
3. [Core idea: the four-option comparison](#3-core-idea-the-four-option-comparison)
4. [Architecture](#4-architecture)
5. [Data model changes (Prisma)](#5-data-model-changes-prisma)
6. [Pricing layer](#6-pricing-layer)
7. [Machine spec catalog & family equivalence](#7-machine-spec-catalog--family-equivalence)
8. [Region pairing](#8-region-pairing)
9. [Sizing algorithm](#9-sizing-algorithm)
10. [Migration cost model](#10-migration-cost-model)
11. [Verdict engine](#11-verdict-engine)
12. [Portfolio summary](#12-portfolio-summary)
13. [Carbon comparison](#13-carbon-comparison)
14. [Configuration](#14-configuration)
15. [API contract](#15-api-contract)
16. [Recommendation integration](#16-recommendation-integration)
17. [UI spec](#17-ui-spec)
18. [Testing](#18-testing)
19. [Edge cases](#19-edge-cases)
20. [Phased task list](#20-phased-task-list)
21. [Out of scope / future](#21-out-of-scope--future)

---

## 1. Problem & user story

> *As a cloud owner with VMs on AWS and/or Azure, I want to see, for each running machine, whether the same workload would be cheaper on the other cloud, which exact machine I'd move to, and how much I'd actually save after paying for the move — so I can decide to stay or shift with confidence.*

**Must answer, per running VM:**

| Question | Example answer |
|---|---|
| Where is it now? | AWS · ap-south-1 (Mumbai) · `m5.xlarge` · 4 vCPU / 16 GB · $XX/mo |
| What does it actually need? | Peak CPU 22% → needs 2 vCPU, 16 GB |
| Best option on the same cloud? | `r6i.large` (2 vCPU / 16 GB) · $XX/mo |
| Best option on the other cloud? | Azure · centralindia · `Standard_E2s_v5` · $XX/mo |
| How much does the **move itself** save? | $X/mo · $Y/yr · Z% |
| What does the move cost once? | $N (egress + engineering) |
| Payback? | M months |
| Verdict | **STAY**, **CONSIDER**, or **SHIFT** — with plain-English reasons |

**Must answer, for the whole portfolio:** "Overall: stay on AWS / move to Azure / split — and here's the total net savings."

Works when **only one cloud is connected** (we price the other cloud from public price data — no credentials for the other cloud are needed).

---

## 2. Current state of the codebase

### What we can reuse

| Piece | Where | Use |
|---|---|---|
| Running VMs for both clouds | `CloudResource` rows with `resourceType` `"ec2"` / `"azure_vm"` (`src/services/ingestion.ts:121`, `:461`) | Input set |
| CPU telemetry | `CloudResource.telemetryMetrics` JSON → `{ cpuDailyAverages, peakCpu, lookbackDays }` | Sizing |
| Current monthly cost | `CloudResource.monthlyCost` | Baseline |
| Disks & IPs | `ebs`, `azure_disk`, `eip`, `azure_ip` rows | Migration cost + run-cost parity |
| Grid carbon intensity for both clouds' regions | `src/services/carbonEngine.ts:10` | Carbon delta |
| Region display metadata | `REGION_METADATA` in `src/app/api/dashboard/route.ts:6` | UI labels |
| Recommendation + approval + audit flow | `Recommendation`, `Approval`, `AuditLog` models | Actioning a shift |
| Azure disk GB-month pricing | `AZURE_DISK_GB_MONTH_PRICING` in `src/services/azureConnector.ts` | Disk parity |

### What is broken and must be fixed first (Phase 1)

| # | Problem | Location | Effect on this feature |
|---|---|---|---|
| B1 | `AZURE_VM_CATALOG` prices are copied from AWS (`Standard_B2s` = `t3.medium` = $30.37, `Standard_D2s_v5` = `m5.large` = $70.08) | `src/services/machineCatalog.ts` (`AZURE_VM_CATALOG`) and `AZURE_VM_HOURLY_PRICING` in `azureConnector.ts` | Every cross-cloud delta would be ≈ $0 — the feature would be useless |
| B2 | Prices are single-region (US-East baseline) but VMs live in many regions (default `ap-south-1`) | both catalogs | Wrong savings by 10–30 % |
| B3 | `r7g.large` / `r7g.medium` recommended but missing from `EC2_CATALOG` → silently falls back to `t4g.small` | `machineCatalog.ts:232`, `:237` | Wrong target + wrong savings |
| B4 | `savingsPercentage` clamped to `[15, 95]` | `machineCatalog.ts:267`, `:386` | A 3 % saving shows as 15 % — misleading |
| B5 | Disk → VM attachment is fetched (`AttachmentInstanceId` in `awsConnector.ts:529`, `ManagedBy` on Azure disks) but **not persisted** on `CloudResource` | `ingestion.ts` | Can't compute data-to-move per VM |
| B6 | AWS `lifecycleState` is `"running"`; Azure VM `State` is `"running"` too, but also `"deallocated"` / `"stopped"` — need one normaliser | `ingestion.ts` | Filter "running only" consistently |

`calculateTargetMachine` is used by `recommendationEngine.ts:276`, `agentDeploymentService.ts:106`, `executiveAgent.ts:318`, `AgentDeploymentReportView.tsx:100`. **Don't change its signature** — fix the data under it, and make the new advisor a separate module.

---

## 3. Core idea: the four-option comparison

For each running VM compute four priced options:

| Code | Option | Definition |
|---|---|---|
| **A** | Stay as-is | Current SKU, current region, current cost |
| **B** | Rightsize, same cloud | Cheapest SKU on the **same** cloud & region that fits the *measured* requirement |
| **C** | Shift, like-for-like | Closest SKU on the **other** cloud (paired region) with **same** vCPU/RAM as today |
| **D** | Shift + rightsize | Cheapest SKU on the **other** cloud (paired region) that fits the *measured* requirement |

**The verdict compares D against B, not D against A.**

Rationale: rightsizing doesn't require a migration. If we compared D vs A we'd credit the migration with savings the user can get by resizing in place. The UI shows both numbers but the decision uses `B − D`:

```
rightsizingSavings  = A − B      // achievable without moving
shiftSavings        = B − D      // the extra money the move itself buys   ← drives verdict
totalSavingsIfShift = A − D      // headline if they do both
```

If `shiftSavings ≤ 0`, the answer is **STAY** (and we still surface option B as "rightsize in place").

---

## 4. Architecture

```
                         ┌─────────────────────────────┐
  daily / on sync ──────▶│ pricingSync.ts              │
                         │  • Azure Retail Prices API  │──▶ PriceCatalog (DB)
                         │  • AWS Price List Query API │        ▲
                         │  • fallback: snapshot JSON  │        │
                         └─────────────────────────────┘        │
                                                                │
 CloudResource (ec2 / azure_vm, running) ──┐                    │
 CloudResource (ebs / azure_disk, attached)┤                    │
 telemetryMetrics (peakCpu, avgCpu) ───────┤                    │
                                           ▼                    │
                         ┌─────────────────────────────┐        │
                         │ crossCloudAdvisor.ts        │────────┘ reads prices
                         │  1. normalise VM            │
                         │  2. derive requirement      │◀── skuSpecs.ts (vCPU/RAM/arch/family)
                         │  3. price options A,B,C,D   │◀── regionMap.ts
                         │  4. migration cost          │◀── config.ts (thresholds, rates)
                         │  5. verdict + reasons       │◀── carbonEngine.ts (intensity)
                         │  6. portfolio summary       │
                         └──────────────┬──────────────┘
                                        │
             ┌──────────────────────────┼──────────────────────────┐
             ▼                          ▼                          ▼
 GET /api/cross-cloud        Recommendation rows          CrossCloudAdvisorView.tsx
 (JSON report)               category "cross_cloud_       (dashboard → Optimization →
                             migration" (approve/audit)    "Cross-Cloud Advisor")
```

### New files

| File | Purpose |
|---|---|
| `src/services/pricing/skuSpecs.ts` | Static spec table (vCPU, RAM, arch, family, category, burst baseline) for both clouds |
| `src/services/pricing/regionMap.ts` | AWS ↔ Azure region pairs + continent groups + display names |
| `src/services/pricing/priceStore.ts` | `getHourlyPrice(provider, sku, region, os)` — DB first, snapshot fallback |
| `src/services/pricing/pricingSync.ts` | Pulls live prices into `PriceCatalog` |
| `src/services/pricing/priceSnapshot.json` | Committed fallback, generated by the snapshot script (never hand-typed) |
| `src/services/crossCloudAdvisor.ts` | All comparison logic (pure functions + one DB loader) |
| `src/app/api/cross-cloud/route.ts` | GET report / POST refresh-prices |
| `src/components/optimization/CrossCloudAdvisorView.tsx` | UI |
| `scripts/snapshot-prices.ts` | Generates `priceSnapshot.json` from live APIs |
| `scripts/test-cross-cloud.ts` | Deterministic tests (see §18) |

### Modified files

| File | Change |
|---|---|
| `prisma/schema.prisma` | `PriceCatalog` model; `attachedToResourceId` on `CloudResource` |
| `src/services/ingestion.ts` | Persist disk attachment; normalise lifecycle state |
| `src/services/machineCatalog.ts` | Fix B1–B4 (read prices from `priceStore`, add `r7g`, remove 15 % floor) |
| `src/services/config.ts` | `crossCloud` config block (§14) |
| `src/services/recommendationEngine.ts` | Call advisor, upsert `cross_cloud_migration` recommendations |
| `src/app/dashboard/page.tsx` | New nav item `opt-cross-cloud` + render the view |
| `package.json` | `@aws-sdk/client-pricing`, `tsx` (dev); scripts `prices:snapshot`, `test:cross-cloud` |
| `docs/aws-setup-guide.md` | Add `pricing:GetProducts` to the IAM policy |

---

## 5. Data model changes (Prisma)

```prisma
model PriceCatalog {
  id         String   @id @default(uuid())
  provider   String   // "aws" | "azure"
  sku        String   // normalised lowercase: "m5.large", "standard_d2s_v5"
  region     String   // provider region code: "ap-south-1", "centralindia"
  os         String   @default("linux") // "linux" | "windows"
  hourlyUsd  Float
  source     String   // "aws_price_list_api" | "azure_retail_api" | "snapshot"
  fetchedAt  DateTime @default(now())

  @@unique([provider, sku, region, os])
  @@index([provider, region])
}

model CloudResource {
  // ...existing fields...
  attachedToResourceId String?  // providerResourceId of the VM this disk/IP is attached to
}
```

Specs (vCPU, RAM, arch) live in `skuSpecs.ts`, **not** the DB — they're stable and the Azure Retail API doesn't return them.

Migration: `npm run db:push` (project uses `prisma db push`, no migration files).

---

## 6. Pricing layer

### 6.1 `priceStore.ts` interface

```ts
export type Provider = "aws" | "azure";
export type OsType = "linux" | "windows";

export interface PriceLookup {
  hourlyUsd: number;
  monthlyUsd: number;          // hourlyUsd * HOURS_PER_MONTH (730)
  source: "aws_price_list_api" | "azure_retail_api" | "snapshot";
  fetchedAt: string;           // ISO
}

export async function getPrice(
  provider: Provider, sku: string, region: string, os?: OsType
): Promise<PriceLookup | null>;

/** Bulk: all priced SKUs in a region — used for candidate search. */
export async function getRegionPrices(
  provider: Provider, region: string, os?: OsType
): Promise<Map<string, PriceLookup>>;
```

Lookup order: `PriceCatalog` row → `priceSnapshot.json` → `null`. A `null` price means **the SKU is skipped as a candidate** (never guess a price).

Cache `getRegionPrices` in-memory per request (one advisor run may hit the same region 50 times).

### 6.2 Azure — Retail Prices API (public, no auth)

```
GET https://prices.azure.com/api/retail/prices
    ?api-version=2023-01-01-preview
    &$filter=serviceName eq 'Virtual Machines'
             and armRegionName eq '{region}'
             and priceType eq 'Consumption'
```

- Follow `NextPageLink` until null.
- Keep items where `unitOfMeasure == "1 Hour"`, `type == "Consumption"`.
- **Drop** items whose `skuName` contains `Spot` or `Low Priority`.
- OS: `productName` containing `Windows` → `windows`, else `linux`.
- Key = `armSkuName.toLowerCase()` (e.g. `standard_d2s_v5`), value = `retailPrice` (USD).
- Only fetch regions we care about (every region a connected VM is in, plus each one's pair).

### 6.3 AWS — Price List Query API (needs AWS credentials)

- Package: `@aws-sdk/client-pricing` (**not installed yet**).
- Client region must be `us-east-1` (or `ap-south-1` / `eu-central-1` — the only Pricing endpoints).
- `GetProducts` with `ServiceCode: "AmazonEC2"` and filters:

  | Field | Value |
  |---|---|
  | `regionCode` | `{region}` |
  | `operatingSystem` | `Linux` (or `Windows`) |
  | `tenancy` | `Shared` |
  | `preInstalledSw` | `NA` |
  | `capacitystatus` | `Used` |
  | `licenseModel` | `No License required` |

- Each `PriceList` entry is a JSON string: read `product.attributes.instanceType` and the single `terms.OnDemand.*.priceDimensions.*.pricePerUnit.USD`.
- Paginate with `NextToken`.
- IAM: add `pricing:GetProducts` to the role/policy in `docs/aws-setup-guide.md` and in `infra/`.
- If **no AWS account is connected** (Azure-only user) → use the snapshot for AWS prices and show the "prices as of {date}" badge.

### 6.4 Snapshot fallback

`scripts/snapshot-prices.ts` runs both fetchers for the regions in `regionMap.ts` and writes:

```json
{
  "generatedAt": "2026-11-27T00:00:00Z",
  "aws":   { "ap-south-1": { "linux": { "m5.large": 0.000, "...": 0 } } },
  "azure": { "centralindia": { "linux": { "standard_d2s_v5": 0.000 } } }
}
```

Commit the generated file. Re-run monthly (`npm run prices:snapshot`). **Never hand-edit prices** — that's how B1 happened.

### 6.5 Sync schedule

- `pricingSync.syncRegions(regions[])` is called at the end of each account sync in `ingestion.ts` **if** the newest `fetchedAt` for those regions is older than `crossCloud.priceMaxAgeHours` (default 24).
- `POST /api/cross-cloud` with `{ action: "refresh_prices" }` forces a sync.
- Failures are logged (`Logger.warn("PRICING", ...)`) and never break ingestion.

---

## 7. Machine spec catalog & family equivalence

### 7.1 `skuSpecs.ts` shape

```ts
export type Arch = "x86_64" | "arm64";
export type Category = "burstable" | "general" | "compute" | "memory";
export type CpuVendor = "intel" | "amd" | "graviton" | "ampere";

export interface SkuSpec {
  provider: Provider;
  sku: string;               // normalised lowercase key
  displayName: string;       // "m5.large", "Standard_D2s_v5"
  family: string;            // "m5", "Dsv5"
  generation: number;        // for "prefer newer" tie-breaks
  vCpu: number;
  memoryGb: number;
  arch: Arch;
  cpuVendor: CpuVendor;
  category: Category;
  burstBaselinePct?: number; // per-vCPU sustained baseline for burstable SKUs
  maxNetworkGbps?: number;
  localNvme?: boolean;       // exclude from matching unless source also has it
  deprecated?: boolean;      // never recommend as a target
}
```

**Coverage for v1** (sizes `nano` → `4xlarge` where they exist):

| AWS families | Azure families |
|---|---|
| t2, t3, t3a, t4g | B (v1), Bsv2, Basv2, Bpsv2 |
| m5, m6i, m7i, m6a, m7a, m6g, m7g | Dsv5, Dsv6, Dasv5, Dasv6, Dpsv5, Dpsv6 |
| c5, c6i, c7i, c6a, c7a, c6g, c7g | Fsv2, Fasv6, Dplsv5, Dplsv6, Dlsv5 |
| r5, r6i, r7i, r6a, r7a, r6g, r7g | Esv5, Esv6, Easv5, Epsv5, Epsv6 |

Specs can be generated once from the AWS API (`attributes.vcpu`, `attributes.memory`) and the Azure Resource SKUs API (`/providers/Microsoft.Compute/skus`, needs a connected Azure subscription), then committed. Specs rarely change, so a committed file is fine.

### 7.2 Family equivalence (for option C and to explain matches)

| Workload shape | RAM:vCPU | AWS | Azure |
|---|---|---|---|
| Burstable x86 | varies | t3 / t3a | B / Bsv2 / Basv2 |
| Burstable Arm | varies | t4g | Bpsv2 |
| General x86 Intel | 4 GB | m5 / m6i / m7i | Dsv5 / Dsv6 |
| General x86 AMD | 4 GB | m6a / m7a | Dasv5 / Dasv6 |
| General Arm | 4 GB | m6g / m7g | Dpsv5 / Dpsv6 |
| Compute x86 | 2 GB | c5 / c6i / c7i | Fsv2 / Fasv6 / Dlsv5 |
| Compute Arm | 2 GB | c6g / c7g | Dplsv5 / Dplsv6 |
| Memory x86 | 8 GB | r5 / r6i / r7i | Esv5 / Esv6 / Easv5 |
| Memory Arm | 8 GB | r6g / r7g | Epsv5 / Epsv6 |

### 7.3 Burstable baselines

Store `burstBaselinePct` per SKU from the official docs (AWS "Baseline performance per vCPU" table; Azure B-series / Bsv2 "Base CPU performance of VM" table). Verify each value against the docs when filling the file — don't copy between clouds.

---

## 8. Region pairing

`regionMap.ts`:

```ts
export interface RegionInfo {
  provider: Provider;
  code: string;          // "ap-south-1" / "centralindia"
  displayName: string;   // "Mumbai" / "Central India (Pune)"
  country: string;       // ISO-2
  continent: "asia" | "europe" | "north_america" | "south_america" | "oceania" | "africa" | "middle_east";
}

export const REGION_PAIRS: Array<[aws: string, azure: string]> = [
  ["ap-south-1",     "centralindia"],
  ["ap-south-2",     "southindia"],
  ["us-east-1",      "eastus"],
  ["us-east-2",      "eastus2"],      // nearest equivalent; no Azure Ohio region
  ["us-west-1",      "westus"],
  ["us-west-2",      "westus2"],
  ["ca-central-1",   "canadacentral"],
  ["eu-west-1",      "northeurope"],
  ["eu-west-2",      "uksouth"],
  ["eu-west-3",      "francecentral"],
  ["eu-central-1",   "germanywestcentral"],
  ["eu-north-1",     "swedencentral"],
  ["ap-southeast-1", "southeastasia"],
  ["ap-southeast-2", "australiaeast"],
  ["ap-northeast-1", "japaneast"],
  ["ap-northeast-2", "koreacentral"],
  ["sa-east-1",      "brazilsouth"],
];

export function pairedRegion(provider: Provider, region: string): string | null;
export function candidateRegions(provider: Provider, region: string, mode: RegionMode): string[];
```

`RegionMode` (config `crossCloud.regionMode`):

| Mode | Target regions considered |
|---|---|
| `"paired"` (default) | Only the paired region — same latency and data-residency profile |
| `"same_country"` | All target-cloud regions in the same country |
| `"same_continent"` | All target-cloud regions on the same continent (biggest savings, flagged "latency/residency review needed") |

If a region has no pair → mark the VM `"no_equivalent_region"` and skip the shift options (still compute B).

Merge the display names with the existing `REGION_METADATA` (`src/app/api/dashboard/route.ts:6`) so there's one source of truth — move it to `regionMap.ts` and import it in the route.

---

## 9. Sizing algorithm

### 9.1 Normalise the VM

```ts
interface NormalisedVm {
  resourceId: string;           // CloudResource.id
  providerResourceId: string;
  name: string;                 // Name tag or id
  provider: Provider;           // "ec2" → aws, "azure_vm" → azure
  region: string;
  sku: string;                  // normalised lowercase
  spec: SkuSpec | null;         // null → unknown SKU (see edge cases)
  os: OsType;                   // v1: "linux" unless tag/platform says windows
  peakCpu: number;              // % (0–100), from telemetryMetrics.peakCpu
  avgCpu: number;               // mean(cpuDailyAverages)
  p95Cpu: number | null;        // if series long enough (>= 14 points), else null
  lookbackDays: number;
  currentMonthlyUsd: number;    // CloudResource.monthlyCost ?? list price
  attachedDiskGb: number;       // sum of attached disks
  attachedDisks: Array<{ id: string; sizeGb: number; tier: string; monthlyUsd: number }>;
  hasPublicIp: boolean;
}
```

Running filter: `lifecycleState in ("running")` after normalising (`"VM running"`, `"PowerState/running"` → `"running"`).

### 9.2 Derive the requirement

```ts
const TARGET = cfg.targetPeakUtilizationPct;   // default 70
const util   = vm.p95Cpu ?? vm.peakCpu;        // prefer p95 when available
const usedVcpu = vm.spec.vCpu * util / 100;

requiredVcpu   = Math.max(1, Math.ceil(usedVcpu / (TARGET / 100)));
requiredMemGb  = vm.spec.memoryGb;              // v1: no memory telemetry → never shrink RAM
requiredArch   = cfg.allowArchChange ? "any" : vm.spec.arch;
allowBurstable = vm.avgCpu < burstBaselineFor(candidate);  // evaluated per candidate
```

**Telemetry confidence:**

| Lookback days | Confidence | Effect |
|---|---|---|
| ≥ 14 | high | normal |
| 7–13 | medium | verdict can't go above CONSIDER |
| < 7 or no telemetry | low | no rightsizing (required = current); B = A; shift is like-for-like only |

### 9.3 Candidate search

```ts
function findBest(
  provider: Provider, regions: string[], req: Requirement, vm: NormalisedVm
): PricedOption[] {
  candidates = SKU_SPECS
    .filter(s => s.provider === provider && !s.deprecated)
    .filter(s => s.vCpu >= req.vCpu && s.memoryGb >= req.memGb)
    .filter(s => req.arch === "any" || s.arch === req.arch)
    .filter(s => !s.localNvme || vm.spec.localNvme)
    .filter(s => s.category !== "burstable" || vm.avgCpu < s.burstBaselinePct!)
    .filter(s => s.memoryGb <= req.memGb * cfg.maxMemoryOverprovisionRatio)  // default 2× — stops "cheapest" picking a weird shape
    .flatMap(s => regions.map(r => ({ spec: s, region: r, price: priceOf(provider, s.sku, r, vm.os) })))
    .filter(c => c.price !== null);

  sort by monthlyRunCost asc, then generation desc, then vCpu asc;
  return top 3;
}
```

`monthlyRunCost` = compute + disks + public IP on that cloud (§10.1), so a cheap VM with expensive disks doesn't win unfairly.

- **Option B** = `findBest(vm.provider, [vm.region], req, vm)[0]` (if it isn't cheaper than A, B = A).
- **Option C** = like-for-like on the other cloud: same vCPU and RAM, same arch, family from the §7.2 equivalence row, cheapest in the paired region.
- **Option D** = `findBest(otherProvider, candidateRegions(...), req, vm)`; [0] is the pick, [1..2] are alternatives.
- If arch change is allowed and an Arm SKU wins, also keep the best **same-arch** D as `dSameArch`, so the UI can show "x86 option: …".

---

## 10. Migration cost model

### 10.1 Recurring (included in every option's monthly cost)

| Item | Source cloud | Target cloud |
|---|---|---|
| Compute | `PriceCatalog` | `PriceCatalog` |
| Block storage | existing `monthlyCost` of attached disks | `sizeGb × targetDiskRate(tier)` using the tier map below |
| Public IP | existing IP `monthlyCost` | `cfg.publicIpMonthly[target]` |

Disk tier mapping:

| AWS EBS | Azure Managed Disk |
|---|---|
| gp2 / gp3 | `StandardSSD_LRS` (or `PremiumV2_LRS` if `cfg.preferPremiumDisks`) |
| io1 / io2 | `PremiumV2_LRS` |
| st1 / sc1 | `Standard_LRS` |

Use the reverse map for Azure → AWS. Disk rates come from config (`AZURE_DISK_GB_MONTH_PRICING` already exists; add `AWS_EBS_GB_MONTH_PRICING`). Mark them "verify per region"; per-region disk pricing is a Phase 4 item.

### 10.2 One-time

```ts
egressGb      = vm.attachedDiskGb * cfg.dataToMoveRatio;          // default 1.0 (full disk image)
egressUsd     = Math.max(0, egressGb - cfg.egressFreeGb[source]) * cfg.egressPerGb[source][regionGroup];
laborUsd      = cfg.laborHoursPerVm * cfg.laborRatePerHour;        // default 8h × $75
archLaborUsd  = archChanges ? cfg.archChangeExtraHours * cfg.laborRatePerHour : 0;  // default +8h
parallelRunUsd= cfg.parallelRunDays / 30 * cost(D);               // run both during cut-over, default 3 days
oneTimeUsd    = egressUsd + laborUsd + archLaborUsd + parallelRunUsd;
```

If disk attachment isn't known (B5 not done, or orphan VM) → `attachedDiskGb = cfg.defaultRootDiskGb` (30) and add the caveat "disk size assumed".

### 10.3 Payback

```ts
shiftSavings  = cost(B) - cost(D);                 // monthly, recurring
paybackMonths = shiftSavings > 0 ? oneTimeUsd / shiftSavings : Infinity;
netFirstYear  = shiftSavings * 12 - oneTimeUsd;
```

---

## 11. Verdict engine

```ts
type Verdict = "SHIFT" | "CONSIDER" | "STAY";

function decide(r: VmComparison, cfg): Verdict {
  if (r.blockers.length) return "STAY";              // e.g. no equivalent region, unknown SKU
  const pct = r.shiftSavings / r.optionB.monthlyUsd * 100;

  let v: Verdict = "STAY";
  if (r.shiftSavings > 0 && r.paybackMonths <= cfg.considerMaxPaybackMonths) v = "CONSIDER";
  if (r.shiftSavings >= cfg.shiftMinMonthlyUsd &&
      pct           >= cfg.shiftMinPct &&
      r.paybackMonths <= cfg.shiftMaxPaybackMonths) v = "SHIFT";

  if (r.confidence === "medium" && v === "SHIFT") v = "CONSIDER";
  if (r.confidence === "low") v = v === "STAY" ? "STAY" : "CONSIDER";
  return v;
}
```

Defaults: `shiftMinMonthlyUsd = 10`, `shiftMinPct = 10`, `shiftMaxPaybackMonths = 6`, `considerMaxPaybackMonths = 12`.

### Reasons (generated strings, shown in the UI)

Build a `reasons: string[]` from templates, most important first:

- `"Rightsizing on {provider} alone saves ${A−B}/mo — do this regardless of the cloud decision."`
- `"{targetSku} in {targetRegionName} is ${shiftSavings}/mo ({pct}%) cheaper than the best {provider} option."`
- `"One-time migration cost ≈ ${oneTime} (egress ${egress}, effort ${labor}); pays back in {payback} months."`
- `"Not worth moving: savings ${shiftSavings}/mo would take {payback} months to recover ${oneTime}."`
- `"{provider} is already cheaper for this shape by ${-shiftSavings}/mo."`

### Caveats (shown as warning chips)

`arch_change` · `burstable_target` · `region_not_paired` (same_continent mode) · `disk_size_assumed` · `low_telemetry` · `windows_license_not_modelled` · `price_snapshot_stale` (> 45 days) · `memory_not_measured`.

---

## 12. Portfolio summary

```ts
interface PortfolioSummary {
  runningVmCount: number;
  byProvider: Record<Provider, { vmCount: number; currentMonthlyUsd: number }>;
  verdictCounts: Record<Verdict, number>;

  rightsizeInPlaceMonthlyUsd: number;   // Σ (A − B) over all VMs
  shiftMonthlyUsd: number;              // Σ (B − D) over SHIFT VMs only
  shiftOneTimeUsd: number;              // Σ oneTime over SHIFT VMs
  shiftPaybackMonths: number;           // shiftOneTimeUsd / shiftMonthlyUsd
  bestCaseMonthlyUsd: number;           // rightsize all + shift the SHIFT ones

  headline: "stay" | "shift_all" | "shift_some";
  headlineText: string;                 // e.g. "Stay on AWS — move 3 of 12 VMs to Azure for $214/mo net"
}
```

Headline rule:
- No SHIFT → `"stay"`: *"Stay on {provider}. Rightsize in place to save ${…}/mo."*
- All VMs of a provider SHIFT → `"shift_all"`: *"Move your {provider} estate to {other}: ${…}/mo, pays back in {n} months."*
- Otherwise → `"shift_some"`.

Also emit a **mixed-estate note** when the user has both clouds: an argument for consolidating onto one cloud (fewer contracts, one skill set), shown as information only — not added to the dollar figure.

---

## 13. Carbon comparison

```ts
// Reuse the existing engine (src/services/carbonEngine.ts:61) — it accepts AWS and Azure SKUs
const r = CarbonEngine.calculateEC2Carbon(option.sku, option.region, vm.avgCpu, 730);
gco2eMonth     = r.operationalGco2e + r.embodiedGco2e;
carbonDeltaPct = (gco2e(D) - gco2e(A)) / gco2e(A) * 100;
```

Note: `calculateEC2Carbon` guesses vCPUs from the SKU name. Once `skuSpecs.ts` exists, add an optional `vCpuOverride` parameter so it uses the real spec.

Shown next to the price. It doesn't affect the verdict unless `cfg.greenWeighting > 0`, in which case:

```ts
effectiveSavings = shiftSavings + cfg.greenWeighting * (kgCo2eSavedPerMonth * cfg.carbonPricePerKg);
```

Default `greenWeighting = 0`.

---

## 14. Configuration

Add to `src/services/config.ts` (env-overridable like the existing keys):

```ts
crossCloud: {
  enabled:                     env("GREENCLOUD_XC_ENABLED", true),
  regionMode:                  env("GREENCLOUD_XC_REGION_MODE", "paired"),   // paired|same_country|same_continent
  targetPeakUtilizationPct:    env("GREENCLOUD_XC_TARGET_PEAK", 70),
  allowArchChange:             env("GREENCLOUD_XC_ALLOW_ARM", false),
  maxMemoryOverprovisionRatio: 2,
  shiftMinMonthlyUsd:          env("GREENCLOUD_XC_MIN_USD", 10),
  shiftMinPct:                 env("GREENCLOUD_XC_MIN_PCT", 10),
  shiftMaxPaybackMonths:       env("GREENCLOUD_XC_MAX_PAYBACK", 6),
  considerMaxPaybackMonths:    12,
  laborHoursPerVm:             env("GREENCLOUD_XC_LABOR_HOURS", 8),
  laborRatePerHour:            env("GREENCLOUD_XC_LABOR_RATE", 75),
  archChangeExtraHours:        8,
  parallelRunDays:             3,
  dataToMoveRatio:             1.0,
  defaultRootDiskGb:           30,
  egressFreeGb:                { aws: 100, azure: 100 },
  egressPerGb:                 { /* by provider + region group; fill from official pages */ },
  publicIpMonthly:             { aws: 3.65, azure: 3.65 },   // verify; both bill per IPv4 hour
  priceMaxAgeHours:            24,
  greenWeighting:              0,
  carbonPricePerKg:            0.08,
}
```

The UI's "Assumptions" panel sends overrides as query params (see §15), so users can try values without changing env.

---

## 15. API contract

### `GET /api/cross-cloud?accountId={id|all}`

Optional overrides: `regionMode`, `targetPeak`, `allowArm`, `laborHours`, `laborRate`, `minUsd`, `minPct`, `maxPayback`.

```ts
interface CrossCloudResponse {
  generatedAt: string;
  priceInfo: { aws: { source: string; asOf: string }; azure: { source: string; asOf: string } };
  assumptions: ResolvedCrossCloudConfig;
  summary: PortfolioSummary;
  machines: VmComparison[];
}

interface PricedOption {
  provider: Provider;
  sku: string; displayName: string;
  region: string; regionName: string;
  vCpu: number; memoryGb: number; arch: Arch; family: string; category: Category;
  computeMonthlyUsd: number;
  storageMonthlyUsd: number;
  ipMonthlyUsd: number;
  monthlyUsd: number;              // total run cost
  projectedPeakCpuPct: number;     // vm.peakCpu * vm.spec.vCpu / option.vCpu
  priceSource: string;
}

interface VmComparison {
  resourceId: string; name: string; provider: Provider; region: string; regionName: string;
  telemetry: { peakCpu: number; avgCpu: number; p95Cpu: number | null; lookbackDays: number };
  confidence: "high" | "medium" | "low";
  requirement: { vCpu: number; memoryGb: number; arch: Arch | "any" };

  optionA: PricedOption;            // as-is
  optionB: PricedOption;            // rightsize same cloud
  optionC: PricedOption | null;     // like-for-like other cloud
  optionD: PricedOption | null;     // rightsize other cloud (the pick)
  optionDSameArch: PricedOption | null;
  alternatives: PricedOption[];     // next 2 on the other cloud

  rightsizingSavingsMonthly: number;   // A − B
  shiftSavingsMonthly: number;         // B − D
  totalSavingsMonthly: number;         // A − D
  shiftSavingsAnnual: number;
  shiftSavingsPct: number;             // vs B, unclamped, 1 decimal

  migration: {
    dataGb: number; egressUsd: number; laborUsd: number; archLaborUsd: number;
    parallelRunUsd: number; oneTimeUsd: number; paybackMonths: number | null; netFirstYearUsd: number;
  };

  carbon: { currentKgMonth: number; targetKgMonth: number; deltaPct: number };
  verdict: Verdict;
  reasons: string[];
  caveats: string[];
  blockers: string[];
  actions: {
    terraform: string;               // target resource block
    migrationSteps: string[];        // checklist (Azure Migrate / AWS MGN)
  };
}
```

### `POST /api/cross-cloud`

`{ action: "refresh_prices" }` → `{ ok, regionsSynced, rows, errors[] }`

Auth and tenant scoping: copy exactly what `src/app/api/dashboard/route.ts` does.

---

## 16. Recommendation integration

In `RecommendationEngine.generateRecommendations()`, after the existing rules:

```ts
const report = await runCrossCloudAdvisor(this.tenantId, account.id);
for (const m of report.machines) {
  const id = `rec_xc_${m.resourceId}`;
  if (m.verdict === "STAY") { await prisma.recommendation.deleteMany({ where: { id } }); continue; }
  await prisma.recommendation.upsert({
    where: { id },
    create: {
      id, tenantId, resourceId: m.resourceId,
      category: "cross_cloud_migration",
      title: `Shift ${m.name} to ${otherName(m.provider)} ${m.optionD!.displayName} (${m.optionD!.regionName})`,
      status: "active",
      estimatedMonthlySavings: m.shiftSavingsMonthly,
      estimatedGco2eSavings: (m.carbon.currentKgMonth - m.carbon.targetKgMonth) * 1000,
      riskScore: m.verdict === "SHIFT" ? 0.4 : 0.6,          // migration is riskier than resize
      confidence: { high: 0.85, medium: 0.65, low: 0.4 }[m.confidence],
      evidence: JSON.stringify({ crossCloud: m }),
    },
    update: { /* same fields minus id/tenant/resource */ },
  });
}
```

- **Don't** double-count: the existing rightsizing recommendation already covers `A − B`; this one covers only `B − D`.
- Approving a cross-cloud recommendation **does not run anything automatically** (unlike a resize). It writes an `AuditLog` entry `cross_cloud_migration_approved` and, if `ticketService` is configured, opens a ticket with the migration checklist.
- Make sure `RecommendationsView` / `OpportunitiesView` show the new category with its own label and icon.

---

## 17. UI spec

### 17.1 Navigation

`src/app/dashboard/page.tsx`, Optimization section (~line 1268): add a button after "Opportunities":

```tsx
onClick={() => { setCurrentTab("recommendations"); setActiveNavItem("opt-cross-cloud"); setMobileSidebarOpen(false); }}
label: "Cross-Cloud Advisor"   badge: count of SHIFT verdicts
```

Render branch (~line 2768):

```tsx
{activeNavItem === "opt-cross-cloud" ? <CrossCloudAdvisorView accountId={activeAccount.id} /> : activeNavItem === "opt-opportunities" ? ... }
```

The view fetches `/api/cross-cloud` itself (it doesn't extend the already large dashboard payload).

### 17.2 Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│ VERDICT BANNER                                                           │
│ "Stay on AWS — move 3 of 12 VMs to Azure"                                │
│  Net shift savings  $214/mo · $2,568/yr   One-time $1,950   Payback 9.1mo│
│  + Rightsize in place: $310/mo (no migration needed)                     │
│  Prices: AWS live 27 Nov · Azure live 27 Nov            [Assumptions ⚙] │
├──────────────────────────────────────────────────────────────────────────┤
│ KPI ROW:  Running VMs 12 │ SHIFT 3 │ CONSIDER 2 │ STAY 7 │ CO₂e Δ −11%   │
├──────────────────────────────────────────────────────────────────────────┤
│ Filters: [Provider ▾] [Verdict ▾] [Region ▾]   Sort: [Shift savings ▾]   │
├──────────────────────────────────────────────────────────────────────────┤
│ Machine   │ Now              │ Best same cloud │ Best other cloud │ Saves│
│ web-01    │ AWS·Mumbai       │ m7i.large       │ Azure·C.India    │ $38/mo│
│           │ m5.xlarge 4/16   │ 2/8  $XX        │ D2as_v5 2/8 $XX  │ 21%  │
│           │ $XX/mo · pk 22%  │                 │                  │ pb 4mo│ [SHIFT]
│ ...                                                                      │
└──────────────────────────────────────────────────────────────────────────┘
```

### 17.3 Detail drawer (click a row)

1. **Four-option comparison:** a horizontal bar per option (A, B, C, D) showing monthly cost, split into compute / storage / IP.
2. **Specs table:** vCPU, RAM, arch, CPU vendor, network, projected peak CPU on each option.
3. **Savings breakdown:** rightsizing (A−B), shift (B−D), total (A−D), annual, first-year net after migration.
4. **Migration cost:** egress, labour, arch change, parallel run, total, payback.
5. **Reasons:** a list. **Caveats:** warning chips.
6. **Alternatives:** the next 2 options on the other cloud, plus the same-arch option if the pick is Arm.
7. **How to migrate:** a checklist. AWS → Azure uses Azure Migrate; Azure → AWS uses AWS Application Migration Service.
8. **Terraform** for the target VM, with a copy button.
9. **Actions:** "Create recommendation" / "Dismiss" (uses the existing approval flow).

### 17.4 Assumptions panel

Editable inputs: region mode, target peak %, allow Arm, labour hours and rate, SHIFT thresholds. Changing any of them refetches with query-param overrides. Show a "using custom assumptions" pill until reset.

### 17.5 Visual rules

- Match the existing palette (`#1F8A70` green, `#ECE5CC` borders, `#2E2B1A` text).
- Verdict badges: SHIFT green, CONSIDER amber, STAY neutral grey.
- Money: `$1,234.56/mo` with an annual figure underneath. Never show a % without the $.
- Provider chips: "AWS" / "Azure" text badges. No vendor logos.

### 17.6 Empty / error states

- No running VMs → "No running machines to compare."
- No pricing at all → "Prices unavailable — [Refresh prices]".
- Every VM is STAY → the banner still shows the rightsizing-in-place savings.

---

## 18. Testing

The project has no unit-test runner. Add `tsx` (dev) and `"test:cross-cloud": "tsx scripts/test-cross-cloud.ts"`. Keep the advisor's core as **pure functions** that take `(vm, specs, prices, cfg)` so tests don't need a DB.

Use a **fixture price table** in the test file (made-up but internally consistent numbers), not live prices, so results are deterministic.

| # | Case | Expected |
|---|---|---|
| T1 | AWS VM, other cloud 30 % cheaper for the same shape, 200 GB disk | SHIFT; payback = oneTime / (B−D) exactly |
| T2 | Other cloud 3 % cheaper | STAY (below 10 %) |
| T3 | Other cloud 15 % cheaper, but a 2 TB disk → payback 14 mo | STAY |
| T4 | Payback 9 mo | CONSIDER |
| T5 | Peak CPU 12 % on 8 vCPU → requirement 2 vCPU | B and D both 2 vCPU; `A−B` and `B−D` reported separately; A−D = sum |
| T6 | Arm candidate cheapest, `allowArchChange=false` | D is x86; Arm not chosen |
| T7 | Arm candidate cheapest, `allowArchChange=true` | D is Arm, `optionDSameArch` set, `arch_change` caveat, +arch labour |
| T8 | avgCpu 35 %, burstable baseline 20 % | Burstable SKUs excluded |
| T9 | Region with no pair | blocker `no_equivalent_region`, verdict STAY, B still computed |
| T10 | Unknown SKU (not in specs) | uses `monthlyCost` as A, blocker `unknown_sku`, STAY |
| T11 | Lookback 5 days | confidence low, no rightsizing, at most CONSIDER |
| T12 | Target SKU has no price in region | skipped, next cheapest picked |
| T13 | Azure → AWS direction (Azure VM input) | symmetric logic, AWS SKU chosen |
| T14 | Savings 3 % | `shiftSavingsPct = 3.0` (no 15 % floor — regression test for B4) |
| T15 | `r5.xlarge` through the legacy `calculateTargetMachine` | target `r7g.large` exists in the catalog (regression test for B3) |
| T16 | Portfolio: 2 SHIFT, 1 CONSIDER, 3 STAY | totals equal per-VM sums; headline `shift_some` |

Manual QA:
- Run `npm run prices:snapshot` and spot-check 5 SKUs per cloud against the public pricing pages.
- Connect a real account and check a known VM's option A matches its bill (within about 5 %).

---

## 19. Edge cases

| Case | Handling |
|---|---|
| Stopped / deallocated VM | Excluded (feature is for running systems); count shown as "N stopped VMs not analysed" |
| VM in an Auto Scaling group / VM Scale Set | Analyse per instance; caveat `scaling_group` — move the group, not one VM |
| Spot instance | Excluded; caveat in the summary |
| Windows VM | v1 prices Linux only → caveat `windows_license_not_modelled`, max verdict CONSIDER |
| `monthlyCost` missing | Use list price for the current SKU and region |
| `monthlyCost` far below list (reserved / savings plan discount) | If actual < 0.8 × list → caveat `discounted_pricing_detected`, compare against actual (prevents recommending a move that loses the discount) |
| Multiple disks | Sum the attached disks; each mapped by tier |
| Telemetry series has gaps / zeros | Ignore zero points when computing p95 if more than 50 % of the series is zero (agent not reporting) |
| Price for same SKU in both DB and snapshot | DB wins if newer than `priceMaxAgeHours`, else snapshot wins only if newer |
| Currency | Everything USD (both APIs support USD) |

---

## 20. Phased task list

### Phase 1 — Trustworthy prices & data (prerequisite)

- [ ] Add `@aws-sdk/client-pricing`, `tsx` dev dependency; add `prices:snapshot`, `test:cross-cloud` scripts
- [ ] `prisma/schema.prisma`: `PriceCatalog` model, `CloudResource.attachedToResourceId`; `npm run db:push`
- [ ] `src/services/pricing/regionMap.ts` (pairs + region info, moving `REGION_METADATA` here)
- [ ] `src/services/pricing/skuSpecs.ts` for the families in §7.1, specs verified from the APIs/docs
- [ ] `src/services/pricing/pricingSync.ts` — Azure Retail fetcher, AWS Price List fetcher, upsert into `PriceCatalog`
- [ ] `scripts/snapshot-prices.ts` → commit `priceSnapshot.json`
- [ ] `src/services/pricing/priceStore.ts` (DB → snapshot → null)
- [ ] `ingestion.ts`: persist disk `attachedToResourceId` (AWS `AttachmentInstanceId`, Azure `ManagedBy`); normalise `lifecycleState`
- [ ] `machineCatalog.ts`: read prices from `priceStore` instead of hard-coded numbers (B1/B2); add `r6g`/`r7g` (B3); remove the 15 % floor (B4)
- [ ] `docs/aws-setup-guide.md` + `infra/`: add `pricing:GetProducts`

**Done when:** `Standard_D2s_v5` in `centralindia` and `m5.large` in `ap-south-1` return different, real prices; T14 and T15 pass; existing dashboards still render.

### Phase 2 — Advisor engine

- [ ] `config.ts`: `crossCloud` block
- [ ] `crossCloudAdvisor.ts`: `normaliseVm`, `deriveRequirement`, `findBest`, `likeForLike`, `migrationCost`, `decide`, `buildReasons`, `summarise`, `runCrossCloudAdvisor(tenantId, accountId)`
- [ ] Carbon delta using `CarbonEngine`
- [ ] `scripts/test-cross-cloud.ts` with T1–T16, all green

**Done when:** `npm run test:cross-cloud` passes, and running the advisor against the dev DB prints a sensible report for the seeded VMs.

### Phase 3 — API, recommendations, UI

- [ ] `src/app/api/cross-cloud/route.ts` (GET report with overrides, POST refresh_prices)
- [ ] `recommendationEngine.ts`: upsert/delete `rec_xc_*` recommendations
- [ ] Recommendations / Opportunities views: label for the `cross_cloud_migration` category
- [ ] `CrossCloudAdvisorView.tsx`: banner, KPIs, filters, table, detail drawer, assumptions panel, empty states
- [ ] Dashboard nav item + render branch
- [ ] Approval → AuditLog `cross_cloud_migration_approved` (+ ticket if configured)
- [ ] Add the new page to `executiveAgent.ts` / PDF report: a "Cloud placement" section with the portfolio headline

**Done when:** a user with one AWS account sees per-VM verdicts with named Azure targets, $/mo, $/yr and payback; changing assumptions updates the numbers; approving creates an audit entry.

### Phase 4 — Accuracy upgrades

- [ ] Reserved Instance / Savings Plan / Azure Reservation pricing (1-yr, 3-yr) as extra columns
- [ ] Windows + Azure Hybrid Benefit pricing
- [ ] Memory telemetry (CloudWatch agent `mem_used_percent`, Azure `Available Memory Bytes`) → allow RAM rightsizing
- [ ] Per-region disk and egress pricing from the same APIs
- [ ] Scheduled daily price sync (cron) independent of account syncs
- [ ] GCP as a third option (same engine, new provider)

---

## 21. Out of scope / future

- Managed services (RDS ↔ Azure SQL, EKS ↔ AKS, S3 ↔ Blob) — this spec covers VMs plus their disks and IPs only.
- Automatic execution of migrations — the advisor recommends; humans migrate.
- Negotiated / EDP / MACC discounts — can be added later as a per-provider "discount %" setting.
- Network latency measurement between the user's users and the target region.
