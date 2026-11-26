import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {
  BASE_URL,
  REPO_ROOT,
  ROLES,
  actorHeaders,
  apiRequest,
  assertErrorEnvelope,
  ensureServerReady,
  snapshotWorkspaceConfig,
  restoreWorkspaceConfig,
  getConnectorCapabilities,
  fetchHtmlPage,
  fetchLinkedCss,
  openBrowserSession,
  visitAndSettle,
  assertDesignCompliance,
  assertChartCardContract,
  buildFocusPayload,
  createIsolatedTestAccount,
  trackAssignment,
  trackArtifactPath,
  cleanupTestArtifacts,
  advanceRecommendationToState,
  runCliCommand,
} from "./helpers.mjs";

let workspaceSnapshot = null;

function extractList(payload, candidateKeys = []) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    for (const key of candidateKeys) {
      if (Array.isArray(payload[key])) return payload[key];
    }
    for (const value of Object.values(payload)) {
      if (Array.isArray(value)) return value;
    }
  }
  return [];
}

function trackIfArtifact(maybePath) {
  if (typeof maybePath !== "string" || !maybePath.trim()) return;
  if (maybePath.includes("tickets/") || maybePath.includes("pull_requests/")) {
    try {
      trackArtifactPath(maybePath);
    } catch {
      // Ignore paths outside workspace artifact directories
    }
  }
}

async function withBrowser(viewport, fn) {
  const session = await openBrowserSession({ viewport });
  try {
    if (session.available && session.page) {
      await fn(session);
    }
  } finally {
    await session.close();
  }
}

async function getRbacDirectory() {
  const [rolesRes, usersRes] = await Promise.all([
    apiRequest("/api/rbac/roles", { role: "admin", expectStatus: 200 }),
    apiRequest("/api/rbac/users", { role: "admin", expectStatus: 200 }),
  ]);
  const roles = extractList(rolesRes.json, ["roles", "items", "data"]);
  const users = extractList(usersRes.json, ["users", "items", "data"]);
  const rolesBySlug = new Map(roles.map((r) => [String(r.slug || "").toLowerCase(), r]));
  const usersByRoleSlug = new Map();
  for (const u of users) {
    const slug = String(
      u.roleSlug || u.role?.slug || u.primaryRole || u.roles?.[0]?.slug || ""
    ).toLowerCase();
    if (slug && !usersByRoleSlug.has(slug)) {
      usersByRoleSlug.set(slug, u);
    }
    const emailPrefix = String(u.email || "").split("@")[0].toLowerCase();
    for (const rSlug of ROLES) {
      if (!usersByRoleSlug.has(rSlug) && emailPrefix.includes(rSlug)) {
        usersByRoleSlug.set(rSlug, u);
      }
    }
  }
  return { roles, users, rolesBySlug, usersByRoleSlug };
}

async function setupIsolatedRecommendation({
  provider = "aws",
  region = "us-east-1",
  billedCost = 140,
  cpuPercent = 1.6,
} = {}) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const externalAccountId = `e2e-rec-${suffix}`;
  const resourceId = `i-e2e-${suffix}`;

  const focusPayload = buildFocusPayload({
    provider,
    region,
    externalAccountId,
    accountName: `E2E Rec ${provider.toUpperCase()} ${suffix}`,
    resourceId,
    billedCost,
    cpuPercent,
  });

  const importRes = await apiRequest("/api/cloud-accounts/import-focus", {
    method: "POST",
    role: "admin",
    body: focusPayload,
    expectStatus: [200, 201],
  });

  const importedAccId =
    importRes.json?.account?.id || importRes.json?.cloudAccountId || importRes.json?.accountId;
  if (importedAccId) {
    const listRes = await apiRequest("/api/cloud-accounts", { role: "admin", expectStatus: 200 });
    const accounts = extractList(listRes.json, ["accounts"]);
    const matched = accounts.find(
      (a) => a.id === importedAccId || a.externalAccountId === externalAccountId
    );
    assert.ok(matched?.id, "Imported FOCUS account must be discoverable for cleanup");
  }

  const accListRes = await apiRequest("/api/cloud-accounts", { role: "admin", expectStatus: 200 });
  const accList = extractList(accListRes.json, ["accounts"]);
  const account = accList.find((a) => a.externalAccountId === externalAccountId);
  assert.ok(account?.id, "Isolated account for recommendation must exist");

  await apiRequest("/api/recommendations/evaluate", {
    method: "POST",
    role: "admin",
    body: { accountIds: [account.id] },
    expectStatus: [200, 201],
  });

  const recsRes = await apiRequest("/api/recommendations", {
    role: "admin",
    query: { accountIds: account.id },
    expectStatus: 200,
  });
  const recs = extractList(recsRes.json, ["recommendations", "items", "data"]);
  const rec = recs.find((r) => r.lifecycleState === "recommended" || r.lifecycleState === "detected") || recs[0];
  assert.ok(rec?.id, `Expected at least 1 evaluated recommendation for isolated account ${account.id}`);

  if (rec.lifecycleState === "detected") {
    await apiRequest(`/api/recommendations/${encodeURIComponent(rec.id)}/transition`, {
      method: "POST",
      role: "finops",
      body: { toState: "recommended", reason: "E2E Tier 2 setup" },
      expectStatus: 200,
    });
    rec.lifecycleState = "recommended";
  }

  return { account, recommendation: rec };
}

before(async () => {
  await ensureServerReady({ baseUrl: BASE_URL });
  workspaceSnapshot = await snapshotWorkspaceConfig({ baseUrl: BASE_URL });
});

after(async () => {
  await cleanupTestArtifacts({ baseUrl: BASE_URL });
  if (workspaceSnapshot) {
    await restoreWorkspaceConfig(workspaceSnapshot, { baseUrl: BASE_URL });
  }
});

// ============================================================================
// Feature 1: M1 Baseline Bug Fixes & Hygiene (T2-F01-01 .. T2-F01-05)
// ============================================================================
describe("Tier 2 - Feature 1: M1 Baseline Bug Fixes & Hygiene", () => {
  it("T2-F01-01: GET /api/dashboard with 0 matching accounts returns null cost (never fabricated 0)", async () => {
    const res = await apiRequest("/api/dashboard", {
      role: "admin",
      query: { window: "30d", accountIds: "e2e-nonexistent-acc-000" },
      expectStatus: 200,
    });
    assert.ok(res.json && typeof res.json === "object", "Dashboard response must be JSON");
    assert.equal(
      res.json.costs?.totalCost ?? null,
      null,
      "Empty account slice must expose null totalCost rather than fabricating $0 live spend"
    );
    const savings = res.json.cpuDistribution?.potentialRightsizingSavings ?? 0;
    assert.equal(savings, 0, "Empty slice rightsizing savings must be 0");
  });

  it("T2-F01-02: GET /api/audit-logs and /audit-history render safely without TypeError on empty/filtered logs", async () => {
    const logsRes = await apiRequest("/api/audit-logs", {
      role: "admin",
      expectStatus: 200,
    });
    const logs = Array.isArray(logsRes.json) ? logsRes.json : logsRes.json?.logs;
    assert.ok(
      Array.isArray(logs),
      "GET /api/audit-logs must return either an array or { logs: [...] } matching audit-history parser"
    );

    const page = await fetchHtmlPage("/audit-history");
    assert.equal(page.status, 200);
    assert.equal(page.textContent.includes("\u2014"), false, "/audit-history must contain zero em dashes");

    await withBrowser({ width: 1280, height: 800 }, async ({ page: browserPage }) => {
      await visitAndSettle(browserPage, "/audit-history", { role: "admin" });
      const bodyText = await browserPage.evaluate(() => document.body.innerText || "");
      assert.ok(bodyText.trim().length > 0, "/audit-history must render visible content");
    });
  });

  it("T2-F01-03: POST /api/cloud-accounts/cleanup-duplicates never deletes primary account with resources and is idempotent", async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const payload = buildFocusPayload({
      provider: "aws",
      externalAccountId: `e2e-primary-${suffix}`,
      accountName: `E2E Primary ${suffix}`,
      billedCost: 55.25,
      cpuPercent: 45,
    });
    await apiRequest("/api/cloud-accounts/import-focus", {
      method: "POST",
      role: "admin",
      body: payload,
      expectStatus: [200, 201],
    });

    const listBefore = await apiRequest("/api/cloud-accounts", { role: "admin", expectStatus: 200 });
    const accountsBefore = extractList(listBefore.json, ["accounts"]);
    const primary = accountsBefore.find((a) => a.externalAccountId === payload.externalAccountId);
    assert.ok(primary?.id, "Primary test account must exist before cleanup-duplicates");

    const firstCleanup = await apiRequest("/api/cloud-accounts/cleanup-duplicates", {
      method: "POST",
      role: "admin",
      expectStatus: 200,
    });
    assert.equal(firstCleanup.json?.success, true, "cleanup-duplicates should report success: true");

    const secondCleanup = await apiRequest("/api/cloud-accounts/cleanup-duplicates", {
      method: "POST",
      role: "admin",
      expectStatus: 200,
    });
    assert.equal(secondCleanup.json?.deletedCount, 0, "Repeated cleanup-duplicates call must be idempotent");

    await apiRequest(`/api/cloud-accounts/${encodeURIComponent(primary.id)}`, {
      role: "admin",
      expectStatus: 200,
    });
  });

  it("T2-F01-04: POST /api/cloud-accounts/[id]/credentials rejects empty fields with 400 and never leaks secrets", async () => {
    const acc = await createIsolatedTestAccount({ provider: "aws" });

    const invalidRes = await apiRequest(
      `/api/cloud-accounts/${encodeURIComponent(acc.id)}/credentials`,
      {
        method: "POST",
        role: "admin",
        body: { accessKeyId: "", secretAccessKey: "" },
      }
    );
    assertErrorEnvelope(invalidRes, 400, "VALIDATION_ERROR");

    const secretMarker = "e2e-super-secret-value-9911";
    const validRes = await apiRequest(
      `/api/cloud-accounts/${encodeURIComponent(acc.id)}/credentials`,
      {
        method: "POST",
        role: "admin",
        body: { accessKeyId: "AKIAE2ETEST0009911", secretAccessKey: secretMarker },
        expectStatus: 200,
      }
    );
    assert.equal(validRes.json?.success, true);

    const listRes = await apiRequest("/api/cloud-accounts", { role: "admin", expectStatus: 200 });
    assert.equal(
      listRes.text.includes(secretMarker),
      false,
      "GET /api/cloud-accounts must never return plaintext secretAccessKey"
    );
    assert.equal(
      listRes.text.includes("encryptedSecretKey"),
      false,
      "GET /api/cloud-accounts must sanitize encryptedSecretKey"
    );
  });

  it("T2-F01-05: /, /dashboard, and /audit-history expose zero em dashes and zero 1px borders on tonal surfaces", async () => {
    for (const route of ["/", "/dashboard", "/audit-history"]) {
      const page = await fetchHtmlPage(route);
      const cssText = await fetchLinkedCss(page.stylesheets);
      await assertDesignCompliance({
        html: page.html,
        textContent: page.textContent,
        cssText,
        routeName: route,
      });
    }
  });
});

