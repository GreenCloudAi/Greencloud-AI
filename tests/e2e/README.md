# GreenCloud AI Opaque-Box E2E Test Suite (`tests/e2e/`)

Independent, requirement-driven end-to-end test suite exercising the running GreenCloud AI platform strictly through its public HTTP pages, JSON APIs, CSS/SVG assets, CLI tools, and optional headless Chromium browser session without importing from `src/`.

## Prerequisites

- **Node.js `v24+`** (uses built-in `node:test`, `node:assert/strict`, `node:child_process`, `node:fs`, `node:path`, `node:url`, and native `fetch` with zero required external npm packages).
- A running GreenCloud AI server (`npm run dev` or `npm run build && npm run start`) reachable at `BASE_URL` (defaults to `http://127.0.0.1:3000`).
- Optional: `playwright` installed when running with `E2E_REQUIRE_BROWSER=1` or `--require-browser` to enforce full headless Chromium DOM/computed-style checks alongside SSR/API verification.

## Usage

Run all 4 tiers sequentially via the unified runner:

```bash
node tests/e2e/runner.mjs
```

Run a specific tier or target a non-default server URL:

```bash
node tests/e2e/runner.mjs --tier=1 --base-url=http://127.0.0.1:3000
node tests/e2e/runner.mjs --tier=4 --require-browser
```

You can also invoke individual tier files directly with Node's native test runner:

```bash
node --test tests/e2e/tier1.test.mjs
```

### Environment Variables & CLI Flags

| Variable / Flag | Default | Purpose |
|---|---|---|
| `BASE_URL` / `E2E_BASE_URL` / `--base-url=<url>` | `http://127.0.0.1:3000` | Target GreenCloud AI server base URL |
| `E2E_TIER` / `--tier=all\|1\|2\|3\|4` | `all` | Select all tiers or an individual tier |
| `E2E_REQUIRE_BROWSER=1` / `--require-browser` | unset | Fail if Playwright Chromium is unavailable instead of falling back to HTTP/SSR/CSS verification |
| `E2E_READY_TIMEOUT_MS` | `8000` | Server readiness poll timeout on `/api/workspace/config` |

## 4-Tier Suite Breakdown (224 Tests Total)

1. **`tests/e2e/tier1.test.mjs` — Feature Coverage (`95` tests: `T1-F01-01` .. `T1-F19-05`)**
   - 5 happy-path tests for each of the 19 product features across baseline hygiene, Prisma schema & seeding, DB-backed RBAC & SoD, Workspace Admin RBAC UI, `SyncJob` workers, `DataQualityReport`, 7-level global filter chain, compatibility catalog, optimization & overlap solver, 10-state recommendation lifecycle, Dry-Run/verification/rollback, Azure/GCP/Kubernetes/Grid connectors, 17-chart visualization engine, 6 role views, and documentation.
2. **`tests/e2e/tier2.test.mjs` — Boundary, Corner, Negative & Guardrail Tests (`95` tests: `T2-F01-01` .. `T2-F19-05`)**
   - 5 negative/boundary/security tests per feature covering deny-overrides-allow RBAC, SoD self-approval blocks, `viewer` 403 enforcement across all mutating endpoints, illegal lifecycle jumps, guardrail failures triggering rollback, billing lag `pending_data`, invalid live credentials (asserting explicit auth failure with zero silent fallback), missing telemetry (`null`/`NaN` never treated as `0`), empty/1-point chart states, and `design.md` compliance guards (zero `\u2014` em dashes, zero banned demo banners, zero `1px` borders on tonal surfaces, zero `bolt` icons on AWS connect/compute surfaces).
3. **`tests/e2e/tier3.test.mjs` — Cross-Feature Pairwise Combinations (`22` tests: `T3-01` .. `T3-22`)**
   - Exercises pairwise integrations where state/output from one feature feeds directly into another (e.g., RBAC UI -> Scoped Deny -> SyncJob, SyncJob -> DataQualityReport, GlobalFilterChain -> Recommendations/K8s/Charts, CompatibilityCatalog -> Pareto Optimizer -> Lifecycle -> Billing Verification -> BeforeAfter Chart).
4. **`tests/e2e/tier4.test.mjs` — Real-World Multi-Persona Application Scenarios (`12` tests: `T4-01` .. `T4-12`)**
   - End-to-end journeys spanning multiple roles (`admin`, `finops`, `devops`, `architect`, `sustainability`, `viewer`): enterprise multi-cloud onboarding & partial sync recovery, full optimization -> SoD approval -> dry-run -> counterfactual verification, post-change SLO breach & rollback, scoped RBAC governance audit, Kubernetes OpenCost slack attribution, clean-region carbon SCI reduction, FOCUS import hygiene, billing lag recovery, live vs invalid credentials honesty, missing telemetry safety, executive read-only governance, and full multi-viewport `design.md` compliance walkthrough.

## Progressive Live vs `sandbox_fixture` Testing

Connector tests (`aws`, `azure`, `gcp`, `kubernetes`, `gridIntensity`) probe `GET /api/connectors/status` via `getConnectorCapabilities()` in `tests/e2e/helpers.mjs`:

- **When live credentials or endpoints are absent**: Tests assert `sourceMode === "sandbox_fixture"` (or `"static_catalog"` for regional grid intensity) alongside a non-empty `capabilityDisclosure`.
- **When live credentials are configured**: Tests assert `sourceMode === "live_api"` and live telemetry/billing structures.
- **When invalid credentials or unreachable endpoints are explicitly supplied**: Tests assert explicit failure (`sync_failed`, `SyncJob.status === "failed"`, or `4xx`/`5xx` error envelope) and **never** accept silent fallback to `sandbox_fixture`.

## DB & Workspace Isolation Guarantees

- Each tier runs sequentially via `node --test` to avoid concurrent SQLite or `/api/workspace/config` mutations.
- Tests snapshot `/api/workspace/config` (`snapshotWorkspaceConfig()`) before mutating settings and restore it (`restoreWorkspaceConfig()`) in `after` hooks.
- Synthetic accounts, workloads, FOCUS imports, and RBAC assignments use unique `e2e-*` identifiers tracked and removed by `cleanupTestArtifacts()`.
- Cleanup explicitly preserves `"GreenCloud Default Organization"`, `"Acme Enterprise"`, `"Staging Tenant"`, and `"tickets/ticket_GC-E2E-TEST.md"` used by `scripts/run-e2e.js`.