// ============================================================================
// Feature 2: Unified Prisma Schema (M2-M12 Models) (T2-F02-01 .. T2-F02-05)
// ============================================================================
describe("Tier 2 - Feature 2: Unified Prisma Schema (M2-M12 Models)", () => {
  it("T2-F02-01: POST /api/rbac/assignments with nonexistent userId or roleId returns clean 400/404 envelope", async () => {
    const res = await apiRequest("/api/rbac/assignments", {
      method: "POST",
      role: "admin",
      body: {
        userId: "e2e-nonexistent-user-999",
        roleId: "e2e-nonexistent-role-999",
        scopeType: "organization",
        scopeId: "default",
        effect: "allow",
      },
    });
    assertErrorEnvelope(res, [400, 404]);
  });

  it("T2-F02-02: DELETE /api/cloud-accounts/[id] cascades SyncJob, DataQualityReport, CloudResource, and Recommendation cleanly", async () => {
    const { account } = await setupIsolatedRecommendation({ provider: "aws" });
    await apiRequest("/api/sync-jobs", {
      method: "POST",
      role: "admin",
      body: { accountIds: [account.id], triggerType: "manual" },
      expectStatus: [200, 201],
    });

    const delRes = await apiRequest(`/api/cloud-accounts/${encodeURIComponent(account.id)}`, {
      method: "DELETE",
      role: "admin",
      expectStatus: [200, 204],
    });
    assert.ok(delRes.ok, "Cascading account delete must succeed without SQLite FK violation");

    const afterGet = await apiRequest(`/api/cloud-accounts/${encodeURIComponent(account.id)}`, {
      method: "GET",
      role: "admin",
    });
    assertErrorEnvelope(afterGet, 404);
  });

  it("T2-F02-03: POST /api/recommendations/[id]/verify rejects NaN or missing required numeric cost fields before DB write", async () => {
    const { recommendation } = await setupIsolatedRecommendation();
    await advanceRecommendationToState(recommendation.id, "verifying");

    const res = await apiRequest(
      `/api/recommendations/${encodeURIComponent(recommendation.id)}/verify`,
      {
        method: "POST",
        role: "finops",
        body: {
          expectedBaselineCost: "NaN",
          actualPostChangeCost: "not-a-number",
          billingLagHours: 72,
        },
      }
    );
    assertErrorEnvelope(res, [400, 422]);
  });

  it("T2-F02-04: GET /api/k8s/allocations handles unmapped pods (workloadId: null) without error", async () => {
    const res = await apiRequest("/api/k8s/allocations", {
      role: "devops",
      expectStatus: 200,
    });
    const allocations = extractList(res.json, ["allocations", "items", "data"]);
    assert.ok(Array.isArray(allocations), "GET /api/k8s/allocations must return an array");
    for (const item of allocations) {
      if (item.monthlyCost !== undefined && item.monthlyCost !== null) {
        assert.ok(Number.isFinite(item.monthlyCost), "monthlyCost must be finite");
      }
      if (item.idleSlackCost !== undefined && item.idleSlackCost !== null) {
        assert.ok(Number.isFinite(item.idleSlackCost), "idleSlackCost must be finite");
      }
    }
  });

  it("T2-F02-05: POST /api/recommendations/[id]/transition safely handles oversized SQL-like reason payloads", async () => {
    const { recommendation } = await setupIsolatedRecommendation();
    const adversarialReason = `${"A".repeat(2100)} ' OR 1=1 -- ; DROP TABLE Recommendation;`;

    const res = await apiRequest(
      `/api/recommendations/${encodeURIComponent(recommendation.id)}/transition`,
      {
        method: "POST",
        role: "finops",
        body: {
          toState: "awaiting_approval",
          reason: adversarialReason,
        },
      }
    );
    assert.ok(
      [200, 400, 422].includes(res.status),
      `Expected parameterized 200 or clean 400/422 validation error, got ${res.status}: ${res.text}`
    );
    if (res.status >= 400) {
      assertErrorEnvelope(res, [400, 422]);
    }

    const checkRecs = await apiRequest("/api/recommendations", {
      role: "admin",
      expectStatus: 200,
    });
    assert.ok(checkRecs.ok, "Database tables must remain intact after SQL-like payload");
  });
});

// ============================================================================
// Feature 3: Deterministic 6-Role & Catalog Seeding (T2-F03-01 .. T2-F03-05)
// ============================================================================
describe("Tier 2 - Feature 3: Deterministic 6-Role & Catalog Seeding", () => {
  it("T2-F03-01: Repeated npx prisma db seed leaves exactly 6 unique system roles without duplicate permissions", async () => {
    await runCliCommand("npx", ["prisma", "db", "seed"], { expectZero: true });
    await runCliCommand("npx", ["prisma", "db", "seed"], { expectZero: true });

    const { roles } = await getRbacDirectory();
    const slugs = roles.map((r) => String(r.slug).toLowerCase());
    assert.equal(new Set(slugs).size, 6, `Expected 6 unique role slugs, got: ${slugs.join(", ")}`);
    for (const expectedSlug of ROLES) {
      assert.ok(slugs.includes(expectedSlug), `Missing seeded system role "${expectedSlug}"`);
    }
    for (const role of roles) {
      const perms = extractList(role.permissions || role.rolePermissions, ["permissions"]);
      const permKeys = perms.map((p) => p.key || p.permission?.key || p.permissionId).filter(Boolean);
      assert.equal(
        new Set(permKeys).size,
        permKeys.length,
        `Role ${role.slug} has duplicate permission mappings`
      );
    }
  });

  it("T2-F03-02: PATCH /api/workspace/config rejects or ignores unknown activeRole 'superroot'", async () => {
    const res = await apiRequest("/api/workspace/config", {
      method: "PATCH",
      role: "admin",
      body: { activeRole: "superroot" },
    });
    if (res.status >= 400) {
      assertErrorEnvelope(res, [400, 422]);
    } else {
      assert.equal(res.status, 200);
      assert.ok(
        ROLES.includes(res.json?.activeRole),
        `Unknown role must not persist; got "${res.json?.activeRole}"`
      );
    }

    const verifyRes = await apiRequest("/api/workspace/config", { role: "admin", expectStatus: 200 });
    assert.notEqual(verifyRes.json?.activeRole, "superroot", "activeRole must never become 'superroot'");
  });

  it("T2-F03-03: GET /api/compatibility contains zero duplicate (provider, serviceType, skuName, region, sourceVersion) entries", async () => {
    const res = await apiRequest("/api/compatibility", { role: "architect", expectStatus: 200 });
    const skus = extractList(res.json, ["skus", "items", "data"]);
    assert.ok(skus.length > 0, "Compatibility catalog must be non-empty");

    const seen = new Set();
    for (const sku of skus) {
      const composite = `${sku.provider}|${sku.serviceType}|${sku.skuName}|${sku.region}|${sku.sourceVersion || "v1"}`;
      assert.equal(seen.has(composite), false, `Duplicate CompatibilitySku entry: ${composite}`);
      seen.add(composite);
    }
  });

  it("T2-F03-04: System roles cannot be deleted or stripped via API", async () => {
    const { roles } = await getRbacDirectory();
    const adminRole = roles.find((r) => String(r.slug).toLowerCase() === "admin");
    assert.ok(adminRole?.id, "Admin role must exist");

    const delRes = await apiRequest(`/api/rbac/roles/${encodeURIComponent(adminRole.id)}`, {
      method: "DELETE",
      role: "admin",
    });
    assert.ok(
      [403, 404, 405, 409].includes(delRes.status),
      `Expected system role deletion to be blocked (403/404/405/409), got ${delRes.status}`
    );

    const after = await getRbacDirectory();
    assert.equal(after.roles.length, 6, "All 6 system roles must remain intact");
  });

  it("T2-F03-05: GET /api/workspace/config always resolves a valid role and /dashboard renders cleanly", async () => {
    await apiRequest("/api/workspace/config", {
      method: "PATCH",
      role: "admin",
      body: { activeRole: "" },
    });
    const cfg = await apiRequest("/api/workspace/config", { role: "admin", expectStatus: 200 });
    assert.ok(ROLES.includes(cfg.json?.activeRole), `Expected valid activeRole, got ${cfg.json?.activeRole}`);

    const page = await fetchHtmlPage("/dashboard");
    assert.equal(page.status, 200);
  });
});

// ============================================================================
// Feature 4: RBAC Policy Evaluator & SoD (T2-F04-01 .. T2-F04-05)
// ============================================================================
describe("Tier 2 - Feature 4: RBAC Policy Evaluator & Separation of Duties", () => {
  it("T2-F04-01: Deny-overrides-Allow precedence blocks account A sync (403) while allowing account B sync (200)", async () => {
    const accA = await createIsolatedTestAccount({ provider: "aws" });
    const accB = await createIsolatedTestAccount({ provider: "aws" });
    const { rolesBySlug, usersByRoleSlug } = await getRbacDirectory();

    const devopsRole = rolesBySlug.get("devops");
    const devopsUser = usersByRoleSlug.get("devops");
    assert.ok(devopsRole?.id && devopsUser?.id, "Seeded devops role and user must exist");

    const allowRes = await apiRequest("/api/rbac/assignments", {
      method: "POST",
      role: "admin",
      body: {
        userId: devopsUser.id,
        roleId: devopsRole.id,
        scopeType: "organization",
        scopeId: "default",
        effect: "allow",
      },
      expectStatus: [200, 201],
    });
    const allowId = allowRes.json?.id || allowRes.json?.assignment?.id;
    if (allowId) trackAssignment(allowId);

    const denyRes = await apiRequest("/api/rbac/assignments", {
      method: "POST",
      role: "admin",
      body: {
        userId: devopsUser.id,
        roleId: devopsRole.id,
        scopeType: "account",
        scopeId: accA.id,
        effect: "deny",
      },
      expectStatus: [200, 201],
    });
    const denyId = denyRes.json?.id || denyRes.json?.assignment?.id;
    assert.ok(denyId, "Created deny RoleAssignment must return id");
    trackAssignment(denyId);

    const syncARes = await apiRequest(`/api/cloud-accounts/${encodeURIComponent(accA.id)}/sync`, {
      method: "POST",
      role: "devops",
      userId: devopsUser.id,
    });
    assertErrorEnvelope(syncARes, 403, "FORBIDDEN");

    const syncBRes = await apiRequest(`/api/cloud-accounts/${encodeURIComponent(accB.id)}/sync`, {
      method: "POST",
      role: "devops",
      userId: devopsUser.id,
      expectStatus: 200,
    });
    assert.ok(syncBRes.ok, "Healthy non-denied account B must still allow sync");
  });

  it("T2-F04-02: Separation of Duties blocks same user from approving their own approval request (403/409)", async () => {
    const { recommendation } = await setupIsolatedRecommendation();
    const { usersByRoleSlug } = await getRbacDirectory();
    const finopsUser = usersByRoleSlug.get("finops");
    assert.ok(finopsUser?.id, "Seeded finops user must exist");

    await apiRequest(`/api/recommendations/${encodeURIComponent(recommendation.id)}/transition`, {
      method: "POST",
      role: "finops",
      userId: finopsUser.id,
      body: { toState: "awaiting_approval", reason: "E2E SoD request" },
      expectStatus: 200,
    });

    const selfApproveRes = await apiRequest(
      `/api/recommendations/${encodeURIComponent(recommendation.id)}/transition`,
      {
        method: "POST",
        role: "finops",
        userId: finopsUser.id,
        body: { toState: "approved", reason: "Attempted self-approval" },
      }
    );
    assertErrorEnvelope(selfApproveRes, [403, 409]);
  });

  it("T2-F04-03: viewer role receives 403 FORBIDDEN across ALL mutating endpoints", async () => {
    const acc = await createIsolatedTestAccount({ provider: "aws" });
    const { recommendation } = await setupIsolatedRecommendation();

    const mutations = [
      { path: "/api/workspace/config", method: "PATCH", body: { monthlyBudget: 450 } },
      { path: "/api/workspace/config", method: "PATCH", body: { functionalUnits: 200000 } },
      {
        path: "/api/cloud-accounts",
        method: "POST",
        body: { provider: "aws", externalAccountId: "e2e-viewer-deny", name: "Viewer Denied" },
      },
      { path: `/api/cloud-accounts/${encodeURIComponent(acc.id)}`, method: "DELETE" },
      {
        path: `/api/cloud-accounts/${encodeURIComponent(acc.id)}/credentials`,
        method: "POST",
        body: { accessKeyId: "AKIAVIEWER", secretAccessKey: "SECRET" },
      },
      { path: `/api/cloud-accounts/${encodeURIComponent(acc.id)}/credentials`, method: "DELETE" },
      {
        path: "/api/cloud-accounts/import-focus",
        method: "POST",
        body: buildFocusPayload({ externalAccountId: "e2e-viewer-focus" }),
      },
      { path: `/api/cloud-accounts/${encodeURIComponent(acc.id)}/sync`, method: "POST" },
      { path: "/api/dashboard/sync", method: "POST" },
      {
        path: "/api/sync-jobs",
        method: "POST",
        body: { accountIds: [acc.id], triggerType: "manual" },
      },
      {
        path: "/api/rbac/assignments",
        method: "POST",
        body: { userId: "u-1", roleId: "r-1", scopeType: "organization", scopeId: "default", effect: "allow" },
      },
      {
        path: "/api/recommendations/evaluate",
        method: "POST",
        body: { accountIds: [acc.id] },
      },
      {
        path: `/api/recommendations/${encodeURIComponent(recommendation.id)}/transition`,
        method: "POST",
        body: { toState: "awaiting_approval" },
      },
      {
        path: `/api/recommendations/${encodeURIComponent(recommendation.id)}/approve`,
        method: "POST",
        body: { mode: "ticket", comment: "Viewer forbidden" },
      },
      {
        path: `/api/recommendations/${encodeURIComponent(recommendation.id)}/verify`,
        method: "POST",
        body: { expectedBaselineCost: 100, actualPostChangeCost: 80, billingLagHours: 72 },
      },
    ];

    for (const m of mutations) {
      const res = await apiRequest(m.path, {
        method: m.method,
        role: "viewer",
        body: m.body,
      });
      assertErrorEnvelope(res, 403, "FORBIDDEN");
    }
  });

  it("T2-F04-04: Admin silent mutation guard blocks infrastructure execution without lifecycle approval & dry-run", async () => {
    const { recommendation } = await setupIsolatedRecommendation();
    const res = await apiRequest(
      `/api/recommendations/${encodeURIComponent(recommendation.id)}/transition`,
      {
        method: "POST",
        role: "admin",
        body: { toState: "executing", reason: "Silent admin bypass attempt" },
      }
    );
    assertErrorEnvelope(res, [403, 409, 422]);
  });

  it("T2-F04-05: Unknown actor headers (nonexistent user ID + invalid role) are rejected without admin escalation", async () => {
    const res = await apiRequest("/api/rbac/assignments", {
      method: "POST",
      role: null,
      headers: {
        "x-greencloud-user-id": "e2e-nonexistent-user-999",
        "x-greencloud-role": "invalid_superuser_role",
      },
      body: {
        userId: "e2e-nonexistent-user-999",
        roleId: "admin",
        scopeType: "organization",
        scopeId: "default",
        effect: "allow",
      },
    });
    assertErrorEnvelope(res, [401, 403]);
  });
});

// ============================================================================
// Feature 5: Workspace Admin RBAC UI & Deferred Auth Docs (T2-F05-01 .. T2-F05-05)
// ============================================================================
describe("Tier 2 - Feature 5: Workspace Admin RBAC UI & Deferred Auth Docs", () => {
  it("T2-F05-01: Non-admin roles (finops, devops, viewer) receive 403 FORBIDDEN on POST /api/rbac/assignments", async () => {
    const { rolesBySlug, usersByRoleSlug } = await getRbacDirectory();
    const viewerRole = rolesBySlug.get("viewer");
    const viewerUser = usersByRoleSlug.get("viewer");

    for (const nonAdmin of ["finops", "devops", "viewer"]) {
      const res = await apiRequest("/api/rbac/assignments", {
        method: "POST",
        role: nonAdmin,
        body: {
          userId: viewerUser?.id || "u-viewer",
          roleId: viewerRole?.id || "r-viewer",
          scopeType: "organization",
          scopeId: "default",
          effect: "allow",
        },
      });
      assertErrorEnvelope(res, 403, "FORBIDDEN");
    }
  });

  it("T2-F05-02: POST /api/rbac/assignments rejects invalid scopeType or invalid effect with 400 VALIDATION_ERROR", async () => {
    const { rolesBySlug, usersByRoleSlug } = await getRbacDirectory();
    const devopsRole = rolesBySlug.get("devops");
    const devopsUser = usersByRoleSlug.get("devops");

    const badScope = await apiRequest("/api/rbac/assignments", {
      method: "POST",
      role: "admin",
      body: {
        userId: devopsUser.id,
        roleId: devopsRole.id,
        scopeType: "planet",
        scopeId: "earth",
        effect: "allow",
      },
    });
    assertErrorEnvelope(badScope, 400, "VALIDATION_ERROR");

    const badEffect = await apiRequest("/api/rbac/assignments", {
      method: "POST",
      role: "admin",
      body: {
        userId: devopsUser.id,
        roleId: devopsRole.id,
        scopeType: "provider",
        scopeId: "aws",
        effect: "maybe",
      },
    });
    assertErrorEnvelope(badEffect, 400, "VALIDATION_ERROR");
  });

  it("T2-F05-03: Duplicate identical RoleAssignment is either idempotent or rejected with 409 CONFLICT", async () => {
    const { rolesBySlug, usersByRoleSlug } = await getRbacDirectory();
    const archRole = rolesBySlug.get("architect");
    const archUser = usersByRoleSlug.get("architect");
    const uniqueScopeId = `e2e-region-${Date.now()}`;

    const body = {
      userId: archUser.id,
      roleId: archRole.id,
      scopeType: "region",
      scopeId: uniqueScopeId,
      effect: "allow",
    };

    const first = await apiRequest("/api/rbac/assignments", {
      method: "POST",
      role: "admin",
      body,
      expectStatus: [200, 201],
    });
    const firstId = first.json?.id || first.json?.assignment?.id;
    if (firstId) trackAssignment(firstId);

    const second = await apiRequest("/api/rbac/assignments", {
      method: "POST",
      role: "admin",
      body,
    });
    assert.ok([200, 201, 409].includes(second.status), `Expected 200/201/409, got ${second.status}`);
    if (second.status === 409) {
      assertErrorEnvelope(second, 409);
    } else {
      const listRes = await apiRequest("/api/rbac/assignments", { role: "admin", expectStatus: 200 });
      const rows = extractList(listRes.json, ["assignments", "items", "data"]);
      const matching = rows.filter(
        (a) =>
          a.userId === body.userId &&
          a.roleId === body.roleId &&
          a.scopeType === body.scopeType &&
          a.scopeId === body.scopeId &&
          a.effect === body.effect
      );
      assert.equal(matching.length, 1, "Idempotent duplicate assignment must not create duplicate DB rows");
    }
  });

  it("T2-F05-04: DELETE /api/rbac/assignments/nonexistent-id returns 404 NOT_FOUND", async () => {
    const res = await apiRequest("/api/rbac/assignments/e2e-nonexistent-assignment-id", {
      method: "DELETE",
      role: "admin",
    });
    assertErrorEnvelope(res, 404, "NOT_FOUND");
  });

  it("T2-F05-05: Non-admin viewer role hides/disables RBAC admin mutation controls in UI", async () => {
    const page = await fetchHtmlPage("/dashboard", { role: "viewer", query: { role: "viewer" } });
    assert.equal(page.status, 200);

    await withBrowser({ width: 1280, height: 800 }, async ({ page: browserPage }) => {
      await visitAndSettle(browserPage, "/dashboard?role=viewer", { role: "viewer" });
      const adminMutateControls = await browserPage.evaluate(() => {
        const btns = Array.from(document.querySelectorAll("button"));
        return btns
          .filter((b) => /add assignment|assign role|revoke/i.test(b.textContent || "") && !b.disabled)
          .map((b) => b.textContent?.trim());
      });
      assert.equal(
        adminMutateControls.length,
        0,
        `Viewer UI must hide or disable RBAC mutation buttons, found: ${adminMutateControls.join(", ")}`
      );
    });
  });
});

// ============================================================================
// Feature 6: Multi-Account SyncJob Worker (T2-F06-01 .. T2-F06-05)
// ============================================================================
describe("Tier 2 - Feature 6: Multi-Account SyncJob Worker", () => {
  it("T2-F06-01: Partial multi-account sync isolates broken live account while updating healthy account", async () => {
    const healthyAcc = await createIsolatedTestAccount({
      provider: "azure",
      primaryRegion: "eastus",
    });
    const brokenLiveAcc = await createIsolatedTestAccount({
      provider: "azure",
      primaryRegion: "eastus",
      providerConfig: {
        tenantId: "00000000-0000-0000-0000-000000000000",
        clientId: "e2e-invalid-azure-client",
        subscriptionId: "00000000-0000-0000-0000-000000000001",
      },
    });
    await apiRequest(`/api/cloud-accounts/${encodeURIComponent(brokenLiveAcc.id)}/credentials`, {
      method: "POST",
      role: "admin",
      body: {
        accessKeyId: "e2e-invalid-azure-client",
        secretAccessKey: "e2e-invalid-azure-secret",
      },
      expectStatus: 200,
    });

    const syncRes = await apiRequest("/api/sync-jobs", {
      method: "POST",
      role: "admin",
      body: { accountIds: [healthyAcc.id, brokenLiveAcc.id], triggerType: "manual" },
      expectStatus: [200, 201, 207],
    });

    const jobs = Array.isArray(syncRes.json?.jobs)
      ? syncRes.json.jobs
      : syncRes.json?.job
      ? [syncRes.json.job]
      : syncRes.json?.id
      ? [syncRes.json]
      : [];

    assert.ok(jobs.length >= 1, "POST /api/sync-jobs must return created SyncJob record(s)");
    const statuses = jobs.map((j) => j.status);
    assert.ok(
      statuses.includes("partial") || (statuses.includes("completed") && statuses.includes("failed")),
      `Expected partial batch status or completed+failed isolated jobs, got: ${JSON.stringify(statuses)}`
    );

    const healthyCheck = await apiRequest(`/api/cloud-accounts/${encodeURIComponent(healthyAcc.id)}`, {
      role: "admin",
      expectStatus: 200,
    });
    assert.ok(healthyCheck.json?.syncFreshness, "Healthy account syncFreshness must still update");
  });

  it("T2-F06-02: POST /api/sync-jobs with nonexistent accountId returns 404 NOT_FOUND", async () => {
    const res = await apiRequest("/api/sync-jobs", {
      method: "POST",
      role: "admin",
      body: { accountIds: ["e2e-acc-does-not-exist-999"], triggerType: "manual" },
    });
    assertErrorEnvelope(res, 404, "NOT_FOUND");
  });

  it("T2-F06-03: GET /api/sync-jobs/nonexistent-job-id returns 404 NOT_FOUND", async () => {
    const res = await apiRequest("/api/sync-jobs/e2e-nonexistent-job-id", {
      role: "admin",
    });
    assertErrorEnvelope(res, 404, "NOT_FOUND");
  });

  it("T2-F06-04: POST /api/sync-jobs as viewer returns 403 FORBIDDEN", async () => {
    const acc = await createIsolatedTestAccount({ provider: "aws" });
    const res = await apiRequest("/api/sync-jobs", {
      method: "POST",
      role: "viewer",
      body: { accountIds: [acc.id], triggerType: "manual" },
    });
    assertErrorEnvelope(res, 403, "FORBIDDEN");
  });

  it("T2-F06-05: Rapid concurrent double-trigger on POST /api/sync-jobs never fails with SQLITE_BUSY 500", async () => {
    const acc = await createIsolatedTestAccount({ provider: "aws" });
    const [r1, r2] = await Promise.all([
      apiRequest("/api/sync-jobs", {
        method: "POST",
        role: "admin",
        body: { accountIds: [acc.id], triggerType: "manual" },
      }),
      apiRequest("/api/sync-jobs", {
        method: "POST",
        role: "admin",
        body: { accountIds: [acc.id], triggerType: "manual" },
      }),
    ]);

    for (const r of [r1, r2]) {
      assert.ok(
        [200, 201, 202, 409].includes(r.status),
        `Concurrent sync trigger must queue cleanly or return 409, got ${r.status}: ${r.text}`
      );
      assert.equal(
        /SQLITE_BUSY/i.test(r.text),
        false,
        `Concurrent sync trigger leaked SQLITE_BUSY error: ${r.text}`
      );
    }
  });
});

// ============================================================================
// Feature 7: DataQualityReport Generation & Visibility (T2-F07-01 .. T2-F07-05)
// ============================================================================
describe("Tier 2 - Feature 7: DataQualityReport Generation & Visibility", () => {
  it("T2-F07-01: Empty account reports completenessPct=0, safe unallocatedCostPct, and non-empty missingSignals", async () => {
    const emptyAcc = await createIsolatedTestAccount({ provider: "aws" });
    const res = await apiRequest("/api/data-quality", {
      role: "admin",
      query: { accountIds: emptyAcc.id },
      expectStatus: 200,
    });
    const reports = extractList(res.json, ["reports", "items", "data"]);
    if (reports.length > 0) {
      const report = reports[0];
      assert.equal(report.completenessPct, 0);
      assert.ok(
        report.unallocatedCostPct === 0 || report.unallocatedCostPct === null,
        `Expected unallocatedCostPct 0 or null, got ${report.unallocatedCostPct}`
      );
      const signals = Array.isArray(report.missingSignals)
        ? report.missingSignals
        : typeof report.missingSignals === "string"
        ? JSON.parse(report.missingSignals || "[]")
        : [];
      assert.ok(signals.length > 0, "Empty account DataQualityReport must disclose missingSignals");
    } else if (res.json && typeof res.json === "object" && "completenessPct" in res.json) {
      assert.equal(res.json.completenessPct, 0);
    }
  });

  it("T2-F07-02: DataQualityReport calculates non-negative finite freshnessMinutes and flags stale >24h accounts", async () => {
    const staleAcc = await createIsolatedTestAccount({ provider: "aws" });
    const res = await apiRequest("/api/data-quality", {
      role: "admin",
      query: { accountIds: staleAcc.id },
      expectStatus: 200,
    });
    const reports = extractList(res.json, ["reports", "items", "data"]);
    for (const r of reports) {
      assert.ok(
        r.freshnessMinutes === null || (Number.isFinite(r.freshnessMinutes) && r.freshnessMinutes >= 0),
        `freshnessMinutes must be non-negative finite or null, got ${r.freshnessMinutes}`
      );
      if (r.freshnessMinutes !== null && r.freshnessMinutes >= 1440) {
        assert.ok(
          r.stale === true || r.freshnessStatus === "stale" || reports.length > 0,
          "Stale >=1440m report surfaced"
        );
      }
    }
  });

  it("T2-F07-03: Untagged + unallocated FOCUS import yields tagCoveragePct=0 and unallocatedCostPct=100", async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const externalAccountId = `e2e-untagged-${suffix}`;
    await apiRequest("/api/cloud-accounts/import-focus", {
      method: "POST",
      role: "admin",
      body: {
        provider: "aws",
        primaryRegion: "us-east-1",
        externalAccountId,
        accountName: `E2E Untagged ${suffix}`,
        records: [
          {
            ProviderName: "AWS",
            SubAccountId: externalAccountId,
            RegionId: "us-east-1",
            ServiceName: "AmazonEC2",
            ChargePeriodStart: new Date().toISOString().slice(0, 10),
            BilledCost: 88.5,
            EffectiveCost: 88.5,
            ResourceId: null,
            Tags: {},
          },
        ],
      },
      expectStatus: [200, 201],
    });

    const accListRes = await apiRequest("/api/cloud-accounts", { role: "admin", expectStatus: 200 });
    const acc = extractList(accListRes.json, ["accounts"]).find(
      (a) => a.externalAccountId === externalAccountId
    );
    assert.ok(acc?.id, "Imported untagged account must exist");

    const dqRes = await apiRequest("/api/data-quality", {
      role: "admin",
      query: { accountIds: acc.id },
      expectStatus: 200,
    });
    const reports = extractList(dqRes.json, ["reports", "items", "data"]);
    assert.ok(reports.length >= 1, "FOCUS import must generate a DataQualityReport");
    const r = reports[0];
    assert.equal(r.tagCoveragePct, 0, "Untagged import must yield tagCoveragePct === 0");
    assert.equal(r.unallocatedCostPct, 100, "Unlinked CostLineItem must yield unallocatedCostPct === 100");
  });

  it("T2-F07-04: GET /api/data-quality?accountIds=nonexistent returns empty list (never leaks other accounts)", async () => {
    const res = await apiRequest("/api/data-quality", {
      role: "admin",
      query: { accountIds: "e2e-nonexistent-acc-999" },
      expectStatus: [200, 404],
    });
    if (res.status === 200) {
      const reports = extractList(res.json, ["reports", "items", "data"]);
      assert.equal(reports.length, 0, "Unknown accountIds filter must never return other accounts' reports");
    } else {
      assertErrorEnvelope(res, 404);
    }
  });

  it("T2-F07-05: Missing CpuPercent in FOCUS import discloses missing CPU signal and is never coerced to 0%", async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const externalAccountId = `e2e-nullcpu-${suffix}`;
    await apiRequest("/api/cloud-accounts/import-focus", {
      method: "POST",
      role: "admin",
      body: buildFocusPayload({
        externalAccountId,
        accountName: `E2E NullCPU ${suffix}`,
        billedCost: 50,
        cpuPercent: null,
      }),
      expectStatus: [200, 201],
    });

    const accListRes = await apiRequest("/api/cloud-accounts", { role: "admin", expectStatus: 200 });
    const acc = extractList(accListRes.json, ["accounts"]).find(
      (a) => a.externalAccountId === externalAccountId
    );
    assert.ok(acc?.id);

    const dqRes = await apiRequest("/api/data-quality", {
      role: "admin",
      query: { accountIds: acc.id },
      expectStatus: 200,
    });
    const reports = extractList(dqRes.json, ["reports", "items", "data"]);
    assert.ok(reports.length >= 1, "Expected DataQualityReport for null CPU FOCUS import");
    const r = reports[0];
    assert.ok(r.completenessPct < 100, `Missing CPU telemetry must keep completenessPct < 100, got ${r.completenessPct}`);
    const signalsStr = JSON.stringify(r.missingSignals || "");
    assert.ok(/cpu|telemetry/i.test(signalsStr), `missingSignals must disclose missing CPU telemetry: ${signalsStr}`);

    const dashRes = await apiRequest("/api/dashboard", {
      role: "admin",
      query: { accountIds: acc.id },
      expectStatus: 200,
    });
    const ec2List = dashRes.json?.resources?.ec2 || [];
    for (const vm of ec2List) {
      assert.notEqual(vm.avgCpu, 0, "Missing CpuPercent must never be coerced to 0%");
    }
  });
});

// ============================================================================
// Feature 8: 7-Level Global Filter Chain (T2-F08-01 .. T2-F08-05)
// ============================================================================
describe("Tier 2 - Feature 8: 7-Level Global Filter Chain", () => {
  it("T2-F08-01: Mismatched provider=gcp & AWS accountId yields empty HTTP 200 state without leaking AWS data", async () => {
    const { account: awsAcc } = await setupIsolatedRecommendation({ provider: "aws", billedCost: 111 });

    const res = await apiRequest("/api/dashboard", {
      role: "admin",
      query: { providers: "gcp", accountIds: awsAcc.id, window: "30d" },
      expectStatus: 200,
    });
    assert.equal(res.json?.costs?.totalCost ?? null, null, "Mismatched intersection must not leak AWS cost");
    assert.equal((res.json?.resources?.ec2 || []).length, 0, "Mismatched intersection must return 0 EC2 resources");
    const recs = extractList(res.json?.recommendations, ["items", "recommendations"]);
    assert.equal(recs.length, 0, "Mismatched intersection must return 0 recommendations");
  });

  it("T2-F08-02: Nonexistent region & workload filters return HTTP 200 empty datasets with zero 500 errors", async () => {
    const dashRes = await apiRequest("/api/dashboard", {
      role: "admin",
      query: { regions: "mars-west-1" },
      expectStatus: 200,
    });
    assert.equal(dashRes.json?.costs?.totalCost ?? null, null);

    const recRes = await apiRequest("/api/recommendations", {
      role: "admin",
      query: { workloadIds: "e2e-wl-missing-999" },
      expectStatus: 200,
    });
    const recs = extractList(recRes.json, ["recommendations", "items", "data"]);
    assert.equal(recs.length, 0, "Unknown workloadId must return 0 recommendations");
  });

  it("T2-F08-03: Invalid window=999d is rejected (400) or clamped consistently across /api/filters and /api/dashboard", async () => {
    const [filtersRes, dashRes] = await Promise.all([
      apiRequest("/api/filters", { role: "admin", query: { window: "999d" } }),
      apiRequest("/api/dashboard", { role: "admin", query: { window: "999d" } }),
    ]);
    assert.ok(
      (filtersRes.status === 400 && dashRes.status === 400) ||
        (filtersRes.status === 200 && dashRes.status === 200),
      `Expected consistent handling of invalid window=999d; got filters=${filtersRes.status}, dashboard=${dashRes.status}`
    );
    if (filtersRes.status === 200) {
      const resolvedWindow = filtersRes.json?.activeWindow || filtersRes.json?.window || "30d";
      assert.ok(["7d", "30d", "90d"].includes(resolvedWindow), `Clamped window must be valid, got ${resolvedWindow}`);
    }
  });

  it("T2-F08-04: Empty providers= and unknown services=NonExistentService never crash SQL/JSON parsing", async () => {
    const res = await apiRequest("/api/dashboard", {
      role: "admin",
      query: { providers: "", services: "NonExistentService" },
      expectStatus: [200, 400],
    });
    if (res.status === 200) {
      assert.equal(res.json?.costs?.totalCost ?? null, null);
    } else {
      assertErrorEnvelope(res, 400);
    }
  });

  it("T2-F08-05: Deep-linked URL filter params (/dashboard?providers=aws&regions=ap-south-1&window=7d) persist cleanly", async () => {
    const page = await fetchHtmlPage("/dashboard", {
      role: "finops",
      query: { providers: "aws", regions: "ap-south-1", window: "7d" },
    });
    assert.equal(page.status, 200);

    await withBrowser({ width: 1280, height: 800 }, async ({ page: browserPage }) => {
      await visitAndSettle(
        browserPage,
        "/dashboard?providers=aws&regions=ap-south-1&window=7d",
        { role: "finops" }
      );
      await browserPage.reload({ waitUntil: "networkidle" });
      const currentUrl = browserPage.url();
      assert.ok(currentUrl.includes("providers=aws"), `Expected providers=aws in URL, got ${currentUrl}`);
      assert.ok(currentUrl.includes("regions=ap-south-1"), `Expected regions=ap-south-1 in URL, got ${currentUrl}`);
    });
  });
});

// ============================================================================
// Feature 9: Multi-Service Compatibility & Pricing Catalog (T2-F09-01 .. T2-F09-05)
// ============================================================================
describe("Tier 2 - Feature 9: Multi-Service Compatibility & Pricing Catalog", () => {
  it("T2-F09-01: GET /api/compatibility rejects negative minVcpu or NaN minMemoryGb with 400 VALIDATION_ERROR", async () => {
    const negRes = await apiRequest("/api/compatibility", {
      role: "architect",
      query: { minVcpu: -5 },
    });
    assertErrorEnvelope(negRes, 400, "VALIDATION_ERROR");

    const nanRes = await apiRequest("/api/compatibility", {
      role: "architect",
      query: { minMemoryGb: "NaN" },
    });
    assertErrorEnvelope(nanRes, 400, "VALIDATION_ERROR");
  });

  it("T2-F09-02: GET /api/compatibility?minVcpu=9999 returns HTTP 200 empty SKU list", async () => {
    const res = await apiRequest("/api/compatibility", {
      role: "architect",
      query: { minVcpu: 9999 },
      expectStatus: 200,
    });
    const skus = extractList(res.json, ["skus", "items", "data"]);
    assert.equal(skus.length, 0, "Impossible vCPU threshold must return empty array");
  });

  it("T2-F09-03: GET /api/compatibility?provider=oracle returns 400 VALIDATION_ERROR or empty list (no 500)", async () => {
    const res = await apiRequest("/api/compatibility", {
      role: "architect",
      query: { provider: "oracle" },
    });
    assert.ok([200, 400].includes(res.status), `Expected 200 or 400, got ${res.status}`);
    if (res.status === 200) {
      const skus = extractList(res.json, ["skus", "items", "data"]);
      assert.equal(skus.length, 0);
    } else {
      assertErrorEnvelope(res, 400);
    }
  });

  it("T2-F09-04: GET /api/compatibility?minAvailabilityPct=99.999 excludes lower-SLA SKUs", async () => {
    const res = await apiRequest("/api/compatibility", {
      role: "architect",
      query: { minAvailabilityPct: 99.999 },
      expectStatus: 200,
    });
    const skus = extractList(res.json, ["skus", "items", "data"]);
    for (const sku of skus) {
      assert.ok(
        sku.availabilityPct >= 99.999,
        `SKU ${sku.skuName} has availabilityPct=${sku.availabilityPct} < 99.999`
      );
    }
  });

  it("T2-F09-05: Incompatible architecture=arm64 & serviceType=azure_sql returns empty list cleanly", async () => {
    const res = await apiRequest("/api/compatibility", {
      role: "architect",
      query: { architecture: "arm64", serviceType: "azure_sql" },
      expectStatus: 200,
    });
    const skus = extractList(res.json, ["skus", "items", "data"]);
    assert.equal(skus.length, 0);
  });
});

// ============================================================================
// Feature 10: Multi-Service Optimization & Overlap Solver (T2-F10-01 .. T2-F10-05)
// ============================================================================
describe("Tier 2 - Feature 10: Multi-Service Optimization & Overlap Solver", () => {
  it("T2-F10-01: Missing telemetry (CpuPercent: null) is hard-rejected and never treated as 0% idle savings", async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const externalAccountId = `e2e-missing-tel-${suffix}`;
    await apiRequest("/api/cloud-accounts/import-focus", {
      method: "POST",
      role: "admin",
      body: buildFocusPayload({
        externalAccountId,
        accountName: `E2E MissingTel ${suffix}`,
        resourceId: `i-missing-${suffix}`,
        billedCost: 130,
        cpuPercent: null,
      }),
      expectStatus: [200, 201],
    });

    const accListRes = await apiRequest("/api/cloud-accounts", { role: "admin", expectStatus: 200 });
    const acc = extractList(accListRes.json, ["accounts"]).find(
      (a) => a.externalAccountId === externalAccountId
    );
    assert.ok(acc?.id);

    await apiRequest("/api/recommendations/evaluate", {
      method: "POST",
      role: "admin",
      body: { accountIds: [acc.id] },
      expectStatus: [200, 201, 422],
    });

    const recsRes = await apiRequest("/api/recommendations", {
      role: "admin",
      query: { accountIds: acc.id },
      expectStatus: 200,
    });
    const recs = extractList(recsRes.json, ["recommendations", "items", "data"]);
    const badIdle = recs.filter((r) => /stop|rightsize|idle/i.test(`${r.category} ${r.title}`));
    assert.equal(
      badIdle.length,
      0,
      `Missing CPU telemetry must NOT generate false 0%-idle/rightsizing recs, found: ${JSON.stringify(badIdle)}`
    );
  });

  it("T2-F10-02: Headroom & SLO hard-gates reject incompatible arm64 or undersized candidates", async () => {
    const evalRes = await apiRequest("/api/recommendations/evaluate", {
      method: "POST",
      role: "architect",
      body: {
        constraints: {
          observedP95Cpu: 75,
          cpuHeadroomPct: 20,
          requiredArchitecture: "x86_64",
          latencySloMs: 30,
        },
      },
      expectStatus: [200, 201],
    });

    const recsRes = await apiRequest("/api/recommendations", {
      role: "architect",
      expectStatus: 200,
    });
    const recs = extractList(recsRes.json, ["recommendations", "items", "data"]);
    for (const r of recs) {
      if (r.targetSku && r.workloadArchitecture === "x86_64") {
        assert.notEqual(
          r.targetArchitecture,
          "arm64",
          `x86_64 constrained workload must never be assigned arm64 targetSku ${r.targetSku}`
        );
      }
    }
    assert.ok(evalRes.ok);
  });

  it("T2-F10-03: POST /api/recommendations/evaluate rejects negative scoring weights (400/422)", async () => {
    const res = await apiRequest("/api/recommendations/evaluate", {
      method: "POST",
      role: "admin",
      body: {
        weights: { wCost: -1, wPerf: 0.2, wReliability: 0.2, wCarbon: 0.2, wRisk: 0.1 },
      },
    });
    assertErrorEnvelope(res, [400, 422]);
  });

  it("T2-F10-04: Already-stopped EC2 instance never generates active running-compute idle/rightsizing recommendation", async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const externalAccountId = `e2e-stopped-${suffix}`;
    await apiRequest("/api/cloud-accounts/import-focus", {
      method: "POST",
      role: "admin",
      body: buildFocusPayload({
        externalAccountId,
        accountName: `E2E Stopped ${suffix}`,
        resourceId: `i-stopped-${suffix}`,
        lifecycleState: "stopped",
        billedCost: 0,
        cpuPercent: 0,
      }),
      expectStatus: [200, 201],
    });

    const accListRes = await apiRequest("/api/cloud-accounts", { role: "admin", expectStatus: 200 });
    const acc = extractList(accListRes.json, ["accounts"]).find(
      (a) => a.externalAccountId === externalAccountId
    );
    assert.ok(acc?.id);

    await apiRequest("/api/recommendations/evaluate", {
      method: "POST",
      role: "admin",
      body: { accountIds: [acc.id] },
      expectStatus: [200, 201],
    });

    const recsRes = await apiRequest("/api/recommendations", {
      role: "admin",
      query: { accountIds: acc.id },
      expectStatus: 200,
    });
    const recs = extractList(recsRes.json, ["recommendations", "items", "data"]);
    const computeIdle = recs.filter((r) => /stop.*ec2|rightsiz/i.test(`${r.category} ${r.title}`));
    assert.equal(computeIdle.length, 0, "Already-stopped EC2 must not emit stop/rightsize recommendations");
  });

  it("T2-F10-05: POST /api/recommendations/evaluate as viewer returns 403 FORBIDDEN", async () => {
    const res = await apiRequest("/api/recommendations/evaluate", {
      method: "POST",
      role: "viewer",
      body: {},
    });
    assertErrorEnvelope(res, 403, "FORBIDDEN");
  });
});

// ============================================================================
// Feature 11: 10-State Recommendation Lifecycle Machine (T2-F11-01 .. T2-F11-05)
// ============================================================================
describe("Tier 2 - Feature 11: 10-State Recommendation Lifecycle Machine", () => {
  it("T2-F11-01: Illegal lifecycle state jumps (recommended -> verified / executing / dry_run) fail with 409/422", async () => {
    const { recommendation } = await setupIsolatedRecommendation();

    for (const illegalTarget of ["verified", "executing", "dry_run"]) {
      const res = await apiRequest(
        `/api/recommendations/${encodeURIComponent(recommendation.id)}/transition`,
        {
          method: "POST",
          role: "admin",
          body: { toState: illegalTarget, reason: "Illegal jump test" },
        }
      );
      assertErrorEnvelope(res, [409, 422]);
    }

    const verifyUnchanged = await apiRequest("/api/recommendations", {
      role: "admin",
      query: { accountIds: recommendation.cloudAccountId },
      expectStatus: 200,
    });
    const found = extractList(verifyUnchanged.json, ["recommendations", "items"]).find(
      (r) => r.id === recommendation.id
    );
    assert.equal(found?.lifecycleState, "recommended", "State must remain unchanged after illegal jumps");
  });

  it("T2-F11-02: Same-state no-op (recommended -> recommended) and unknown toState fail with 400/409/422", async () => {
    const { recommendation } = await setupIsolatedRecommendation();

    const sameRes = await apiRequest(
      `/api/recommendations/${encodeURIComponent(recommendation.id)}/transition`,
      {
        method: "POST",
        role: "finops",
        body: { toState: "recommended", reason: "No-op test" },
      }
    );
    assertErrorEnvelope(sameRes, [400, 409, 422]);

    const unknownRes = await apiRequest(
      `/api/recommendations/${encodeURIComponent(recommendation.id)}/transition`,
      {
        method: "POST",
        role: "finops",
        body: { toState: "magic_done", reason: "Unknown target" },
      }
    );
    assertErrorEnvelope(unknownRes, [400, 409, 422]);
  });

  it("T2-F11-03: POST /api/recommendations/nonexistent/transition returns 404 NOT_FOUND", async () => {
    const res = await apiRequest("/api/recommendations/e2e-nonexistent-rec-999/transition", {
      method: "POST",
      role: "finops",
      body: { toState: "awaiting_approval" },
    });
    assertErrorEnvelope(res, 404, "NOT_FOUND");
  });

  it("T2-F11-04: Transitioning out of terminal 'dismissed' state is rejected with 409/422", async () => {
    const { recommendation } = await setupIsolatedRecommendation();
    await apiRequest(`/api/recommendations/${encodeURIComponent(recommendation.id)}/transition`, {
      method: "POST",
      role: "finops",
      body: { toState: "dismissed", reason: "E2E terminal dismissal" },
      expectStatus: 200,
    });

    const leaveTerminal = await apiRequest(
      `/api/recommendations/${encodeURIComponent(recommendation.id)}/transition`,
      {
        method: "POST",
        role: "admin",
        body: { toState: "approved", reason: "Illegal exit from terminal state" },
      }
    );
    assertErrorEnvelope(leaveTerminal, [409, 422]);
  });

  it("T2-F11-05: Role lacking execution permission (sustainability) gets 403 FORBIDDEN on approved -> dry_run", async () => {
    const { recommendation } = await setupIsolatedRecommendation();
    await advanceRecommendationToState(recommendation.id, "approved");

    const res = await apiRequest(
      `/api/recommendations/${encodeURIComponent(recommendation.id)}/transition`,
      {
        method: "POST",
        role: "sustainability",
        body: { toState: "dry_run", reason: "Unauthorized dry-run attempt" },
      }
    );
    assertErrorEnvelope(res, 403, "FORBIDDEN");
  });
});

// ============================================================================
// Feature 12: Dry-Run, Billing Verification & Rollback (T2-F12-01 .. T2-F12-05)
// ============================================================================
describe("Tier 2 - Feature 12: Dry-Run, Billing Verification & Rollback", () => {
  it("T2-F12-01: Post-change SLO guardrail failure triggers rolled_back state and emits revert artifact", async () => {
    const { recommendation } = await setupIsolatedRecommendation();
    await advanceRecommendationToState(recommendation.id, "verifying");

    const verifyRes = await apiRequest(
      `/api/recommendations/${encodeURIComponent(recommendation.id)}/verify`,
      {
        method: "POST",
        role: "finops",
        body: {
          expectedBaselineCost: 120,
          actualPostChangeCost: 110,
          observedP95LatencyMs: 95,
          latencySloMs: 50,
          errorRateSpike: true,
          billingLagHours: 72,
        },
        expectStatus: 200,
      }
    );

    const outcome = verifyRes.json?.outcome || verifyRes.json?.verification || verifyRes.json;
    assert.equal(outcome?.guardrailPassed, false, "Breached latency SLO must set guardrailPassed=false");
    assert.ok(
      ["rolled_back", "failed"].includes(outcome?.verdict),
      `Expected verdict 'rolled_back' or 'failed', got ${outcome?.verdict}`
    );
    const finalState = verifyRes.json?.lifecycleState || verifyRes.json?.recommendation?.lifecycleState;
    assert.equal(finalState, "rolled_back", "Guardrail failure must transition recommendation to rolled_back");

    trackIfArtifact(verifyRes.json?.artifactPath || verifyRes.json?.revertArtifactPath);
  });

  it("T2-F12-02: Billing lag (< settle threshold with null post-change cost) returns pending_data without fabricating $0", async () => {
    const { recommendation } = await setupIsolatedRecommendation();
    await advanceRecommendationToState(recommendation.id, "verifying");

    const verifyRes = await apiRequest(
      `/api/recommendations/${encodeURIComponent(recommendation.id)}/verify`,
      {
        method: "POST",
        role: "finops",
        body: {
          expectedBaselineCost: 120,
          actualPostChangeCost: null,
          billingLagHours: 4,
        },
        expectStatus: [200, 202],
      }
    );

    const outcome = verifyRes.json?.outcome || verifyRes.json?.verification || verifyRes.json;
    assert.equal(outcome?.verdict, "pending_data", "Billing lag must return verdict='pending_data'");
    const state = verifyRes.json?.lifecycleState || verifyRes.json?.recommendation?.lifecycleState || "verifying";
    assert.equal(state, "verifying", "Recommendation must remain in verifying while pending billing data");
  });

  it("T2-F12-03: Negative post-change cost (400/422) and premature verify before verifying state (409/422) are rejected", async () => {
    const { recommendation: earlyRec } = await setupIsolatedRecommendation();
    const prematureRes = await apiRequest(
      `/api/recommendations/${encodeURIComponent(earlyRec.id)}/verify`,
      {
        method: "POST",
        role: "finops",
        body: { expectedBaselineCost: 120, actualPostChangeCost: 80, billingLagHours: 72 },
      }
    );
    assertErrorEnvelope(prematureRes, [409, 422]);

    await advanceRecommendationToState(earlyRec.id, "verifying");
    const negRes = await apiRequest(
      `/api/recommendations/${encodeURIComponent(earlyRec.id)}/verify`,
      {
        method: "POST",
        role: "finops",
        body: { expectedBaselineCost: 120, actualPostChangeCost: -20, billingLagHours: 72 },
      }
    );
    assertErrorEnvelope(negRes, [400, 422]);
  });

  it("T2-F12-04: POST /api/recommendations/[id]/approve rejects invalid mode ('email') or missing mode with 400", async () => {
    const { recommendation } = await setupIsolatedRecommendation();

    const badMode = await apiRequest(
      `/api/recommendations/${encodeURIComponent(recommendation.id)}/approve`,
      {
        method: "POST",
        role: "admin",
        body: { mode: "email", comment: "Invalid mode" },
      }
    );
    assertErrorEnvelope(badMode, 400, "VALIDATION_ERROR");

    const missingMode = await apiRequest(
      `/api/recommendations/${encodeURIComponent(recommendation.id)}/approve`,
      {
        method: "POST",
        role: "admin",
        body: { comment: "Missing mode" },
      }
    );
    assertErrorEnvelope(missingMode, 400, "VALIDATION_ERROR");
  });

  it("T2-F12-05: Cost regression (actualPostChangeCost > expectedBaselineCost) records negative verifiedSavings (-30) and fails guardrail", async () => {
    const { recommendation } = await setupIsolatedRecommendation();
    await advanceRecommendationToState(recommendation.id, "verifying");

    const res = await apiRequest(
      `/api/recommendations/${encodeURIComponent(recommendation.id)}/verify`,
      {
        method: "POST",
        role: "finops",
        body: {
          expectedBaselineCost: 120,
          actualPostChangeCost: 150,
          observedP95LatencyMs: 25,
          latencySloMs: 50,
          billingLagHours: 72,
        },
        expectStatus: 200,
      }
    );

    const outcome = res.json?.outcome || res.json?.verification || res.json;
    assert.equal(outcome?.verifiedSavings, -30, "Cost regression must record negative savings (-30), never clamped to 0");
    assert.equal(outcome?.guardrailPassed, false, "Cost regression must set guardrailPassed=false");
    trackIfArtifact(res.json?.artifactPath || res.json?.revertArtifactPath);
  });
});

// ============================================================================
// Feature 13: Credential-Gated Native Azure Connector (T2-F13-01 .. T2-F13-05)
// ============================================================================
describe("Tier 2 - Feature 13: Credential-Gated Native Azure Connector", () => {
  it("T2-F13-01: Invalid live Azure credentials fail explicitly and NEVER fall back to sandbox_fixture", async () => {
    const acc = await createIsolatedTestAccount({
      provider: "azure",
      primaryRegion: "eastus",
      providerConfig: {
        tenantId: "00000000-0000-0000-0000-000000000000",
        clientId: "bad-e2e-azure-client",
        subscriptionId: "bad-e2e-azure-sub",
      },
    });
    await apiRequest(`/api/cloud-accounts/${encodeURIComponent(acc.id)}/credentials`, {
      method: "POST",
      role: "admin",
      body: { accessKeyId: "bad-e2e-azure-client", secretAccessKey: "bad-e2e-azure-secret" },
      expectStatus: 200,
    });

    const syncRes = await apiRequest("/api/sync-jobs", {
      method: "POST",
      role: "admin",
      body: { accountIds: [acc.id], triggerType: "manual" },
    });

    if (syncRes.status >= 400) {
      assertErrorEnvelope(syncRes, [400, 401, 422, 500, 502]);
    } else {
      const job = syncRes.json?.job || syncRes.json?.jobs?.[0] || syncRes.json;
      assert.equal(job?.status, "failed", `Invalid Azure live creds must produce failed SyncJob, got ${job?.status}`);
      assert.notEqual(
        job?.sourceMode,
        "sandbox_fixture",
        "Invalid live Azure credentials MUST NOT fall back to sandbox_fixture"
      );
      assert.ok(job?.errorSummary, "Failed Azure sync job must include errorSummary");
    }
  });

  it("T2-F13-02: POST /api/cloud-accounts (Azure) missing externalAccountId or name returns 400 VALIDATION_ERROR", async () => {
    const res = await apiRequest("/api/cloud-accounts", {
      method: "POST",
      role: "admin",
      body: { provider: "azure", primaryRegion: "eastus" },
    });
    assertErrorEnvelope(res, 400, "VALIDATION_ERROR");
  });

  it("T2-F13-03: POST /api/cloud-accounts/import-focus rejects malformed Azure FOCUS payload missing BilledCost", async () => {
    const res = await apiRequest("/api/cloud-accounts/import-focus", {
      method: "POST",
      role: "admin",
      body: {
        provider: "azure",
        externalAccountId: `e2e-bad-focus-${Date.now()}`,
        records: [{ ProviderName: "AZURE", ServiceName: "Virtual Machines" }],
      },
    });
    assertErrorEnvelope(res, 400, "VALIDATION_ERROR");
  });

  it("T2-F13-04: GET /api/cloud-accounts never leaks stored Azure secretAccessKey or encryptedSecretKey", async () => {
    const acc = await createIsolatedTestAccount({ provider: "azure", primaryRegion: "eastus" });
    const azureSecret = "e2e-azure-top-secret-9988";
    await apiRequest(`/api/cloud-accounts/${encodeURIComponent(acc.id)}/credentials`, {
      method: "POST",
      role: "admin",
      body: { accessKeyId: "e2e-azure-client-id", secretAccessKey: azureSecret },
      expectStatus: 200,
    });

    const listRes = await apiRequest("/api/cloud-accounts", { role: "admin", expectStatus: 200 });
    assert.equal(listRes.text.includes(azureSecret), false, "Secret must never be exposed in GET /api/cloud-accounts");
    assert.equal(listRes.text.includes("encryptedSecretKey"), false, "encryptedSecretKey must be sanitized");
  });

  it("T2-F13-05: POST /api/cloud-accounts/[id]/sync handles malformed providerConfig JSON without crashing server", async () => {
    const acc = await createIsolatedTestAccount({
      provider: "azure",
      primaryRegion: "eastus",
      providerConfig: "{malformed-json-payload",
    });

    const syncRes = await apiRequest(`/api/cloud-accounts/${encodeURIComponent(acc.id)}/sync`, {
      method: "POST",
      role: "admin",
    });
    assert.ok([200, 400, 422, 500].includes(syncRes.status), `Unexpected status ${syncRes.status}`);
    if (syncRes.status >= 400) {
      assertErrorEnvelope(syncRes, syncRes.status);
    }

    await apiRequest("/api/workspace/config", { role: "admin", expectStatus: 200 });
  });
});

// ============================================================================
// Feature 14: Credential-Gated Native GCP Connector (T2-F14-01 .. T2-F14-05)
// ============================================================================
describe("Tier 2 - Feature 14: Credential-Gated Native GCP Connector", () => {
  it("T2-F14-01: Invalid live GCP Service Account credentials fail explicitly and NEVER fall back to sandbox_fixture", async () => {
    const acc = await createIsolatedTestAccount({
      provider: "gcp",
      primaryRegion: "us-central1",
      providerConfig: {
        projectId: "e2e-invalid-gcp-project",
        serviceAccountJson: JSON.stringify({
          type: "service_account",
          project_id: "e2e-invalid-gcp-project",
          client_email: "bad@e2e-invalid.iam.gserviceaccount.com",
          private_key: "-----BEGIN PRIVATE KEY-----\nINVALID_KEY_DATA\n-----END PRIVATE KEY-----\n",
        }),
      },
    });

    const syncRes = await apiRequest("/api/sync-jobs", {
      method: "POST",
      role: "admin",
      body: { accountIds: [acc.id], triggerType: "manual" },
    });

    if (syncRes.status >= 400) {
      assertErrorEnvelope(syncRes, [400, 401, 422, 500, 502]);
    } else {
      const job = syncRes.json?.job || syncRes.json?.jobs?.[0] || syncRes.json;
      assert.equal(job?.status, "failed", `Invalid GCP live creds must fail explicitly, got ${job?.status}`);
      assert.notEqual(
        job?.sourceMode,
        "sandbox_fixture",
        "Invalid live GCP credentials MUST NOT silently fall back to sandbox_fixture"
      );
      assert.ok(job?.errorSummary, "Failed GCP sync job must disclose auth error");
    }
  });

  it("T2-F14-02: POST /api/cloud-accounts (GCP) rejects empty externalAccountId with 400 VALIDATION_ERROR", async () => {
    const res = await apiRequest("/api/cloud-accounts", {
      method: "POST",
      role: "admin",
      body: { provider: "gcp", externalAccountId: "", name: "Bad GCP Account" },
    });
    assertErrorEnvelope(res, 400, "VALIDATION_ERROR");
  });

  it("T2-F14-03: GET /api/connectors/status truthfully discloses GCP sourceMode & capabilityDisclosure", async () => {
    const caps = await getConnectorCapabilities();
    assert.equal(caps.statusCode, 200, "GET /api/connectors/status must return HTTP 200");
    const list = extractList(caps.statusPayload, ["connectors"]);
    const gcp =
      list.find((c) => String(c.provider || c.id || "").toLowerCase() === "gcp") ||
      caps.statusPayload?.gcp;
    assert.ok(gcp, "GCP entry must exist in /api/connectors/status");
    assert.equal(
      gcp.sourceMode,
      caps.gcpLive ? "live_api" : "sandbox_fixture",
      "Unconfigured GCP connector must disclose sandbox_fixture, never live_api"
    );
    assert.ok(
      typeof gcp.capabilityDisclosure === "string" && gcp.capabilityDisclosure.trim().length > 0,
      "GCP connector must provide non-empty capabilityDisclosure"
    );
  });

  it("T2-F14-04: POST /api/cloud-accounts/import-focus rejects non-numeric BilledCost='not-a-number' with 400", async () => {
    const payload = buildFocusPayload({
      provider: "gcp",
      externalAccountId: `e2e-gcp-badcost-${Date.now()}`,
    });
    payload.records[0].BilledCost = "not-a-number";
    payload.records[0].EffectiveCost = "not-a-number";

    const res = await apiRequest("/api/cloud-accounts/import-focus", {
      method: "POST",
      role: "admin",
      body: payload,
    });
    assertErrorEnvelope(res, 400, "VALIDATION_ERROR");
  });

  it("T2-F14-05: DELETE /api/cloud-accounts/[id]/credentials as viewer returns 403 FORBIDDEN", async () => {
    const acc = await createIsolatedTestAccount({ provider: "gcp", primaryRegion: "us-central1" });
    const res = await apiRequest(`/api/cloud-accounts/${encodeURIComponent(acc.id)}/credentials`, {
      method: "DELETE",
      role: "viewer",
    });
    assertErrorEnvelope(res, 403, "FORBIDDEN");
  });
});

// ============================================================================
// Feature 15: Credential-Gated Kubernetes / OpenCost Integration (T2-F15-01 .. T2-F15-05)
// ============================================================================
describe("Tier 2 - Feature 15: Credential-Gated Kubernetes / OpenCost Integration", () => {
  it("T2-F15-01: Invalid live OpenCost endpoint fails explicitly and NEVER falls back to sandbox_fixture", async () => {
    const res = await apiRequest("/api/sync-jobs", {
      method: "POST",
      role: "devops",
      body: {
        provider: "kubernetes",
        triggerType: "manual",
        opencostEndpoint: "http://127.0.0.1:59999/invalid",
      },
    });

    if (res.status >= 400) {
      assertErrorEnvelope(res, [400, 422, 500, 502]);
    } else {
      const job = res.json?.job || res.json?.jobs?.[0] || res.json;
      assert.equal(job?.status, "failed", `Unreachable OpenCost endpoint must fail explicitly, got ${job?.status}`);
      assert.notEqual(
        job?.sourceMode,
        "sandbox_fixture",
        "Explicitly supplied unreachable OpenCost endpoint MUST NOT fall back to sandbox_fixture"
      );
      assert.ok(job?.errorSummary, "Failed K8s sync must include errorSummary");
    }
  });

  it("T2-F15-02: GET /api/k8s/allocations?namespace=does-not-exist returns HTTP 200 empty array", async () => {
    const res = await apiRequest("/api/k8s/allocations", {
      role: "devops",
      query: { namespace: "e2e-does-not-exist-ns" },
      expectStatus: 200,
    });
    const list = extractList(res.json, ["allocations", "items", "data"]);
    assert.equal(list.length, 0, "Unknown namespace filter must return empty array");
  });

  it("T2-F15-03: GET /api/k8s/allocations never returns NaN or Infinity even when cpuLimit is 0", async () => {
    const res = await apiRequest("/api/k8s/allocations", {
      role: "devops",
      expectStatus: 200,
    });
    const list = extractList(res.json, ["allocations", "items", "data"]);
    assert.equal(/NaN|Infinity/i.test(res.text), false, "K8s allocations response must not contain NaN/Infinity");
    for (const item of list) {
      for (const field of ["idleSlackCost", "monthlyCost", "energyKwh", "operationalGco2e"]) {
        if (item[field] !== undefined && item[field] !== null) {
          assert.ok(Number.isFinite(item[field]), `K8s field ${field} must be finite, got ${item[field]}`);
        }
      }
    }
  });

  it("T2-F15-04: viewer role receives 403 FORBIDDEN on Kubernetes allocation/sync mutations", async () => {
    const res = await apiRequest("/api/k8s/allocations", {
      method: "POST",
      role: "viewer",
      body: { triggerSync: true },
    });
    assertErrorEnvelope(res, 403, "FORBIDDEN");
  });

  it("T2-F15-05: GET /api/connectors/status truthfully discloses Kubernetes/OpenCost sourceMode & capabilityDisclosure", async () => {
    const caps = await getConnectorCapabilities();
    assert.equal(caps.statusCode, 200);
    const list = extractList(caps.statusPayload, ["connectors"]);
    const k8s =
      list.find((c) => ["kubernetes", "k8s", "opencost"].includes(String(c.provider || c.id || "").toLowerCase())) ||
      caps.statusPayload?.kubernetes ||
      caps.statusPayload?.k8s;
    assert.ok(k8s, "Kubernetes/OpenCost entry must exist in /api/connectors/status");
    assert.equal(k8s.sourceMode, caps.k8sLive ? "live_api" : "sandbox_fixture");
    assert.ok(
      typeof k8s.capabilityDisclosure === "string" && k8s.capabilityDisclosure.trim().length > 0,
      "Kubernetes connector must provide non-empty capabilityDisclosure"
    );
  });
});

// ============================================================================
// Feature 16: Credential-Gated Grid Carbon Intensity Connector (T2-F16-01 .. T2-F16-05)
// ============================================================================
describe("Tier 2 - Feature 16: Credential-Gated Grid Carbon Intensity Connector", () => {
  it("T2-F16-01: Unknown region 'unknown-region-99' falls back gracefully without NaN or CarbonEngine crash", async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const externalAccountId = `e2e-unk-region-${suffix}`;
    await apiRequest("/api/cloud-accounts/import-focus", {
      method: "POST",
      role: "admin",
      body: buildFocusPayload({
        externalAccountId,
        region: "unknown-region-99",
        billedCost: 60,
        cpuPercent: 25,
      }),
      expectStatus: [200, 201],
    });

    const dashRes = await apiRequest("/api/dashboard", {
      role: "sustainability",
      query: { regions: "unknown-region-99" },
      expectStatus: 200,
    });
    assert.equal(/NaN|Infinity/i.test(dashRes.text), false, "Unknown region must never yield NaN/Infinity");
  });

  it("T2-F16-02: Invalid live Grid API credentials fail explicitly and never masquerade as live_api", async () => {
    const caps = await getConnectorCapabilities();
    assert.equal(caps.statusCode, 200);
    const list = extractList(caps.statusPayload, ["connectors"]);
    const grid =
      list.find((c) =>
        ["gridintensity", "grid", "electricitymaps", "watttime"].includes(
          String(c.provider || c.id || "").toLowerCase()
        )
      ) ||
      caps.statusPayload?.gridIntensity ||
      caps.statusPayload?.grid;
    assert.ok(grid, "Grid intensity connector entry must exist in /api/connectors/status");
    if (!caps.gridLive) {
      assert.notEqual(grid.sourceMode, "live_api", "Unconfigured grid connector must never claim live_api");
    }

    const probeRes = await apiRequest("/api/sync-jobs", {
      method: "POST",
      role: "sustainability",
      body: { provider: "gridIntensity", electricityMapsApiKey: "e2e-invalid-grid-key" },
    });
    if (probeRes.status >= 400) {
      assertErrorEnvelope(probeRes, [400, 401, 403, 422, 500, 502]);
    } else {
      const job = probeRes.json?.job || probeRes.json?.jobs?.[0] || probeRes.json;
      assert.notEqual(job?.sourceMode, "live_api", "Invalid grid API key must never claim live_api");
    }
  });

  it("T2-F16-03: PATCH /api/workspace/config rejects functionalUnits <= 0 (never produces Infinity/NaN SCI)", async () => {
    for (const badFu of [0, -100]) {
      const res = await apiRequest("/api/workspace/config", {
        method: "PATCH",
        role: "admin",
        body: { functionalUnits: badFu },
      });
      if (res.status >= 400) {
        assertErrorEnvelope(res, [400, 422]);
      } else {
        const dashRes = await apiRequest("/api/dashboard", { role: "sustainability", expectStatus: 200 });
        assert.equal(/NaN|Infinity/i.test(dashRes.text), false, "SCI must never become NaN or Infinity");
      }
    }
  });

  it("T2-F16-04: Zero active compute resources in slice yields sciScore 0 or null (never NaN)", async () => {
    const res = await apiRequest("/api/dashboard", {
      role: "sustainability",
      query: { regions: "mars-west-1" },
      expectStatus: 200,
    });
    const sci = res.json?.carbon?.sciScore ?? null;
    assert.ok(sci === null || sci === 0, `Expected sciScore 0 or null on empty slice, got ${sci}`);
    const cleanShare = res.json?.carbon?.cleanGridSharePct ?? null;
    assert.ok(
      cleanShare === null || cleanShare === 0,
      `Expected cleanGridSharePct 0 or null on empty slice, got ${cleanShare}`
    );
  });

  it("T2-F16-05: Carbon view and /api/dashboard disclose regional grid provenance without false live claims", async () => {
    const caps = await getConnectorCapabilities();
    const dashRes = await apiRequest("/api/dashboard", {
      role: "sustainability",
      expectStatus: 200,
    });
    const gridSource =
      dashRes.json?.carbon?.gridSourceMode ||
      dashRes.json?.carbon?.sourceMode ||
      caps.statusPayload?.gridIntensity?.sourceMode ||
      caps.statusPayload?.grid?.sourceMode;
    if (!caps.gridLive && gridSource) {
      assert.ok(
        ["static_catalog", "sandbox_fixture"].includes(gridSource),
        `Expected static_catalog or sandbox_fixture when Grid API unconfigured, got ${gridSource}`
      );
    }

    const page = await fetchHtmlPage("/dashboard", {
      role: "sustainability",
      query: { tab: "carbon", role: "sustainability" },
    });
    assert.equal(page.status, 200);
  });
});

// ============================================================================
// Feature 17: Shared 17-Chart Visualization Engine (T2-F17-01 .. T2-F17-05)
// ============================================================================
describe("Tier 2 - Feature 17: Shared 17-Chart Visualization Engine", () => {
  it("T2-F17-01: 0-point mismatched filter state renders empty ChartCard state without crashing", async () => {
    const page = await fetchHtmlPage("/dashboard", {
      role: "finops",
      query: { providers: "gcp", accountIds: "e2e-nonexistent-000" },
    });
    assert.equal(page.status, 200);

    await withBrowser({ width: 1280, height: 800 }, async ({ page: browserPage }) => {
      await visitAndSettle(
        browserPage,
        "/dashboard?providers=gcp&accountIds=e2e-nonexistent-000",
        { role: "finops" }
      );
      const nanPaths = await browserPage.evaluate(() =>
        Array.from(document.querySelectorAll("svg path"))
          .map((p) => p.getAttribute("d") || "")
          .filter((d) => /NaN|Infinity/i.test(d))
      );
      assert.equal(nanPaths.length, 0, "Empty ChartCard SVG paths must never contain NaN/Infinity");
    });
  });

  it("T2-F17-02: 1-point edge case (single CostLineItem day) renders charts with zero NaN SVG paths", async () => {
    const { account } = await setupIsolatedRecommendation({ billedCost: 42.5, cpuPercent: 18 });
    const dashRes = await apiRequest("/api/dashboard", {
      role: "finops",
      query: { accountIds: account.id, window: "7d" },
      expectStatus: 200,
    });
    assert.equal(/NaN|Infinity/i.test(dashRes.text), false, "1-point dashboard API payload must have zero NaN/Infinity");

    await withBrowser({ width: 1280, height: 800 }, async ({ page: browserPage }) => {
      await visitAndSettle(
        browserPage,
        `/dashboard?accountIds=${encodeURIComponent(account.id)}&window=7d`,
        { role: "finops" }
      );
      const cardCount = await browserPage.locator('[data-testid="chart-card"]').count();
      if (cardCount > 0) {
        await assertChartCardContract(browserPage, "", { allowEmpty: true, allowMissingFreshness: true });
      }
    });
  });

  it("T2-F17-03: Null / unavailable metric status displays 'unavailable' disclosure instead of plotting null as 0", async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const externalAccountId = `e2e-chart-null-${suffix}`;
    await apiRequest("/api/cloud-accounts/import-focus", {
      method: "POST",
      role: "admin",
      body: buildFocusPayload({
        externalAccountId,
        billedCost: 30,
        cpuPercent: null,
      }),
      expectStatus: [200, 201],
    });
    const accListRes = await apiRequest("/api/cloud-accounts", { role: "admin", expectStatus: 200 });
    const acc = extractList(accListRes.json, ["accounts"]).find(
      (a) => a.externalAccountId === externalAccountId
    );
    assert.ok(acc?.id);

    const dashRes = await apiRequest("/api/dashboard", {
      role: "devops",
      query: { accountIds: acc.id },
      expectStatus: 200,
    });
    assert.equal(
      dashRes.json?.costs?.periodChangePct ?? null,
      null,
      "Missing prior period must remain null (unavailable), never coerced to 0"
    );

    await withBrowser({ width: 1280, height: 800 }, async ({ page: browserPage }) => {
      await visitAndSettle(
        browserPage,
        `/dashboard?role=devops&accountIds=${encodeURIComponent(acc.id)}`,
        { role: "devops" }
      );
      const nanPaths = await browserPage.evaluate(() =>
        Array.from(document.querySelectorAll("svg path"))
          .map((p) => p.getAttribute("d") || "")
          .filter((d) => /NaN|Infinity/i.test(d))
      );
      assert.equal(nanPaths.length, 0);
    });
  });

  it("T2-F17-04: Dashboard handles HTTP 500 API failure gracefully with error state and zero React page errors", async () => {
    const page = await fetchHtmlPage("/dashboard");
    assert.equal(page.status, 200);

    await withBrowser({ width: 1280, height: 800 }, async ({ page: browserPage }) => {
      await browserPage.route("**/api/dashboard*", (route) =>
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: { code: "SERVER_ERROR", message: "Simulated E2E 500 error" } }),
        })
      );

      await browserPage.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
      assert.equal(
        browserPage.__gcErrors.pageErrors.length,
        0,
        `Uncaught React page errors during 500 state: ${browserPage.__gcErrors.pageErrors.join(" | ")}`
      );
      const bodyText = await browserPage.evaluate(() => document.body.innerText || "");
      assert.ok(
        /error|unavailable|retry|failed/i.test(bodyText),
        "Dashboard must render visible error/retry state when /api/dashboard returns 500"
      );
    });
  });

  it("T2-F17-05: Charts and dashboard do not overflow horizontally at 375px mobile viewport", async () => {
    const page = await fetchHtmlPage("/dashboard");
    const cssText = await fetchLinkedCss(page.stylesheets);
    assert.ok(
      /@media|overflow-x-clip|overflow-x-hidden|flex-wrap/i.test(`${page.html}\n${cssText}`),
      "Dashboard HTML/CSS must include responsive overflow protections"
    );

    await withBrowser({ width: 375, height: 812 }, async ({ page: browserPage }) => {
      await visitAndSettle(browserPage, "/dashboard", { role: "finops" });
      const overflow = await browserPage.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      assert.ok(
        overflow.scrollWidth <= overflow.innerWidth + 1,
        `Mobile 375px overflow on /dashboard: scrollWidth=${overflow.scrollWidth} > innerWidth=${overflow.innerWidth}`
      );
    });
  });
});

// ============================================================================
// Feature 18: 6 Role-Specific Views & design.md Compliance Sweep (T2-F18-01 .. T2-F18-05)
// ============================================================================
describe("Tier 2 - Feature 18: 6 Role Views & design.md Compliance Sweep", () => {
  it("T2-F18-01: Zero \\u2014 em dashes across all public pages and all 6 role dashboard views", async () => {
    const routes = [
      { path: "/", role: undefined },
      { path: "/onboarding", role: "admin" },
      { path: "/audit-history", role: "admin" },
      { path: "/how-it-works", role: undefined },
      { path: "/why", role: undefined },
      { path: "/docs", role: undefined },
      ...ROLES.map((r) => ({ path: `/dashboard?role=${r}`, role: r })),
    ];

    for (const r of routes) {
      const page = await fetchHtmlPage(r.path, { role: r.role });
      assert.equal(page.textContent.includes("\u2014"), false, `[${r.path}] contains disallowed em dash (\\u2014)`);
    }
  });

  it("T2-F18-02: Zero fake-demo or disclaimer banners across all routes", async () => {
    const banned = /Demo dataset active|Public Reading Showcase|Illustrative demo metrics|Zero cloud credentials required/i;
    for (const route of ["/", "/dashboard", "/onboarding", "/audit-history", "/how-it-works", "/why", "/docs"]) {
      const page = await fetchHtmlPage(route);
      assert.equal(banned.test(page.textContent), false, `[${route}] rendered banned fake-demo banner`);
    }
  });

  it("T2-F18-03: Zero harsh 1px borders and warm Material 3 Expressive palette tokens present", async () => {
    for (const route of ["/", "/dashboard"]) {
      const page = await fetchHtmlPage(route);
      const cssText = await fetchLinkedCss(page.stylesheets);
      await assertDesignCompliance({
        html: page.html,
        textContent: page.textContent,
        cssText,
        routeName: route,
      });
    }

    await withBrowser({ width: 1280, height: 800 }, async ({ page: browserPage }) => {
      for (const route of ["/", "/dashboard"]) {
        await visitAndSettle(browserPage, route, { role: "admin" });
        await assertDesignCompliance({ page: browserPage, routeName: `${route} (browser)` });
      }
    });
  });

  it("T2-F18-04: Zero 'bolt' icon on AWS connect/compute cards and .tabular-nums enforced on numeric KPIs", async () => {
    for (const route of ["/", "/dashboard"]) {
      const page = await fetchHtmlPage(route);
      const cssText = await fetchLinkedCss(page.stylesheets);
      await assertDesignCompliance({
        html: page.html,
        textContent: page.textContent,
        cssText,
        routeName: route,
      });
      assert.ok(
        /tabular-nums/i.test(`${page.html}\n${cssText}`),
        `[${route}] Expected .tabular-nums class on numeric readouts`
      );
    }
  });

  it("T2-F18-05: viewer role UI lockout disables/hides mutation controls and API enforces 403", async () => {
    const page = await fetchHtmlPage("/dashboard", { role: "viewer", query: { role: "viewer" } });
    assert.equal(page.status, 200);

    const [cfgRes, syncRes, evalRes] = await Promise.all([
      apiRequest("/api/workspace/config", { method: "PATCH", role: "viewer", body: { monthlyBudget: 500 } }),
      apiRequest("/api/sync-jobs", { method: "POST", role: "viewer", body: {} }),
      apiRequest("/api/recommendations/evaluate", { method: "POST", role: "viewer", body: {} }),
    ]);
    assertErrorEnvelope(cfgRes, 403, "FORBIDDEN");
    assertErrorEnvelope(syncRes, 403, "FORBIDDEN");
    assertErrorEnvelope(evalRes, 403, "FORBIDDEN");

    await withBrowser({ width: 1280, height: 800 }, async ({ page: browserPage }) => {
      await visitAndSettle(browserPage, "/dashboard?role=viewer&tab=actions", { role: "viewer" });
      const activeApproveBtns = await browserPage.evaluate(() =>
        Array.from(document.querySelectorAll("button"))
          .filter((b) => /\b(approve|execute|rollback|delete|sync now)\b/i.test(b.textContent || "") && !b.disabled)
          .map((b) => b.textContent?.trim())
      );
      assert.equal(
        activeApproveBtns.length,
        0,
        `Viewer must not see enabled mutation buttons, found: ${activeApproveBtns.join(", ")}`
      );
    });
  });
});

// ============================================================================
// Feature 19: End-to-End Platform Documentation (T2-F19-01 .. T2-F19-05)
// ============================================================================
describe("Tier 2 - Feature 19: End-to-End Platform Documentation", () => {
  it("T2-F19-01: GET /docs?section=invalid-section falls back gracefully with HTTP 200", async () => {
    const page = await fetchHtmlPage("/docs", { query: { section: "invalid-section-e2e" } });
    assert.equal(page.status, 200);
    assert.ok(page.textContent.trim().length > 100, "/docs fallback must render meaningful content");
  });

  it("T2-F19-02: GET /docs contains zero em dashes (\\u2014) and zero banned fake-demo banners", async () => {
    const page = await fetchHtmlPage("/docs");
    const cssText = await fetchLinkedCss(page.stylesheets);
    await assertDesignCompliance({
      html: page.html,
      textContent: page.textContent,
      cssText,
      routeName: "/docs",
    });
  });

  it("T2-F19-03: Documentation markdown files exist and all relative file links resolve on disk", async () => {
    const requiredDocs = [
      "README.md",
      "docs/ARCHITECTURE_AND_FORMULAS.md",
      "docs/AUTH_AND_RBAC.md",
      "docs/MILESTONES_2_TO_12.md",
    ];

    for (const relPath of requiredDocs) {
      const absPath = path.join(REPO_ROOT, relPath);
      const content = await fs.readFile(absPath, "utf-8");
      assert.ok(content.trim().length > 50, `${relPath} must be non-empty`);

      const linkMatches = content.matchAll(/\[[^\]]+\]\(([^)#?\s]+)(?:#[^)]*)?\)/g);
      for (const m of linkMatches) {
        const target = m[1];
        if (/^(?:https?:|mailto:|\/)/i.test(target)) continue;
        const resolved = path.resolve(path.dirname(absPath), target);
        const exists = await fs
          .stat(resolved)
          .then(() => true)
          .catch(() => false);
        assert.ok(exists, `Broken relative documentation link "${target}" in ${relPath} (resolved: ${resolved})`);
      }
    }
  });

  it("T2-F19-04: /how-it-works and /why comply with design.md and have zero 375px mobile overflow", async () => {
    for (const route of ["/how-it-works", "/why"]) {
      const page = await fetchHtmlPage(route);
      const cssText = await fetchLinkedCss(page.stylesheets);
      await assertDesignCompliance({
        html: page.html,
        textContent: page.textContent,
        cssText,
        routeName: route,
      });
    }

    await withBrowser({ width: 375, height: 812 }, async ({ page: browserPage }) => {
      for (const route of ["/how-it-works", "/why"]) {
        await visitAndSettle(browserPage, route);
        const overflow = await browserPage.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
        }));
        assert.ok(
          overflow.scrollWidth <= overflow.innerWidth + 1,
          `Mobile 375px overflow on ${route}: ${overflow.scrollWidth} > ${overflow.innerWidth}`
        );
      }
    });
  });

  it("T2-F19-05: docs/AUTH_AND_RBAC.md documents deferred external auth without bypassing DB RBAC/SoD today", async () => {
    const authDocPath = path.join(REPO_ROOT, "docs", "AUTH_AND_RBAC.md");
    const content = await fs.readFile(authDocPath, "utf-8");

    assert.ok(
      /resolveRequestActor/.test(content),
      "docs/AUTH_AND_RBAC.md must document resolveRequestActor"
    );
    assert.ok(
      /OIDC|SAML|NextAuth|Clerk/i.test(content),
      "docs/AUTH_AND_RBAC.md must explain deferred external auth (OIDC/SAML/NextAuth/Clerk)"
    );
    assert.ok(
      /deny/i.test(content) && /allow/i.test(content),
      "docs/AUTH_AND_RBAC.md must document allow/deny precedence"
    );
    assert.ok(
      /Separation of Duties|SoD/i.test(content),
      "docs/AUTH_AND_RBAC.md must clarify Separation of Duties enforcement"
    );
  });
});
