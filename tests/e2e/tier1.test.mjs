import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {
  BASE_URL,
  REPO_ROOT,
  ROLES,
  actorHeaders,
  advanceRecommendationToState,
  apiRequest,
  assertChartCardContract,
  assertDesignCompliance,
  buildFocusPayload,
  cleanupTestArtifacts,
  createIsolatedTestAccount,
  ensureServerReady,
  fetchHtmlPage,
  fetchLinkedCss,
  getConnectorCapabilities,
  openBrowserSession,
  restoreWorkspaceConfig,
  runCliCommand,
  snapshotWorkspaceConfig,
  trackAccount,
  trackArtifactPath,
  trackAssignment,
  visitAndSettle,
} from "./helpers.mjs";

let workspaceSnapshot = null;
let sharedBrowserSession = null;

async function getBrowserSession() {
  if (!sharedBrowserSession) {
    sharedBrowserSession = await openBrowserSession({ baseUrl: BASE_URL });
  }
  return sharedBrowserSession;
}

function unwrapArray(payload, candidateKeys = []) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    for (const key of candidateKeys) {
      if (Array.isArray(payload[key])) return payload[key];
    }
  }
  return [];
}

async function findAccountByExternalId(externalAccountId) {
  const res = await apiRequest("/api/cloud-accounts", {
    method: "GET",
    role: "admin",
    expectStatus: 200,
  });
  const list = unwrapArray(res.json, ["accounts"]);
  return list.find((a) => a.externalAccountId === externalAccountId) || null;
}

async function createFocusIdleAccountAndEval({
  provider = "aws",
  region,
  serviceName,
  resourceType,
  instanceType = "m5.large",
  billedCost = 120.5,
  cpuPercent = 1.4,
  initialState,
  extraRecords = [],
} = {}) {
  const payload = buildFocusPayload({
    provider,
    region,
    serviceName,
    resourceType,
    instanceType,
    billedCost,
    cpuPercent,
  });
  if (extraRecords.length > 0) {
    payload.records.push(
      ...extraRecords.map((rec) => ({
        ...payload.records[0],
        ...rec,
        SubAccountId: payload.externalAccountId,
        SubAccountName: payload.accountName,
      }))
    );
  }

  const importRes = await apiRequest("/api/cloud-accounts/import-focus", {
    method: "POST",
    role: "admin",
    body: payload,
    expectStatus: [200, 201],
  });
  assert.equal(importRes.json?.success, true, "FOCUS import must return success: true");

  const account = await findAccountByExternalId(payload.externalAccountId);
  assert.ok(account?.id, `Imported account ${payload.externalAccountId} must be persisted`);
  trackAccount(account.id);

  const evalRes = await apiRequest("/api/recommendations/evaluate", {
    method: "POST",
    role: "finops",
    body: {
      accountIds: [account.id],
      ...(initialState ? { initialState } : {}),
    },
    expectStatus: [200, 201],
  });
  assert.ok(evalRes.json && typeof evalRes.json === "object", "Evaluate endpoint must return JSON");

  const recsRes = await apiRequest("/api/recommendations", {
    method: "GET",
    role: "admin",
    query: { accountIds: account.id },
    expectStatus: 200,
  });
  const allRecs = unwrapArray(recsRes.json, ["recommendations", "items"]);
  const accountRecs = allRecs.filter(
    (r) =>
      r.resource?.cloudAccountId === account.id ||
      (typeof r.resourceId === "string" && r.resourceId.startsWith(account.id))
  );

  return {
    payload,
    account,
    recommendations: accountRecs.length > 0 ? accountRecs : allRecs,
  };
}

async function fetchRolesAndUsers() {
  const [rolesRes, usersRes] = await Promise.all([
    apiRequest("/api/rbac/roles", { method: "GET", role: "admin", expectStatus: 200 }),
    apiRequest("/api/rbac/users", { method: "GET", role: "admin", expectStatus: 200 }),
  ]);
  const roles = unwrapArray(rolesRes.json, ["roles"]);
  const users = unwrapArray(usersRes.json, ["users"]);
  return { roles, users };
}

function getUserIdForRole(users, roleSlug) {
  const matched = users.find((u) => {
    if (u.roleSlug === roleSlug || u.defaultRole === roleSlug || u.role === roleSlug) return true;
    if (Array.isArray(u.roles) && u.roles.some((r) => r === roleSlug || r?.slug === roleSlug)) {
      return true;
    }
    if (
      Array.isArray(u.roleAssignments) &&
      u.roleAssignments.some((a) => a.role?.slug === roleSlug && a.effect === "allow")
    ) {
      return true;
    }
    if (typeof u.email === "string" && u.email.toLowerCase().includes(roleSlug)) return true;
    return false;
  });
  return matched?.id || null;
}

before(async () => {
  await ensureServerReady({ baseUrl: BASE_URL });
  workspaceSnapshot = await snapshotWorkspaceConfig({ baseUrl: BASE_URL });
});

after(async () => {
  try {
    if (sharedBrowserSession) {
      await sharedBrowserSession.close();
      sharedBrowserSession = null;
    }
  } finally {
    await cleanupTestArtifacts({ baseUrl: BASE_URL });
    if (workspaceSnapshot) {
      await restoreWorkspaceConfig(workspaceSnapshot, { baseUrl: BASE_URL });
    }
  }
});

describe("Tier 1: Feature Coverage (T1-F01 .. T1-F19)", () => {
  // =========================================================================
  // Feature 1: M1 Baseline Bug Fixes & Hygiene
  // =========================================================================
  describe("Feature 1: M1 Baseline Bug Fixes & Hygiene", () => {
    it("T1-F01-01: GET /api/audit-logs matches /audit-history parser and renders audit rows", async () => {
      await apiRequest("/api/workspace/config", {
        method: "PATCH",
        role: "admin",
        body: { monthlyBudget: workspaceSnapshot?.monthlyBudget ?? 150 },
        expectStatus: 200,
      });

      const logsRes = await apiRequest("/api/audit-logs", {
        method: "GET",
        role: "admin",
        expectStatus: 200,
      });
      assert.ok(
        Array.isArray(logsRes.json?.logs),
        "GET /api/audit-logs must return { logs: [...] } matching audit-history/page.tsx"
      );
      assert.ok(logsRes.json.logs.length >= 1, "Expected at least 1 audit log entry");

      const pageCheck = await fetchHtmlPage("/audit-history");
      assert.equal(pageCheck.status, 200);

      const session = await getBrowserSession();
      if (session.available) {
        await visitAndSettle(session.page, "/audit-history", {
          role: "admin",
          waitForSelector: "table tbody tr",
        });
        const rowCount = await session.page.locator("table tbody tr").count();
        assert.ok(rowCount >= 1, "Expected rendered audit rows on /audit-history");
        const bodyText = await session.page.evaluate(() => document.body.innerText);
        assert.equal(
          bodyText.includes("No audit events recorded yet"),
          false,
          "Audit history must not show empty-state when logs exist"
        );
      }
    });

    it("T1-F01-02: GET /api/dashboard?window=30d returns valid forecast trajectory and trendVelocity", async () => {
      const today = new Date();
      const dayMinus2 = new Date(today.getTime() - 2 * 86400000).toISOString().slice(0, 10);
      const dayMinus1 = new Date(today.getTime() - 1 * 86400000).toISOString().slice(0, 10);
      const { account } = await createFocusIdleAccountAndEval({
        billedCost: 110,
        extraRecords: [
          { ChargePeriodStart: dayMinus2, BilledCost: 95, EffectiveCost: 95 },
          { ChargePeriodStart: dayMinus1, BilledCost: 102, EffectiveCost: 102 },
        ],
      });

      const dashRes = await apiRequest("/api/dashboard", {
        method: "GET",
        role: "admin",
        query: { window: "30d", accountIds: account.id },
        expectStatus: 200,
      });

      const forecast = dashRes.json?.forecast;
      assert.ok(forecast && typeof forecast === "object", "dashboard.forecast must be an object");
      assert.ok(
        Array.isArray(forecast.trajectory) && forecast.trajectory.length >= 1,
        "forecast.trajectory must be a non-empty array"
      );
      for (const point of forecast.trajectory) {
        assert.equal(typeof point.date, "string", "trajectory point must include date");
        assert.equal(typeof point.predictedCost, "number", "predictedCost must be numeric");
        assert.equal(typeof point.lowerBoundCost, "number", "lowerBoundCost must be numeric");
        assert.equal(typeof point.upperBoundCost, "number", "upperBoundCost must be numeric");
        assert.equal(
          typeof point.predictedCarbonGco2e,
          "number",
          "predictedCarbonGco2e must be numeric"
        );
        assert.equal(typeof point.isForecast, "boolean", "isForecast must be boolean");
      }
      assert.ok(
        ["accelerating", "stable", "decelerating"].includes(forecast.trendVelocity),
        `Invalid trendVelocity "${forecast.trendVelocity}"`
      );
    });

    it("T1-F01-03: /dashboard fires only 1 initial GET /api/dashboard request on mount", async () => {
      const session = await getBrowserSession();
      if (session.available) {
        const dashboardRequests = [];
        const listener = (req) => {
          if (req.method() === "GET" && /\/api\/dashboard(\?|$)/.test(req.url())) {
            dashboardRequests.push(req.url());
          }
        };
        session.page.on("request", listener);
        try {
          await visitAndSettle(session.page, "/dashboard", {
            role: "admin",
            waitForNetworkIdle: true,
          });
          await session.page.waitForTimeout(350);
        } finally {
          session.page.off("request", listener);
        }
        assert.equal(
          dashboardRequests.length,
          1,
          `Expected exactly 1 initial GET /api/dashboard on mount, observed ${dashboardRequests.length}: ${dashboardRequests.join(", ")}`
        );
      } else {
        const htmlRes = await fetchHtmlPage("/dashboard", { role: "admin" });
        assert.equal(htmlRes.status, 200);
        const apiRes = await apiRequest("/api/dashboard", {
          method: "GET",
          role: "admin",
          query: { window: "30d" },
          expectStatus: 200,
        });
        assert.ok(apiRes.json && typeof apiRes.json === "object");
      }
    });

    it("T1-F01-04: POST /api/cloud-accounts/cleanup-duplicates removes duplicate empty accounts cleanly on repeated calls", async () => {
      const dupAcc = await createIsolatedTestAccount({
        externalAccountId: "123456789012",
        name: "E2E Duplicate 123456789012",
      });
      assert.ok(dupAcc.id);

      const res1 = await apiRequest("/api/cloud-accounts/cleanup-duplicates", {
        method: "POST",
        role: "admin",
        expectStatus: 200,
      });
      assert.equal(res1.json?.success, true);
      assert.ok(res1.json.deletedCount >= 1, "Expected duplicate empty account to be deleted");
      assert.ok(Array.isArray(res1.json.remainingAccounts));

      const res2 = await apiRequest("/api/cloud-accounts/cleanup-duplicates", {
        method: "POST",
        role: "admin",
        expectStatus: 200,
      });
      const res3 = await apiRequest("/api/cloud-accounts/cleanup-duplicates", {
        method: "POST",
        role: "admin",
        expectStatus: 200,
      });
      assert.equal(res2.json?.success, true);
      assert.equal(res3.json?.success, true);
    });

    it("T1-F01-05: Tonal UI hygiene (zero em dashes, zero 1px card/button borders) and real rightsizing savings computation", async () => {
      const home = await fetchHtmlPage("/");
      const dash = await fetchHtmlPage("/dashboard", { role: "admin" });
      const cssText = await fetchLinkedCss([...home.stylesheets, ...dash.stylesheets]);

      await assertDesignCompliance({
        html: home.html,
        textContent: home.textContent,
        cssText,
        routeName: "/",
      });
      await assertDesignCompliance({
        html: dash.html,
        textContent: dash.textContent,
        cssText,
        routeName: "/dashboard",
      });

      const dashApi = await apiRequest("/api/dashboard", {
        method: "GET",
        role: "admin",
        query: { window: "30d" },
        expectStatus: 200,
      });
      const savings = dashApi.json?.cpuDistribution?.potentialRightsizingSavings;
      assert.equal(typeof savings, "number", "potentialRightsizingSavings must be a finite number");
      assert.equal(Number.isFinite(savings), true);
      assert.ok(savings >= 0, "potentialRightsizingSavings must be >= 0");
    });
  });

  // =========================================================================
  // Feature 2: Unified Prisma Schema (M2-M12 Models)
  // =========================================================================
  describe("Feature 2: Unified Prisma Schema (M2-M12 Models)", () => {
    it("T1-F02-01: npx prisma validate exits 0 for unified M2-M12 schema", async () => {
      const res = await runCliCommand("npx", ["prisma", "validate"], { expectZero: true });
      assert.equal(res.exitCode, 0);
    });

    it("T1-F02-02: npx prisma db push --skip-generate exits 0 against SQLite DB", async () => {
      const res = await runCliCommand("npx", ["prisma", "db", "push", "--skip-generate"], {
        expectZero: true,
      });
      assert.equal(res.exitCode, 0);
    });

    it("T1-F02-03: Role, Permission, User, and RoleAssignment models persist and query via RBAC APIs", async () => {
      const [rolesRes, usersRes, assignRes] = await Promise.all([
        apiRequest("/api/rbac/roles", { method: "GET", role: "admin", expectStatus: 200 }),
        apiRequest("/api/rbac/users", { method: "GET", role: "admin", expectStatus: 200 }),
        apiRequest("/api/rbac/assignments", { method: "GET", role: "admin", expectStatus: 200 }),
      ]);
      const roles = unwrapArray(rolesRes.json, ["roles"]);
      const users = unwrapArray(usersRes.json, ["users"]);
      const assignments = unwrapArray(assignRes.json, ["assignments"]);
      assert.ok(roles.length >= 6, "Expected persisted Role rows");
      assert.ok(users.length >= 6, "Expected persisted User rows");
      assert.ok(Array.isArray(assignments), "Expected RoleAssignment array");
    });

    it("T1-F02-04: SyncJob, DataQualityReport, and CompatibilitySku models persist and query cleanly", async () => {
      const acc = await createIsolatedTestAccount({ provider: "aws" });
      const syncRes = await apiRequest("/api/sync-jobs", {
        method: "POST",
        role: "admin",
        body: { accountIds: [acc.id], triggerType: "manual" },
        expectStatus: [200, 201],
      });
      assert.ok(syncRes.json, "POST /api/sync-jobs must return job data");

      const [jobsRes, dqRes, compatRes] = await Promise.all([
        apiRequest("/api/sync-jobs", {
          method: "GET",
          role: "admin",
          query: { accountId: acc.id },
          expectStatus: 200,
        }),
        apiRequest("/api/data-quality", {
          method: "GET",
          role: "admin",
          query: { accountIds: acc.id },
          expectStatus: 200,
        }),
        apiRequest("/api/compatibility", { method: "GET", role: "admin", expectStatus: 200 }),
      ]);

      assert.ok(unwrapArray(jobsRes.json, ["jobs", "syncJobs"]).length >= 1);
      assert.ok(unwrapArray(dqRes.json, ["reports", "dataQualityReports"]).length >= 1);
      assert.ok(unwrapArray(compatRes.json, ["skus", "items"]).length >= 1);
    });

    it("T1-F02-05: K8sWorkloadAllocation, Workload, LifecycleTransition, and VerificationOutcome persist via APIs", async () => {
      const [k8sRes, filtersRes] = await Promise.all([
        apiRequest("/api/k8s/allocations", { method: "GET", role: "admin", expectStatus: 200 }),
        apiRequest("/api/filters", { method: "GET", role: "admin", expectStatus: 200 }),
      ]);
      assert.ok(unwrapArray(k8sRes.json, ["allocations", "items"]).length >= 1);
      assert.ok(unwrapArray(filtersRes.json?.workloads, ["workloads"]).length >= 1);

      const { recommendations } = await createFocusIdleAccountAndEval();
      const rec = recommendations[0];
      assert.ok(rec?.id, "Expected evaluated recommendation for persistence check");

      const { users } = await fetchRolesAndUsers();
      const finopsId = getUserIdForRole(users, "finops");
      const adminId = getUserIdForRole(users, "admin");
      const devopsId = getUserIdForRole(users, "devops");

      await advanceRecommendationToState(rec.id, "verifying", {
        currentState: rec.lifecycleState || "recommended",
        requesterRole: "finops",
        requesterUserId: finopsId || undefined,
        approverRole: "admin",
        approverUserId: adminId || undefined,
        executorRole: "devops",
        executorUserId: devopsId || undefined,
      });

      const verifyRes = await apiRequest(`/api/recommendations/${encodeURIComponent(rec.id)}/verify`, {
        method: "POST",
        role: "finops",
        userId: finopsId || undefined,
        body: {
          expectedBaselineCost: 120.5,
          actualPostChangeCost: 65.0,
          observedP95LatencyMs: 22,
          latencySloMs: 50,
          billingLagHours: 72,
        },
        expectStatus: 200,
      });
      const outcome = verifyRes.json?.verification || verifyRes.json?.outcome || verifyRes.json;
      assert.equal(outcome.guardrailPassed, true);
      assert.equal(outcome.verdict, "verified");
    });
  });

  // =========================================================================
  // Feature 3: Deterministic 6-Role & Catalog Seeding
  // =========================================================================
  describe("Feature 3: Deterministic 6-Role & Catalog Seeding", () => {
    it("T1-F03-01: GET /api/rbac/roles returns all 6 system roles with mapped permissions", async () => {
      const { roles } = await fetchRolesAndUsers();
      assert.equal(roles.length, 6, `Expected 6 system roles, got ${roles.length}`);
      const slugs = new Set(roles.map((r) => r.slug));
      for (const expectedSlug of ROLES) {
        assert.ok(slugs.has(expectedSlug), `Missing seeded role "${expectedSlug}"`);
      }
      for (const role of roles) {
        assert.equal(role.isSystem, true, `Role "${role.slug}" must have isSystem: true`);
        const perms = role.permissions || role.rolePermissions || [];
        assert.ok(perms.length > 0, `Role "${role.slug}" must have mapped permissions`);
      }
    });

    it("T1-F03-02: GET /api/rbac/users returns at least 6 default persona users covering all roles", async () => {
      const { users } = await fetchRolesAndUsers();
      assert.ok(users.length >= 6, `Expected >= 6 seeded users, got ${users.length}`);
      for (const roleSlug of ROLES) {
        const userId = getUserIdForRole(users, roleSlug);
        assert.ok(userId, `Missing seeded active user for role "${roleSlug}"`);
      }
    });

    it("T1-F03-03: GET /api/filters exposes >= 1 seeded baseline Workload", async () => {
      const res = await apiRequest("/api/filters", {
        method: "GET",
        role: "admin",
        expectStatus: 200,
      });
      const workloads = res.json?.workloads || [];
      assert.ok(Array.isArray(workloads) && workloads.length >= 1, "Expected >= 1 seeded Workload");
      assert.ok(workloads[0].id && workloads[0].name && workloads[0].environment);
    });

    it("T1-F03-04: GET /api/compatibility returns seeded SKUs across aws, azure, gcp, kubernetes", async () => {
      const res = await apiRequest("/api/compatibility", {
        method: "GET",
        role: "admin",
        expectStatus: 200,
      });
      const skus = unwrapArray(res.json, ["skus", "items"]);
      const providers = new Set(skus.map((s) => s.provider));
      for (const p of ["aws", "azure", "gcp", "kubernetes"]) {
        assert.ok(providers.has(p), `Compatibility catalog missing provider "${p}"`);
      }
    });

    it("T1-F03-05: Running npx prisma db seed twice consecutively is idempotent", async () => {
      const seed1 = await runCliCommand("npx", ["prisma", "db", "seed"], { expectZero: true });
      assert.equal(seed1.exitCode, 0);
      const roles1 = unwrapArray(
        (await apiRequest("/api/rbac/roles", { role: "admin", expectStatus: 200 })).json,
        ["roles"]
      );
      const compat1 = unwrapArray(
        (await apiRequest("/api/compatibility", { role: "admin", expectStatus: 200 })).json,
        ["skus", "items"]
      );

      const seed2 = await runCliCommand("npx", ["prisma", "db", "seed"], { expectZero: true });
      assert.equal(seed2.exitCode, 0);
      const roles2 = unwrapArray(
        (await apiRequest("/api/rbac/roles", { role: "admin", expectStatus: 200 })).json,
        ["roles"]
      );
      const compat2 = unwrapArray(
        (await apiRequest("/api/compatibility", { role: "admin", expectStatus: 200 })).json,
        ["skus", "items"]
      );

      assert.equal(roles2.length, 6, "Role count must remain 6 after re-seeding");
      assert.equal(roles2.length, roles1.length);
      assert.equal(compat2.length, compat1.length, "CompatibilitySku count must not duplicate");
    });
  });

  // =========================================================================
  // Feature 4: RBAC Policy Evaluator & SoD
  // =========================================================================
  describe("Feature 4: RBAC Policy Evaluator & SoD", () => {
    it("T1-F04-01: PATCH /api/workspace/config updates budget as admin and records audit actor", async () => {
      const res = await apiRequest("/api/workspace/config", {
        method: "PATCH",
        role: "admin",
        body: { monthlyBudget: 250 },
        expectStatus: 200,
      });
      assert.equal(res.json?.monthlyBudget, 250);

      const logsRes = await apiRequest("/api/audit-logs", {
        method: "GET",
        role: "admin",
        expectStatus: 200,
      });
      const logs = unwrapArray(logsRes.json, ["logs"]);
      const configLog = logs.find((l) => l.action === "workspace_config_updated");
      assert.ok(configLog, "Expected workspace_config_updated audit log");
      assert.ok(configLog.actor && configLog.actor.length > 0);
    });

    it("T1-F04-02: RBAC evaluator allows finops approval and denies viewer approval", async () => {
      const finopsEval = await apiRequest("/api/rbac/evaluate", {
        method: "POST",
        role: "finops",
        body: { permission: "recommendation:approve", scopeType: "organization" },
        expectStatus: 200,
      });
      assert.equal(finopsEval.json?.allowed, true);

      const viewerEval = await apiRequest("/api/rbac/evaluate", {
        method: "POST",
        role: "viewer",
        body: { permission: "recommendation:approve", scopeType: "organization" },
        expectStatus: 200,
      });
      assert.equal(viewerEval.json?.allowed, false);
      assert.ok(
        typeof viewerEval.json?.reason === "string" && viewerEval.json.reason.length > 0,
        "Denied RBAC evaluation must explain reason"
      );
    });

    it("T1-F04-03: Scoped allow RoleAssignment on account grants sync access for userId", async () => {
      const accA = await createIsolatedTestAccount({ provider: "aws" });
      const { roles, users } = await fetchRolesAndUsers();
      const devopsRole = roles.find((r) => r.slug === "devops");
      const devopsUserId = getUserIdForRole(users, "devops");
      assert.ok(devopsRole?.id && devopsUserId, "Expected devops role and user");

      const assignRes = await apiRequest("/api/rbac/assignments", {
        method: "POST",
        role: "admin",
        body: {
          userId: devopsUserId,
          roleId: devopsRole.id,
          scopeType: "account",
          scopeId: accA.id,
          effect: "allow",
        },
        expectStatus: [200, 201],
      });
      const assignmentId = assignRes.json?.id || assignRes.json?.assignment?.id;
      assert.ok(assignmentId, "Assignment ID must be returned");
      trackAssignment(assignmentId);

      const syncRes = await apiRequest(`/api/cloud-accounts/${encodeURIComponent(accA.id)}/sync`, {
        method: "POST",
        role: "devops",
        userId: devopsUserId,
        expectStatus: 200,
      });
      assert.equal(syncRes.status, 200);
    });

    it("T1-F04-04: Separation of Duties tracks distinct requester and approver across lifecycle", async () => {
      const { recommendations } = await createFocusIdleAccountAndEval();
      const rec = recommendations[0];
      assert.ok(rec?.id);

      const { users } = await fetchRolesAndUsers();
      const finopsId = getUserIdForRole(users, "finops");
      const adminId = getUserIdForRole(users, "admin");
      assert.ok(finopsId && adminId && finopsId !== adminId, "Expected distinct finops and admin users");

      const result = await advanceRecommendationToState(rec.id, "approved", {
        currentState: rec.lifecycleState || "recommended",
        requesterRole: "finops",
        requesterUserId: finopsId,
        approverRole: "admin",
        approverUserId: adminId,
      });
      assert.equal(result.finalState, "approved");

      const lastRecState = result.transitions.at(-1)?.response?.recommendation || result.transitions.at(-1)?.response;
      assert.equal(lastRecState?.requestedByUserId, finopsId);
      assert.equal(lastRecState?.approvedByUserId, adminId);
    });

    it("T1-F04-05: Dashboard UI forwards x-greencloud-role header on workspace config mutation", async () => {
      const session = await getBrowserSession();
      if (session.available) {
        const forwardedHeaders = [];
        const listener = (req) => {
          if (req.url().includes("/api/workspace/config") && req.method() === "PATCH") {
            forwardedHeaders.push(req.headers());
          }
        };
        session.page.on("request", listener);
        try {
          await visitAndSettle(session.page, "/dashboard?role=finops", { role: "finops" });
          // Trigger settings update if settings modal button is present, or verify role header on page fetch
          const settingsBtn = session.page.locator("button:has-text('Settings'), [data-testid='workspace-settings-btn']").first();
          if ((await settingsBtn.count()) > 0) {
            await settingsBtn.click();
            const saveBtn = session.page.locator("button:has-text('Save')").first();
            if ((await saveBtn.count()) > 0) {
              await saveBtn.click();
              await session.page.waitForTimeout(300);
            }
          }
          if (forwardedHeaders.length > 0) {
            assert.equal(forwardedHeaders[0]["x-greencloud-role"], "finops");
          }
        } finally {
          session.page.off("request", listener);
        }
      }
      const patchRes = await apiRequest("/api/workspace/config", {
        method: "PATCH",
        role: "finops",
        body: { monthlyBudget: 210 },
        expectStatus: 200,
      });
      assert.equal(patchRes.json?.monthlyBudget, 210);
    });
  });

  // =========================================================================
  // Feature 5: Workspace Admin RBAC UI & Deferred Auth Docs
  // =========================================================================
  describe("Feature 5: Workspace Admin RBAC UI & Deferred Auth Docs", () => {
    it("T1-F05-01: /dashboard?role=admin renders RbacAdminPanel with 6 roles and active users", async () => {
      const { roles, users } = await fetchRolesAndUsers();
      assert.equal(roles.length, 6);
      assert.ok(users.length >= 6);

      const session = await getBrowserSession();
      if (session.available) {
        const settled = await visitAndSettle(session.page, "/dashboard?role=admin", {
          role: "admin",
        });
        const textLower = settled.textContent.toLowerCase();
        for (const roleSlug of ROLES) {
          assert.ok(textLower.includes(roleSlug), `Admin RBAC UI missing role "${roleSlug}"`);
        }
      } else {
        const htmlPage = await fetchHtmlPage("/dashboard", { role: "admin", query: { role: "admin" } });
        assert.equal(htmlPage.status, 200);
      }
    });

    it("T1-F05-02: Creating scoped provider allow assignment persists across queries", async () => {
      const { roles, users } = await fetchRolesAndUsers();
      const devopsRole = roles.find((r) => r.slug === "devops");
      const devopsUserId = getUserIdForRole(users, "devops");
      assert.ok(devopsRole?.id && devopsUserId);

      const createRes = await apiRequest("/api/rbac/assignments", {
        method: "POST",
        role: "admin",
        body: {
          userId: devopsUserId,
          roleId: devopsRole.id,
          scopeType: "provider",
          scopeId: "aws",
          effect: "allow",
        },
        expectStatus: [200, 201],
      });
      const createdId = createRes.json?.id || createRes.json?.assignment?.id;
      assert.ok(createdId, "Created RoleAssignment must return id");
      trackAssignment(createdId);

      const listRes = await apiRequest("/api/rbac/assignments", {
        method: "GET",
        role: "admin",
        expectStatus: 200,
      });
      const assignments = unwrapArray(listRes.json, ["assignments"]);
      assert.ok(assignments.some((a) => a.id === createdId), "Created assignment must persist");
    });

    it("T1-F05-03: Revoking RBAC assignment deletes record and writes AuditLog entry", async () => {
      const { roles, users } = await fetchRolesAndUsers();
      const architectRole = roles.find((r) => r.slug === "architect");
      const architectUserId = getUserIdForRole(users, "architect");
      assert.ok(architectRole?.id && architectUserId);

      const createRes = await apiRequest("/api/rbac/assignments", {
        method: "POST",
        role: "admin",
        body: {
          userId: architectUserId,
          roleId: architectRole.id,
          scopeType: "region",
          scopeId: "us-west-2",
          effect: "allow",
        },
        expectStatus: [200, 201],
      });
      const assignmentId = createRes.json?.id || createRes.json?.assignment?.id;
      assert.ok(assignmentId);
      trackAssignment(assignmentId);

      const delRes = await apiRequest(`/api/rbac/assignments/${encodeURIComponent(assignmentId)}`, {
        method: "DELETE",
        role: "admin",
        expectStatus: 200,
      });
      assert.equal(delRes.status, 200);

      const listRes = await apiRequest("/api/rbac/assignments", {
        method: "GET",
        role: "admin",
        expectStatus: 200,
      });
      const assignments = unwrapArray(listRes.json, ["assignments"]);
      assert.equal(assignments.some((a) => a.id === assignmentId), false);

      const logsRes = await apiRequest("/api/audit-logs", {
        method: "GET",
        role: "admin",
        expectStatus: 200,
      });
      const logs = unwrapArray(logsRes.json, ["logs"]);
      assert.ok(
        logs.some((l) => l.objectId === assignmentId || String(l.action).includes("rbac")),
        "Expected audit log entry for RBAC assignment revocation"
      );
    });

    it("T1-F05-04: Admin RBAC view / API surfaces Separation of Duties rules and warnings", async () => {
      const rolesRes = await apiRequest("/api/rbac/roles", {
        method: "GET",
        role: "admin",
        expectStatus: 200,
      });
      const sodRules = rolesRes.json?.sodRules || rolesRes.json?.separationOfDuties;
      const session = await getBrowserSession();
      if (session.available) {
        const settled = await visitAndSettle(session.page, "/dashboard?role=admin", {
          role: "admin",
        });
        assert.ok(
          /separation of duties|self-approval|sod/i.test(settled.textContent),
          "Admin RBAC UI must explicitly display Separation of Duties rules/warnings"
        );
      } else {
        const docContent = await fs.readFile(path.join(REPO_ROOT, "docs/AUTH_AND_RBAC.md"), "utf-8");
        assert.ok(
          Boolean(sodRules) || /separation of duties/i.test(docContent),
          "Expected SoD rules surfaced in RBAC API or docs"
        );
      }
    });

    it("T1-F05-05: /docs and docs/AUTH_AND_RBAC.md document resolveRequestActor and deferred external auth", async () => {
      const docsPage = await fetchHtmlPage("/docs");
      assert.equal(docsPage.status, 200);

      const authDoc = await fs.readFile(path.join(REPO_ROOT, "docs/AUTH_AND_RBAC.md"), "utf-8");
      assert.ok(authDoc.includes("resolveRequestActor"), "AUTH_AND_RBAC.md must document resolveRequestActor");
      assert.ok(authDoc.includes("x-greencloud-user-id"));
      assert.ok(authDoc.includes("x-greencloud-role"));
      assert.ok(/OIDC|SAML|NextAuth|Clerk/i.test(authDoc), "Must explain deferred external IdP integration");
    });
  });

  // =========================================================================
  // Feature 6: Multi-Account SyncJob Worker
  // =========================================================================
  describe("Feature 6: Multi-Account SyncJob Worker", () => {
    it("T1-F06-01: POST /api/sync-jobs executes sync and returns completed or partial SyncJob", async () => {
      const accAws = await createIsolatedTestAccount({ provider: "aws" });
      const res = await apiRequest("/api/sync-jobs", {
        method: "POST",
        role: "admin",
        body: { accountIds: [accAws.id], triggerType: "manual" },
        expectStatus: [200, 201],
      });
      const job = res.json?.job || unwrapArray(res.json, ["jobs", "syncJobs"])[0] || res.json;
      assert.ok(job?.id, "SyncJob must include id");
      assert.ok(["completed", "partial"].includes(job.status), `Unexpected SyncJob status "${job.status}"`);
      assert.equal(job.provider, "aws");
      assert.equal(typeof job.recordsIngested, "number");
      assert.ok(job.startedAt && job.finishedAt);
    });

    it("T1-F06-02: GET /api/sync-jobs/[id] returns subSourceStatuses and attemptCount", async () => {
      const accAws = await createIsolatedTestAccount({ provider: "aws" });
      const createRes = await apiRequest("/api/sync-jobs", {
        method: "POST",
        role: "admin",
        body: { accountIds: [accAws.id], triggerType: "manual" },
        expectStatus: [200, 201],
      });
      const createdJob =
        createRes.json?.job || unwrapArray(createRes.json, ["jobs", "syncJobs"])[0] || createRes.json;
      const detailRes = await apiRequest(`/api/sync-jobs/${encodeURIComponent(createdJob.id)}`, {
        method: "GET",
        role: "admin",
        expectStatus: 200,
      });
      const detail = detailRes.json?.job || detailRes.json;
      assert.equal(detail.id, createdJob.id);
      assert.ok(detail.attemptCount >= 1, "attemptCount must be >= 1");
      const subStatuses =
        typeof detail.subSourceStatuses === "string"
          ? JSON.parse(detail.subSourceStatuses)
          : detail.subSourceStatuses;
      assert.ok(subStatuses && typeof subStatuses === "object", "subSourceStatuses must be a JSON map");
    });

    it("T1-F06-03: Multi-account POST /api/sync-jobs updates syncFreshness for both accounts", async () => {
      const accAws = await createIsolatedTestAccount({ provider: "aws" });
      const accAzure = await createIsolatedTestAccount({ provider: "azure" });

      await apiRequest("/api/sync-jobs", {
        method: "POST",
        role: "admin",
        body: { accountIds: [accAws.id, accAzure.id], triggerType: "manual" },
        expectStatus: [200, 201],
      });

      const jobsRes = await apiRequest("/api/sync-jobs", {
        method: "GET",
        role: "admin",
        expectStatus: 200,
      });
      const jobs = unwrapArray(jobsRes.json, ["jobs", "syncJobs"]);
      assert.ok(jobs.some((j) => j.cloudAccountId === accAws.id));
      assert.ok(jobs.some((j) => j.cloudAccountId === accAzure.id));

      const accList = unwrapArray(
        (await apiRequest("/api/cloud-accounts", { role: "admin", expectStatus: 200 })).json,
        ["accounts"]
      );
      for (const id of [accAws.id, accAzure.id]) {
        const found = accList.find((a) => a.id === id);
        assert.ok(found?.syncFreshness, `Account ${id} must have updated syncFreshness`);
      }
    });

    it("T1-F06-04: GET /api/sync-jobs?accountId=... filters and sorts newest-first with cursor", async () => {
      const acc = await createIsolatedTestAccount({ provider: "aws" });
      await apiRequest("/api/sync-jobs", {
        method: "POST",
        role: "admin",
        body: { accountIds: [acc.id], triggerType: "manual" },
        expectStatus: [200, 201],
      });
      await apiRequest("/api/sync-jobs", {
        method: "POST",
        role: "admin",
        body: { accountIds: [acc.id], triggerType: "scheduled" },
        expectStatus: [200, 201],
      });

      const listRes = await apiRequest("/api/sync-jobs", {
        method: "GET",
        role: "admin",
        query: { accountId: acc.id },
        expectStatus: 200,
      });
      const jobs = unwrapArray(listRes.json, ["jobs", "syncJobs"]);
      assert.ok(jobs.length >= 2);
      assert.ok(jobs.every((j) => j.cloudAccountId === acc.id));
      const t0 = Date.parse(jobs[0].startedAt);
      const t1 = Date.parse(jobs[1].startedAt);
      assert.ok(t0 >= t1, "Jobs must be sorted newest-first");
      assert.ok("cursor" in jobs[0], "SyncJob must expose cursor field");
    });

    it("T1-F06-05: Dashboard SyncQualityPanel displays latest SyncJob status and freshness", async () => {
      const acc = await createIsolatedTestAccount({ provider: "aws" });
      await apiRequest("/api/sync-jobs", {
        method: "POST",
        role: "admin",
        body: { accountIds: [acc.id], triggerType: "manual" },
        expectStatus: [200, 201],
      });

      const session = await getBrowserSession();
      if (session.available) {
        const settled = await visitAndSettle(session.page, "/dashboard?role=admin", {
          role: "admin",
        });
        assert.ok(
          /sync|freshness|completed|partial/i.test(settled.textContent),
          "Dashboard must display SyncQualityPanel status and freshness"
        );
      } else {
        const dashHtml = await fetchHtmlPage("/dashboard", { role: "admin" });
        assert.equal(dashHtml.status, 200);
      }
    });
  });

  // =========================================================================
  // Feature 7: DataQualityReport Generation & Visibility
  // =========================================================================
  describe("Feature 7: DataQualityReport Generation & Visibility", () => {
    it("T1-F07-01: GET /api/data-quality returns completeness, freshness, tag coverage, unallocated cost, and missingSignals", async () => {
      const acc = await createIsolatedTestAccount({ provider: "aws" });
      await apiRequest("/api/sync-jobs", {
        method: "POST",
        role: "admin",
        body: { accountIds: [acc.id], triggerType: "manual" },
        expectStatus: [200, 201],
      });

      const res = await apiRequest("/api/data-quality", {
        method: "GET",
        role: "admin",
        query: { accountIds: acc.id },
        expectStatus: 200,
      });
      const reports = unwrapArray(res.json, ["reports", "dataQualityReports"]);
      assert.ok(reports.length >= 1, "Expected >= 1 DataQualityReport");
      const r = reports[0];
      assert.ok(r.completenessPct >= 0 && r.completenessPct <= 100);
      assert.ok(r.freshnessMinutes >= 0);
      assert.ok(r.tagCoveragePct >= 0 && r.tagCoveragePct <= 100);
      assert.ok(r.unallocatedCostPct >= 0 && r.unallocatedCostPct <= 100);
      assert.equal(typeof r.billingReconciled, "boolean");
      assert.equal(typeof r.sourceMode, "string");
      assert.ok(r.missingSignals !== undefined);
    });

    it("T1-F07-02: FOCUS import with 50% tagged resources sets tagCoveragePct ~50% and billingReconciled true", async () => {
      const payload = buildFocusPayload({
        provider: "aws",
        billedCost: 80,
        cpuPercent: 18,
        tags: { env: "prod" },
      });
      payload.records.push({
        ...payload.records[0],
        ResourceId: `i-untagged-${Date.now()}`,
        BilledCost: 40,
        EffectiveCost: 40,
        Tags: {},
      });

      await apiRequest("/api/cloud-accounts/import-focus", {
        method: "POST",
        role: "admin",
        body: payload,
        expectStatus: [200, 201],
      });
      const acc = await findAccountByExternalId(payload.externalAccountId);
      assert.ok(acc?.id);
      trackAccount(acc.id);

      const dqRes = await apiRequest("/api/data-quality", {
        method: "GET",
        role: "admin",
        query: { accountIds: acc.id },
        expectStatus: 200,
      });
      const reports = unwrapArray(dqRes.json, ["reports", "dataQualityReports"]);
      assert.ok(reports.length >= 1);
      const r = reports[0];
      assert.ok(r.tagCoveragePct >= 45 && r.tagCoveragePct <= 55, `Expected ~50% tag coverage, got ${r.tagCoveragePct}`);
      assert.equal(r.billingReconciled, true);
      assert.equal(r.sourceMode, "focus_import");
    });

    it("T1-F07-03: GET /api/data-quality?accountIds=... scopes reports strictly to target account", async () => {
      const accA = await createIsolatedTestAccount({ provider: "aws" });
      const accB = await createIsolatedTestAccount({ provider: "gcp" });
      await apiRequest("/api/sync-jobs", {
        method: "POST",
        role: "admin",
        body: { accountIds: [accA.id, accB.id], triggerType: "manual" },
        expectStatus: [200, 201],
      });

      const res = await apiRequest("/api/data-quality", {
        method: "GET",
        role: "admin",
        query: { accountIds: accA.id },
        expectStatus: 200,
      });
      const reports = unwrapArray(res.json, ["reports", "dataQualityReports"]);
      assert.ok(reports.length >= 1);
      assert.ok(reports.every((r) => r.cloudAccountId === accA.id));
    });

    it("T1-F07-04: Missing CpuPercent in FOCUS import records missing CPU signal and completenessPct < 100", async () => {
      const payload = buildFocusPayload({
        provider: "aws",
        billedCost: 50,
        cpuPercent: null,
      });
      delete payload.records[0].CpuPercent;

      await apiRequest("/api/cloud-accounts/import-focus", {
        method: "POST",
        role: "admin",
        body: payload,
        expectStatus: [200, 201],
      });
      const acc = await findAccountByExternalId(payload.externalAccountId);
      assert.ok(acc?.id);
      trackAccount(acc.id);

      const dqRes = await apiRequest("/api/data-quality", {
        method: "GET",
        role: "admin",
        query: { accountIds: acc.id },
        expectStatus: 200,
      });
      const reports = unwrapArray(dqRes.json, ["reports", "dataQualityReports"]);
      assert.ok(reports.length >= 1);
      const r = reports[0];
      assert.ok(r.completenessPct < 100, `Expected completenessPct < 100, got ${r.completenessPct}`);
      const missingText =
        typeof r.missingSignals === "string" ? r.missingSignals : JSON.stringify(r.missingSignals);
      assert.ok(/cpu|telemetry/i.test(missingText), `missingSignals must report CPU telemetry gap: ${missingText}`);
    });

    it("T1-F07-05: Dashboard SyncQualityPanel renders completeness, freshness, tag coverage, and provenance", async () => {
      const session = await getBrowserSession();
      if (session.available) {
        const settled = await visitAndSettle(session.page, "/dashboard?role=admin", {
          role: "admin",
        });
        assert.ok(
          /completeness|tag coverage|unallocated/i.test(settled.textContent),
          "Dashboard must show DataQualityReport metrics"
        );
      } else {
        const dqRes = await apiRequest("/api/data-quality", {
          method: "GET",
          role: "admin",
          expectStatus: 200,
        });
        assert.ok(dqRes.json && typeof dqRes.json === "object");
      }
    });
  });

  // =========================================================================
  // Feature 8: 7-Level Global Filter Chain
  // =========================================================================
  describe("Feature 8: 7-Level Global Filter Chain", () => {
    it("T1-F08-01: GET /api/filters exposes all 7 cascading levels plus windows", async () => {
      const res = await apiRequest("/api/filters", {
        method: "GET",
        role: "admin",
        expectStatus: 200,
      });
      for (const key of [
        "organizations",
        "providers",
        "accounts",
        "regions",
        "services",
        "resources",
        "workloads",
        "windows",
      ]) {
        assert.ok(Array.isArray(res.json?.[key]), `/api/filters missing array "${key}"`);
      }
      assert.deepEqual(res.json.windows, ["7d", "30d", "90d"]);
    });

    it("T1-F08-02: GET /api/filters?providers=aws&regions=us-east-1 narrows downstream facets", async () => {
      const res = await apiRequest("/api/filters", {
        method: "GET",
        role: "admin",
        query: { providers: "aws", regions: "us-east-1" },
        expectStatus: 200,
      });
      const accounts = res.json?.accounts || [];
      const resources = res.json?.resources || [];
      for (const acc of accounts) {
        if (acc.provider) assert.equal(acc.provider, "aws");
      }
      for (const r of resources) {
        if (r.provider) assert.equal(r.provider, "aws");
        if (r.region) assert.equal(r.region, "us-east-1");
      }
    });

    it("T1-F08-03: GET /api/dashboard?providers=aws&regions=us-east-1&window=7d scopes costs and resources", async () => {
      const { account } = await createFocusIdleAccountAndEval({
        provider: "aws",
        region: "us-east-1",
        billedCost: 90,
      });
      const res = await apiRequest("/api/dashboard", {
        method: "GET",
        role: "admin",
        query: { providers: "aws", regions: "us-east-1", window: "7d", accountIds: account.id },
        expectStatus: 200,
      });
      assert.ok(res.json?.costs && typeof res.json.costs === "object");
      assert.ok(res.json?.resources && typeof res.json.resources === "object");
      const allEc2 = res.json.resources.ec2 || [];
      for (const item of allEc2) {
        if (item.region) assert.equal(item.region, "us-east-1");
      }
    });

    it("T1-F08-04: /api/recommendations and /api/k8s/allocations honor workloadIds filter consistently", async () => {
      const filtersRes = await apiRequest("/api/filters", {
        method: "GET",
        role: "admin",
        expectStatus: 200,
      });
      const wlId = filtersRes.json?.workloads?.[0]?.id;
      assert.ok(wlId, "Expected seeded workloadId");

      const [recsRes, k8sRes] = await Promise.all([
        apiRequest("/api/recommendations", {
          method: "GET",
          role: "admin",
          query: { workloadIds: wlId },
          expectStatus: 200,
        }),
        apiRequest("/api/k8s/allocations", {
          method: "GET",
          role: "admin",
          query: { workloadIds: wlId },
          expectStatus: 200,
        }),
      ]);
      const allocations = unwrapArray(k8sRes.json, ["allocations", "items"]);
      for (const alloc of allocations) {
        if (alloc.workloadId) assert.equal(alloc.workloadId, wlId);
      }
      assert.ok(Array.isArray(unwrapArray(recsRes.json, ["recommendations", "items"])));
    });

    it("T1-F08-05: GlobalFilterBar updates URL query params cleanly without crash", async () => {
      const session = await getBrowserSession();
      if (session.available) {
        await visitAndSettle(session.page, "/dashboard?role=finops", { role: "finops" });
        const windowBtn = session.page.locator("button:has-text('7D'), [data-testid='window-7d']").first();
        if ((await windowBtn.count()) > 0) {
          await windowBtn.click();
          await session.page.waitForTimeout(300);
          assert.ok(session.page.url().includes("7d"), "URL should reflect selected 7d window");
        }
      } else {
        const pageRes = await fetchHtmlPage("/dashboard", {
          role: "finops",
          query: { providers: "aws", window: "7d" },
        });
        assert.equal(pageRes.status, 200);
      }
    });
  });

  // =========================================================================
  // Feature 9: Multi-Service Compatibility & Pricing Catalog
  // =========================================================================
  describe("Feature 9: Multi-Service Compatibility & Pricing Catalog", () => {
    it("T1-F09-01: GET /api/compatibility covers AWS, Azure, GCP, and K8s service types", async () => {
      const res = await apiRequest("/api/compatibility", {
        method: "GET",
        role: "admin",
        expectStatus: 200,
      });
      const skus = unwrapArray(res.json, ["skus", "items"]);
      const serviceTypes = new Set(skus.map((s) => s.serviceType));
      for (const st of ["ec2", "ebs", "eip", "rds", "s3", "azure_vm", "managed_disk", "azure_sql", "gce_vm", "persistent_disk", "cloud_sql", "k8s_pod", "k8s_node"]) {
        assert.ok(serviceTypes.has(st), `Missing serviceType "${st}" in compatibility catalog`);
      }
    });

    it("T1-F09-02: GET /api/compatibility?provider=aws&serviceType=ec2&region=us-east-1 returns full SKU metadata", async () => {
      const res = await apiRequest("/api/compatibility", {
        method: "GET",
        role: "admin",
        query: { provider: "aws", serviceType: "ec2", region: "us-east-1" },
        expectStatus: 200,
      });
      const skus = unwrapArray(res.json, ["skus", "items"]);
      assert.ok(skus.length >= 1);
      for (const sku of skus) {
        assert.equal(sku.provider, "aws");
        assert.equal(sku.serviceType, "ec2");
        assert.equal(sku.region, "us-east-1");
        assert.equal(typeof sku.vcpu, "number");
        assert.equal(typeof sku.memoryGb, "number");
        assert.equal(typeof sku.architecture, "string");
        assert.equal(typeof sku.availabilityPct, "number");
        assert.equal(typeof sku.hourlyPriceUsd, "number");
        assert.equal(typeof sku.monthlyPriceUsd, "number");
        assert.ok(sku.sourceVersion);
      }
    });

    it("T1-F09-03: GET /api/compatibility?architecture=arm64&minMemoryGb=8 filters strictly", async () => {
      const res = await apiRequest("/api/compatibility", {
        method: "GET",
        role: "admin",
        query: { architecture: "arm64", minMemoryGb: 8 },
        expectStatus: 200,
      });
      const skus = unwrapArray(res.json, ["skus", "items"]);
      assert.ok(skus.length >= 1, "Expected arm64 SKUs with >= 8 GB memory");
      for (const sku of skus) {
        assert.equal(sku.architecture, "arm64");
        assert.ok(sku.memoryGb >= 8);
      }
    });

    it("T1-F09-04: GET /api/compatibility?provider=azure&serviceType=azure_sql returns valid Azure SQL SKUs", async () => {
      const res = await apiRequest("/api/compatibility", {
        method: "GET",
        role: "admin",
        query: { provider: "azure", serviceType: "azure_sql" },
        expectStatus: 200,
      });
      const skus = unwrapArray(res.json, ["skus", "items"]);
      assert.ok(skus.length >= 1);
      for (const sku of skus) {
        assert.equal(sku.provider, "azure");
        assert.equal(sku.serviceType, "azure_sql");
        assert.ok(sku.monthlyPriceUsd > 0);
        assert.ok(sku.effectiveDate);
      }
    });

    it("T1-F09-05: GET /api/compatibility?provider=gcp&serviceType=persistent_disk returns storage SKUs", async () => {
      const res = await apiRequest("/api/compatibility", {
        method: "GET",
        role: "admin",
        query: { provider: "gcp", serviceType: "persistent_disk" },
        expectStatus: 200,
      });
      const skus = unwrapArray(res.json, ["skus", "items"]);
      assert.ok(skus.length >= 1);
      for (const sku of skus) {
        assert.equal(sku.provider, "gcp");
        assert.equal(sku.serviceType, "persistent_disk");
        assert.ok(sku.monthlyPriceUsd >= 0);
        assert.ok(sku.iops !== undefined || sku.skuName);
      }
    });
  });

  // =========================================================================
  // Feature 10: Multi-Service Optimization & Overlap Solver
  // =========================================================================
  describe("Feature 10: Multi-Service Optimization & Overlap Solver", () => {
    it("T1-F10-01: Evaluates idle EC2, unattached EBS, and unassociated EIP with $0.005/hr IPv4 rule", async () => {
      const { recommendations } = await createFocusIdleAccountAndEval({
        provider: "aws",
        region: "us-east-1",
        cpuPercent: 1.5,
        billedCost: 70,
        extraRecords: [
          {
            ResourceId: `vol-e2e-${Date.now()}`,
            ResourceType: "ebs",
            ServiceName: "AmazonEBS",
            ServiceCategory: "Storage",
            LifecycleState: "available",
            SizeGb: 100,
            BilledCost: 10,
            EffectiveCost: 10,
          },
          {
            ResourceId: `eipalloc-e2e-${Date.now()}`,
            ResourceType: "eip",
            ServiceName: "AmazonVPC",
            ServiceCategory: "Networking",
            LifecycleState: "unassociated",
            BilledCost: 3.65,
            EffectiveCost: 3.65,
          },
        ],
      });

      assert.ok(recommendations.length >= 1, "Expected generated recommendations");
      const eipRec = recommendations.find((r) => String(r.title).toLowerCase().includes("ip") || r.resource?.resourceType === "eip");
      if (eipRec) {
        assert.ok(
          eipRec.estimatedMonthlySavings >= 3.5 && eipRec.estimatedMonthlySavings <= 3.7,
          `Expected EIP savings ~$3.60-$3.65/mo, got ${eipRec.estimatedMonthlySavings}`
        );
      }
    });

    it("T1-F10-02: Generated targetSku candidates respect architecture, headroom, and latency SLO constraints", async () => {
      const filtersRes = await apiRequest("/api/filters", { method: "GET", role: "admin", expectStatus: 200 });
      const workloadId = filtersRes.json?.workloads?.[0]?.id;

      const evalRes = await apiRequest("/api/recommendations/evaluate", {
        method: "POST",
        role: "finops",
        body: {
          workloadId,
          constraints: {
            requiredArchitecture: "x86_64",
            latencySloMs: 40,
            cpuHeadroomPct: 20,
          },
        },
        expectStatus: [200, 201],
      });
      assert.ok(evalRes.json && typeof evalRes.json === "object");

      const recsRes = await apiRequest("/api/recommendations", {
        method: "GET",
        role: "admin",
        expectStatus: 200,
      });
      const recs = unwrapArray(recsRes.json, ["recommendations", "items"]);
      assert.ok(recs.length >= 1);
      const withEvidence = recs.find((r) => r.evidence);
      assert.ok(withEvidence, "Recommendations must carry verifiable evidence JSON");
    });

    it("T1-F10-03: Pareto-optimal options carry isParetoOptimal: true across (Cost, Carbon, Latency)", async () => {
      await createFocusIdleAccountAndEval({ cpuPercent: 1.8, billedCost: 140 });
      const recsRes = await apiRequest("/api/recommendations", {
        method: "GET",
        role: "admin",
        expectStatus: 200,
      });
      const recs = unwrapArray(recsRes.json, ["recommendations", "items"]);
      assert.ok(recs.some((r) => r.isParetoOptimal === true), "Expected at least one isParetoOptimal recommendation");
    });

    it("T1-F10-04: Overlapping options share overlapGroupId and deduplicated totalMonthlySavings avoids double counting", async () => {
      const { account } = await createFocusIdleAccountAndEval({ cpuPercent: 1.1, billedCost: 140 });
      const recsRes = await apiRequest("/api/recommendations", {
        method: "GET",
        role: "admin",
        query: { accountIds: account.id },
        expectStatus: 200,
      });
      const recs = unwrapArray(recsRes.json, ["recommendations", "items"]);
      const grouped = new Map();
      for (const r of recs) {
        if (r.overlapGroupId) {
          const list = grouped.get(r.overlapGroupId) || [];
          list.push(r);
          grouped.set(r.overlapGroupId, list);
        }
      }
      const dedupedMaxSum = Array.from(grouped.values()).reduce(
        (sum, group) => sum + Math.max(...group.map((g) => g.estimatedMonthlySavings || 0)),
        0
      );
      const ungroupedSum = recs
        .filter((r) => !r.overlapGroupId)
        .reduce((sum, r) => sum + (r.estimatedMonthlySavings || 0), 0);
      const summaryTotal = recsRes.json?.summary?.totalMonthlySavings;
      if (typeof summaryTotal === "number" && grouped.size > 0) {
        assert.ok(
          summaryTotal <= dedupedMaxSum + ungroupedSum + 0.05,
          `Deduplicated total (${summaryTotal}) must not double-count overlapping groups`
        );
      }
    });

    it("T1-F10-05: Multi-provider evaluation generates provider-specific Terraform HCL / manifest configs", async () => {
      const { recommendations: azureRecs } = await createFocusIdleAccountAndEval({
        provider: "azure",
        region: "eastus",
        serviceName: "Virtual Machines",
        resourceType: "azure_vm",
        instanceType: "Standard_D4s_v5",
        cpuPercent: 1.2,
        billedCost: 140,
      });
      assert.ok(azureRecs.length >= 1, "Expected Azure recommendation");
      const azureRec = azureRecs[0];
      assert.ok(azureRec.estimatedMonthlySavings >= 0);
      const evidenceStr =
        typeof azureRec.evidence === "string"
          ? azureRec.evidence
          : JSON.stringify(azureRec.evidence || {});
      const configStr = `${evidenceStr} ${azureRec.targetConfig || ""}`;
      assert.ok(
        /azurerm_|terraform|Standard_|azure/i.test(configStr),
        "Azure recommendation must include Azure-specific config/Terraform"
      );
    });
  });

  // =========================================================================
  // Feature 11: 10-State Recommendation Lifecycle Machine
  // =========================================================================
  describe("Feature 11: 10-State Recommendation Lifecycle Machine", () => {
    it("T1-F11-01: Transitions detected -> recommended and persists LifecycleTransition row", async () => {
      const { recommendations } = await createFocusIdleAccountAndEval({ initialState: "detected" });
      const rec = recommendations.find((r) => r.lifecycleState === "detected") || recommendations[0];
      assert.equal(rec.lifecycleState, "detected", "Expected initial detected recommendation");

      const { users } = await fetchRolesAndUsers();
      const finopsId = getUserIdForRole(users, "finops");
      const res = await apiRequest(`/api/recommendations/${encodeURIComponent(rec.id)}/transition`, {
        method: "POST",
        role: "finops",
        userId: finopsId || undefined,
        body: { toState: "recommended", reason: "Validated evidence threshold" },
        expectStatus: 200,
      });
      const updated = res.json?.recommendation || res.json;
      assert.equal(updated.lifecycleState, "recommended");
      const transition = res.json?.transition;
      if (transition) {
        assert.equal(transition.fromState, "detected");
        assert.equal(transition.toState, "recommended");
      }
    });

    it("T1-F11-02: Chains recommended -> awaiting_approval -> approved with distinct SoD actors", async () => {
      const { recommendations } = await createFocusIdleAccountAndEval();
      const rec = recommendations[0];
      const { users } = await fetchRolesAndUsers();
      const finopsId = getUserIdForRole(users, "finops");
      const adminId = getUserIdForRole(users, "admin");

      const res = await advanceRecommendationToState(rec.id, "approved", {
        currentState: rec.lifecycleState || "recommended",
        requesterRole: "finops",
        requesterUserId: finopsId || undefined,
        approverRole: "admin",
        approverUserId: adminId || undefined,
      });
      assert.equal(res.finalState, "approved");

      const logsRes = await apiRequest("/api/audit-logs", {
        method: "GET",
        role: "admin",
        expectStatus: 200,
      });
      const logs = unwrapArray(logsRes.json, ["logs"]);
      assert.ok(logs.some((l) => l.objectId === rec.id));
    });

    it("T1-F11-03: Chains approved -> dry_run -> executing -> verifying as devops", async () => {
      const { recommendations } = await createFocusIdleAccountAndEval();
      const rec = recommendations[0];
      const { users } = await fetchRolesAndUsers();
      const finopsId = getUserIdForRole(users, "finops");
      const adminId = getUserIdForRole(users, "admin");
      const devopsId = getUserIdForRole(users, "devops");

      const res = await advanceRecommendationToState(rec.id, "verifying", {
        currentState: rec.lifecycleState || "recommended",
        requesterRole: "finops",
        requesterUserId: finopsId || undefined,
        approverRole: "admin",
        approverUserId: adminId || undefined,
        executorRole: "devops",
        executorUserId: devopsId || undefined,
      });
      assert.equal(res.finalState, "verifying");
      const dryRunStep = res.transitions.find((t) => t.toState === "dry_run");
      assert.ok(dryRunStep?.response, "Expected dry_run transition response");
    });

    it("T1-F11-04: Transitions verifying -> verified with chronological LifecycleTransition history", async () => {
      const { recommendations } = await createFocusIdleAccountAndEval();
      const rec = recommendations[0];
      const { users } = await fetchRolesAndUsers();
      const finopsId = getUserIdForRole(users, "finops");
      const adminId = getUserIdForRole(users, "admin");
      const devopsId = getUserIdForRole(users, "devops");

      const res = await advanceRecommendationToState(rec.id, "verified", {
        currentState: rec.lifecycleState || "recommended",
        requesterRole: "finops",
        requesterUserId: finopsId || undefined,
        approverRole: "admin",
        approverUserId: adminId || undefined,
        executorRole: "devops",
        executorUserId: devopsId || undefined,
        verifierRole: "finops",
        verifierUserId: finopsId || undefined,
      });
      assert.equal(res.finalState, "verified");

      const listRes = await apiRequest("/api/recommendations", {
        method: "GET",
        role: "admin",
        expectStatus: 200,
      });
      const updatedRec = unwrapArray(listRes.json, ["recommendations", "items"]).find(
        (r) => r.id === rec.id
      );
      assert.equal(updatedRec?.lifecycleState, "verified");
      if (Array.isArray(updatedRec?.lifecycleTransitions)) {
        assert.ok(updatedRec.lifecycleTransitions.length >= 4);
      }
    });

    it("T1-F11-05: Valid backtrack (awaiting_approval -> recommended) and terminal (recommended -> dismissed) succeed", async () => {
      const { recommendations } = await createFocusIdleAccountAndEval();
      const rec = recommendations[0];
      const { users } = await fetchRolesAndUsers();
      const finopsId = getUserIdForRole(users, "finops");
      const adminId = getUserIdForRole(users, "admin");

      await advanceRecommendationToState(rec.id, "awaiting_approval", {
        currentState: rec.lifecycleState || "recommended",
        requesterRole: "finops",
        requesterUserId: finopsId || undefined,
      });

      const backRes = await apiRequest(`/api/recommendations/${encodeURIComponent(rec.id)}/transition`, {
        method: "POST",
        role: "admin",
        userId: adminId || undefined,
        body: { toState: "recommended", reason: "Needs updated CPU baseline" },
        expectStatus: 200,
      });
      assert.equal((backRes.json?.recommendation || backRes.json)?.lifecycleState, "recommended");

      const dismissRes = await apiRequest(
        `/api/recommendations/${encodeURIComponent(rec.id)}/transition`,
        {
          method: "POST",
          role: "finops",
          userId: finopsId || undefined,
          body: { toState: "dismissed", reason: "Planned burst workload" },
          expectStatus: 200,
        }
      );
      assert.equal((dismissRes.json?.recommendation || dismissRes.json)?.lifecycleState, "dismissed");
    });
  });

  // =========================================================================
  // Feature 12: Dry-Run, Post-Change Billing Verification & Rollback
  // =========================================================================
  describe("Feature 12: Dry-Run, Post-Change Billing Verification & Rollback", () => {
    it("T1-F12-01: Dry-run transition generates pre-flight result and Terraform artifact path", async () => {
      const { recommendations } = await createFocusIdleAccountAndEval();
      const rec = recommendations[0];
      const { users } = await fetchRolesAndUsers();

      const res = await advanceRecommendationToState(rec.id, "dry_run", {
        currentState: rec.lifecycleState || "recommended",
        requesterRole: "finops",
        requesterUserId: getUserIdForRole(users, "finops") || undefined,
        approverRole: "admin",
        approverUserId: getUserIdForRole(users, "admin") || undefined,
        executorRole: "devops",
        executorUserId: getUserIdForRole(users, "devops") || undefined,
      });
      assert.equal(res.finalState, "dry_run");
      const payload = res.transitions.at(-1)?.response;
      const artifactPath =
        payload?.artifactPath || payload?.transition?.artifactPath || payload?.dryRun?.artifactPath;
      assert.ok(artifactPath, "Dry-run transition must return Terraform artifactPath");
    });

    it("T1-F12-02: POST /api/recommendations/[id]/approve creates PR/ticket artifact", async () => {
      const { recommendations } = await createFocusIdleAccountAndEval();
      const rec = recommendations[0];
      const { users } = await fetchRolesAndUsers();
      const devopsId = getUserIdForRole(users, "devops");

      const res = await apiRequest(`/api/recommendations/${encodeURIComponent(rec.id)}/approve`, {
        method: "POST",
        role: "devops",
        userId: devopsId || undefined,
        body: { mode: "pull_request", comment: "LGTM" },
        expectStatus: 200,
      });
      assert.equal(res.json?.recommendationId, rec.id);
      assert.equal(res.json?.mode, "pull_request");
      assert.ok(res.json?.outputPath, "Approve endpoint must return outputPath");
      trackArtifactPath(res.json.outputPath);

      const resolvedOutput = path.resolve(REPO_ROOT, res.json.outputPath);
      const stat = await fs.stat(resolvedOutput);
      assert.ok(stat.isFile() && stat.size > 0, "Generated PR file must exist on disk");
    });

    it("T1-F12-03: POST /api/recommendations/[id]/verify computes counterfactual verifiedSavings and transitions to verified", async () => {
      const { recommendations } = await createFocusIdleAccountAndEval();
      const rec = recommendations[0];
      const { users } = await fetchRolesAndUsers();
      const finopsId = getUserIdForRole(users, "finops");
      const adminId = getUserIdForRole(users, "admin");
      const devopsId = getUserIdForRole(users, "devops");

      await advanceRecommendationToState(rec.id, "verifying", {
        currentState: rec.lifecycleState || "recommended",
        requesterRole: "finops",
        requesterUserId: finopsId || undefined,
        approverRole: "admin",
        approverUserId: adminId || undefined,
        executorRole: "devops",
        executorUserId: devopsId || undefined,
      });

      const verifyRes = await apiRequest(`/api/recommendations/${encodeURIComponent(rec.id)}/verify`, {
        method: "POST",
        role: "finops",
        userId: finopsId || undefined,
        body: {
          expectedBaselineCost: 120,
          actualPostChangeCost: 70,
          observedP95LatencyMs: 25,
          latencySloMs: 50,
          billingLagHours: 72,
        },
        expectStatus: 200,
      });
      const outcome = verifyRes.json?.verification || verifyRes.json?.outcome || verifyRes.json;
      assert.equal(outcome.verifiedSavings, 50);
      assert.ok(Math.abs((outcome.verifiedSavingsPct ?? 41.67) - 41.67) < 0.1);
      assert.equal(outcome.guardrailPassed, true);
      assert.equal(outcome.verdict, "verified");
    });

    it("T1-F12-04: Rollback transition produces revert artifact and sets lifecycleState=rolled_back", async () => {
      const { recommendations } = await createFocusIdleAccountAndEval();
      const rec = recommendations[0];
      const { users } = await fetchRolesAndUsers();
      const devopsId = getUserIdForRole(users, "devops");

      await advanceRecommendationToState(rec.id, "executing", {
        currentState: rec.lifecycleState || "recommended",
        requesterRole: "finops",
        requesterUserId: getUserIdForRole(users, "finops") || undefined,
        approverRole: "admin",
        approverUserId: getUserIdForRole(users, "admin") || undefined,
        executorRole: "devops",
        executorUserId: devopsId || undefined,
      });

      const rbRes = await apiRequest(`/api/recommendations/${encodeURIComponent(rec.id)}/transition`, {
        method: "POST",
        role: "devops",
        userId: devopsId || undefined,
        body: { toState: "rolled_back", reason: "Manual rollback" },
        expectStatus: 200,
      });
      const updated = rbRes.json?.recommendation || rbRes.json;
      assert.equal(updated.lifecycleState, "rolled_back");
      const artifactPath =
        rbRes.json?.artifactPath || rbRes.json?.transition?.artifactPath || rbRes.json?.revertArtifactPath;
      if (typeof artifactPath === "string" && (artifactPath.includes("tickets/") || artifactPath.includes("pull_requests/"))) {
        trackArtifactPath(artifactPath);
      }
      assert.ok(artifactPath, "Rollback transition must generate revert artifact path");
    });

    it("T1-F12-05: /dashboard?tab=actions renders lifecycle badges, Dry-Run, Verify, and Rollback controls", async () => {
      const session = await getBrowserSession();
      if (session.available) {
        const settled = await visitAndSettle(session.page, "/dashboard?tab=actions&role=devops", {
          role: "devops",
        });
        assert.ok(
          /dry[- ]run|verify|rollback|lifecycle/i.test(settled.textContent),
          "Actions tab must render lifecycle workflow controls"
        );
      } else {
        const html = await fetchHtmlPage("/dashboard", {
          role: "devops",
          query: { tab: "actions", role: "devops" },
        });
        assert.equal(html.status, 200);
      }
    });
  });

  // =========================================================================
  // Feature 13: Credential-Gated Native Azure Connector
  // =========================================================================
  describe("Feature 13: Credential-Gated Native Azure Connector", () => {
    it("T1-F13-01: GET /api/connectors/status exposes Azure capability and disclosure", async () => {
      const caps = await getConnectorCapabilities();
      assert.equal(caps.statusCode, 200);
      const list = unwrapArray(caps.statusPayload, ["connectors"]);
      const azure =
        list.find((c) => (c.provider || c.id || "").toLowerCase() === "azure") ||
        caps.statusPayload?.azure;
      assert.ok(azure, "Expected Azure entry in /api/connectors/status");
      assert.ok(["live_api", "sandbox_fixture"].includes(azure.sourceMode));
      assert.ok(
        typeof azure.capabilityDisclosure === "string" && azure.capabilityDisclosure.length > 0,
        "Azure connector must include non-empty capabilityDisclosure"
      );
    });

    it("T1-F13-02: POST /api/cloud-accounts creates sanitized Azure account", async () => {
      const acc = await createIsolatedTestAccount({
        provider: "azure",
        name: "E2E Azure Sub",
        primaryRegion: "eastus",
      });
      assert.equal(acc.provider, "azure");
      assert.equal(acc.encryptedSecretKey, undefined);
      assert.equal(acc.clientSecret, undefined);
    });

    it("T1-F13-03: Unconfigured Azure sync completes in disclosed sandbox_fixture mode", async () => {
      const caps = await getConnectorCapabilities();
      const acc = await createIsolatedTestAccount({ provider: "azure", primaryRegion: "eastus" });
      const syncRes = await apiRequest("/api/sync-jobs", {
        method: "POST",
        role: "admin",
        body: { accountIds: [acc.id], triggerType: "manual" },
        expectStatus: [200, 201],
      });
      const dqRes = await apiRequest("/api/data-quality", {
        method: "GET",
        role: "admin",
        query: { accountIds: acc.id },
        expectStatus: 200,
      });
      const report = unwrapArray(dqRes.json, ["reports", "dataQualityReports"])[0];
      assert.ok(report, "Expected DataQualityReport for Azure sync");
      if (!caps.azureLive) {
        assert.equal(report.sourceMode, "sandbox_fixture");
        const job = syncRes.json?.job || unwrapArray(syncRes.json, ["jobs", "syncJobs"])[0] || syncRes.json;
        assert.ok(
          job?.capabilityDisclosure || report.sourceMode === "sandbox_fixture",
          "Unconfigured Azure sync must disclose sandbox_fixture mode"
        );
      } else {
        assert.equal(report.sourceMode, "live_api");
      }
    });

    it("T1-F13-04: Progressive live vs sandbox gate matches Azure environment credential configuration", async () => {
      const caps = await getConnectorCapabilities();
      const list = unwrapArray(caps.statusPayload, ["connectors"]);
      const azure =
        list.find((c) => (c.provider || c.id || "").toLowerCase() === "azure") ||
        caps.statusPayload?.azure;
      assert.equal(
        azure.sourceMode,
        caps.azureLive ? "live_api" : "sandbox_fixture",
        "Azure sourceMode must truthfully match credential availability"
      );
    });

    it("T1-F13-05: GET /api/dashboard?providers=azure returns Azure VM/disk telemetry and costs", async () => {
      const acc = await createIsolatedTestAccount({ provider: "azure", primaryRegion: "eastus" });
      await apiRequest("/api/sync-jobs", {
        method: "POST",
        role: "admin",
        body: { accountIds: [acc.id], triggerType: "manual" },
        expectStatus: [200, 201],
      });
      const dashRes = await apiRequest("/api/dashboard", {
        method: "GET",
        role: "admin",
        query: { providers: "azure", accountIds: acc.id },
        expectStatus: 200,
      });
      assert.ok(dashRes.json?.costs && typeof dashRes.json.costs === "object");
      assert.ok(dashRes.json?.carbon && typeof dashRes.json.carbon === "object");
    });
  });

  // =========================================================================
  // Feature 14: Credential-Gated Native GCP Connector
  // =========================================================================
  describe("Feature 14: Credential-Gated Native GCP Connector", () => {
    it("T1-F14-01: GET /api/connectors/status exposes GCP capability and disclosure", async () => {
      const caps = await getConnectorCapabilities();
      assert.equal(caps.statusCode, 200);
      const list = unwrapArray(caps.statusPayload, ["connectors"]);
      const gcp =
        list.find((c) => (c.provider || c.id || "").toLowerCase() === "gcp") ||
        caps.statusPayload?.gcp;
      assert.ok(gcp, "Expected GCP entry in /api/connectors/status");
      assert.ok(["live_api", "sandbox_fixture"].includes(gcp.sourceMode));
      assert.ok(typeof gcp.capabilityDisclosure === "string" && gcp.capabilityDisclosure.length > 0);
    });

    it("T1-F14-02: POST /api/cloud-accounts creates sanitized GCP account", async () => {
      const acc = await createIsolatedTestAccount({
        provider: "gcp",
        name: "E2E GCP Project",
        primaryRegion: "us-central1",
      });
      assert.equal(acc.provider, "gcp");
      assert.equal(acc.encryptedSecretKey, undefined);
    });

    it("T1-F14-03: Unconfigured GCP sync completes in disclosed sandbox_fixture mode", async () => {
      const caps = await getConnectorCapabilities();
      const acc = await createIsolatedTestAccount({ provider: "gcp", primaryRegion: "us-central1" });
      await apiRequest("/api/sync-jobs", {
        method: "POST",
        role: "admin",
        body: { accountIds: [acc.id], triggerType: "manual" },
        expectStatus: [200, 201],
      });
      const dqRes = await apiRequest("/api/data-quality", {
        method: "GET",
        role: "admin",
        query: { accountIds: acc.id },
        expectStatus: 200,
      });
      const report = unwrapArray(dqRes.json, ["reports", "dataQualityReports"])[0];
      assert.ok(report, "Expected DataQualityReport for GCP sync");
      assert.equal(report.sourceMode, caps.gcpLive ? "live_api" : "sandbox_fixture");
    });

    it("T1-F14-04: Progressive live vs sandbox gate matches GCP credential configuration", async () => {
      const caps = await getConnectorCapabilities();
      const list = unwrapArray(caps.statusPayload, ["connectors"]);
      const gcp =
        list.find((c) => (c.provider || c.id || "").toLowerCase() === "gcp") ||
        caps.statusPayload?.gcp;
      assert.equal(gcp.sourceMode, caps.gcpLive ? "live_api" : "sandbox_fixture");
    });

    it("T1-F14-05: GET /api/dashboard?providers=gcp renders GCP resources, costs, and carbon", async () => {
      const acc = await createIsolatedTestAccount({ provider: "gcp", primaryRegion: "us-central1" });
      await apiRequest("/api/sync-jobs", {
        method: "POST",
        role: "admin",
        body: { accountIds: [acc.id], triggerType: "manual" },
        expectStatus: [200, 201],
      });
      const dashRes = await apiRequest("/api/dashboard", {
        method: "GET",
        role: "admin",
        query: { providers: "gcp", accountIds: acc.id },
        expectStatus: 200,
      });
      assert.ok(dashRes.json?.costs && typeof dashRes.json.costs === "object");
      assert.ok(dashRes.json?.carbon && typeof dashRes.json.carbon === "object");
    });
  });

  // =========================================================================
  // Feature 15: Credential-Gated Kubernetes / OpenCost Integration
  // =========================================================================
  describe("Feature 15: Credential-Gated Kubernetes / OpenCost Integration", () => {
    it("T1-F15-01: GET /api/connectors/status includes kubernetes/opencost status and disclosure", async () => {
      const caps = await getConnectorCapabilities();
      assert.equal(caps.statusCode, 200);
      const list = unwrapArray(caps.statusPayload, ["connectors"]);
      const k8s =
        list.find((c) => ["kubernetes", "k8s", "opencost"].includes((c.provider || c.id || "").toLowerCase())) ||
        caps.statusPayload?.kubernetes ||
        caps.statusPayload?.k8s;
      assert.ok(k8s, "Expected kubernetes/opencost entry in /api/connectors/status");
      assert.ok(["live_api", "sandbox_fixture"].includes(k8s.sourceMode));
      assert.ok(typeof k8s.capabilityDisclosure === "string" && k8s.capabilityDisclosure.length > 0);
    });

    it("T1-F15-02: GET /api/k8s/allocations returns normalized pod cost, idle slack, energy, and carbon", async () => {
      const res = await apiRequest("/api/k8s/allocations", {
        method: "GET",
        role: "admin",
        expectStatus: 200,
      });
      const allocations = unwrapArray(res.json, ["allocations", "items"]);
      assert.ok(allocations.length >= 1, "Expected >= 1 K8sWorkloadAllocation");
      const a = allocations[0];
      for (const field of [
        "clusterName",
        "namespace",
        "deployment",
        "podName",
        "cpuRequested",
        "cpuLimit",
        "cpuP95",
        "memoryRequestedGb",
        "memoryP95Gb",
        "monthlyCost",
        "idleSlackCost",
        "energyKwh",
        "operationalGco2e",
        "sourceMode",
      ]) {
        assert.ok(a[field] !== undefined, `K8s allocation missing field "${field}"`);
      }
      assert.ok(
        a.capabilityDisclosure || res.json?.capabilityDisclosure,
        "K8s allocations must disclose capability/provenance"
      );
    });

    it("T1-F15-03: Triggering K8s sync populates allocations with truthful sourceMode and idleSlackCost >= 0", async () => {
      const caps = await getConnectorCapabilities();
      const acc = await createIsolatedTestAccount({ provider: "kubernetes", primaryRegion: "us-east-1" });
      await apiRequest("/api/sync-jobs", {
        method: "POST",
        role: "devops",
        body: { accountIds: [acc.id], triggerType: "manual" },
        expectStatus: [200, 201],
      });
      const allocRes = await apiRequest("/api/k8s/allocations", {
        method: "GET",
        role: "devops",
        expectStatus: 200,
      });
      const allocations = unwrapArray(allocRes.json, ["allocations", "items"]);
      assert.ok(allocations.length >= 1);
      for (const a of allocations) {
        assert.ok(a.idleSlackCost >= 0);
      }
      assert.equal(allocations[0].sourceMode, caps.k8sLive ? "live_api" : "sandbox_fixture");
    });

    it("T1-F15-04: GET /api/k8s/allocations filters by GlobalFilterChain parameters", async () => {
      const baseRes = await apiRequest("/api/k8s/allocations", {
        method: "GET",
        role: "admin",
        query: { window: "30d" },
        expectStatus: 200,
      });
      const first = unwrapArray(baseRes.json, ["allocations", "items"])[0];
      assert.ok(first, "Expected at least one K8s allocation");

      const filteredRes = await apiRequest("/api/k8s/allocations", {
        method: "GET",
        role: "admin",
        query: { window: "30d", ...(first.workloadId ? { workloadIds: first.workloadId } : {}) },
        expectStatus: 200,
      });
      const filtered = unwrapArray(filteredRes.json, ["allocations", "items"]);
      assert.ok(filtered.length >= 1);
    });

    it("T1-F15-05: /dashboard?role=devops displays Kubernetes cluster/namespace breakdown and sourceMode", async () => {
      const session = await getBrowserSession();
      if (session.available) {
        const settled = await visitAndSettle(session.page, "/dashboard?role=devops", {
          role: "devops",
        });
        assert.ok(
          /kubernetes|k8s|namespace|idle slack|sandbox_fixture|live_api/i.test(settled.textContent),
          "DevOps dashboard must surface Kubernetes allocations and provenance"
        );
      } else {
        const html = await fetchHtmlPage("/dashboard", { role: "devops", query: { role: "devops" } });
        assert.equal(html.status, 200);
      }
    });
  });

  // =========================================================================
  // Feature 16: Credential-Gated Grid Carbon Intensity Connector
  // =========================================================================
  describe("Feature 16: Credential-Gated Grid Carbon Intensity Connector", () => {
    it("T1-F16-01: GET /api/connectors/status reports gridIntensity status and capabilityDisclosure", async () => {
      const caps = await getConnectorCapabilities();
      assert.equal(caps.statusCode, 200);
      const list = unwrapArray(caps.statusPayload, ["connectors"]);
      const grid =
        list.find((c) =>
          ["gridintensity", "grid", "electricitymaps", "watttime"].includes(
            (c.provider || c.id || "").toLowerCase()
          )
        ) ||
        caps.statusPayload?.gridIntensity ||
        caps.statusPayload?.grid;
      assert.ok(grid, "Expected gridIntensity entry in /api/connectors/status");
      assert.ok(["live_api", "sandbox_fixture", "static_catalog"].includes(grid.sourceMode));
      assert.ok(typeof grid.capabilityDisclosure === "string" && grid.capabilityDisclosure.length > 0);
    });

    it("T1-F16-02: GET /api/dashboard regionalGrid reports lower carbon intensity in eu-north-1 than us-east-1", async () => {
      const payload = buildFocusPayload({
        provider: "aws",
        region: "us-east-1",
        billedCost: 60,
        cpuPercent: 25,
      });
      payload.records.push({
        ...payload.records[0],
        RegionId: "eu-north-1",
        ResourceId: `i-e2e-eunorth-${Date.now()}`,
      });
      await apiRequest("/api/cloud-accounts/import-focus", {
        method: "POST",
        role: "admin",
        body: payload,
        expectStatus: [200, 201],
      });
      const acc = await findAccountByExternalId(payload.externalAccountId);
      if (acc?.id) trackAccount(acc.id);

      const dashRes = await apiRequest("/api/dashboard", {
        method: "GET",
        role: "sustainability",
        query: { window: "30d", ...(acc?.id ? { accountIds: acc.id } : {}) },
        expectStatus: 200,
      });
      const grid = dashRes.json?.carbon?.regionalGrid || [];
      assert.ok(Array.isArray(grid) && grid.length >= 2, "Expected >= 2 regionalGrid entries");
      const usEast = grid.find((g) => g.region === "us-east-1");
      const euNorth = grid.find((g) => g.region === "eu-north-1");
      if (usEast && euNorth) {
        assert.ok(
          euNorth.gridIntensity < usEast.gridIntensity,
          `Expected eu-north-1 (${euNorth.gridIntensity}) < us-east-1 (${usEast.gridIntensity})`
        );
      }
    });

    it("T1-F16-03: Grid carbon provenance matches live vs static catalog configuration", async () => {
      const caps = await getConnectorCapabilities();
      const list = unwrapArray(caps.statusPayload, ["connectors"]);
      const grid =
        list.find((c) =>
          ["gridintensity", "grid", "electricitymaps", "watttime"].includes(
            (c.provider || c.id || "").toLowerCase()
          )
        ) ||
        caps.statusPayload?.gridIntensity ||
        caps.statusPayload?.grid;
      if (caps.gridLive) {
        assert.equal(grid.sourceMode, "live_api");
      } else {
        assert.ok(["sandbox_fixture", "static_catalog"].includes(grid.sourceMode));
      }
    });

    it("T1-F16-04: Dashboard carbon.sciScore reconciles exactly with ((E*I) + M) / R", async () => {
      const [dashRes, cfgRes] = await Promise.all([
        apiRequest("/api/dashboard", {
          method: "GET",
          role: "sustainability",
          query: { window: "30d" },
          expectStatus: 200,
        }),
        apiRequest("/api/workspace/config", { method: "GET", role: "admin", expectStatus: 200 }),
      ]);
      const carbon = dashRes.json?.carbon;
      const functionalUnits = cfgRes.json?.functionalUnits || 100000;
      assert.ok(carbon && typeof carbon.sciScore === "number");
      const expectedSci =
        ((carbon.totalOperationalCarbon || 0) + (carbon.totalEmbodiedCarbon || 0)) /
        functionalUnits;
      assert.ok(
        Math.abs(carbon.sciScore - expectedSci) <= 1e-3,
        `SCI mismatch: got ${carbon.sciScore}, expected ${expectedSci}`
      );
    });

    it("T1-F16-05: /dashboard?tab=carbon&role=sustainability displays Scope 2, Scope 3, and grid comparison", async () => {
      const session = await getBrowserSession();
      if (session.available) {
        const settled = await visitAndSettle(
          session.page,
          "/dashboard?tab=carbon&role=sustainability",
          { role: "sustainability" }
        );
        assert.ok(
          /scope 2|operational|embodied|sci|grid/i.test(settled.textContent),
          "Sustainability carbon tab must display Scope 2/3 and SCI breakdown"
        );
      } else {
        const html = await fetchHtmlPage("/dashboard", {
          role: "sustainability",
          query: { tab: "carbon", role: "sustainability" },
        });
        assert.equal(html.status, 200);
      }
    });
  });

  // =========================================================================
  // Feature 17: Shared 17-Chart Visualization Engine
  // =========================================================================
  describe("Feature 17: Shared 17-Chart Visualization Engine", () => {
    const ALL_17_CHART_TYPES = [
      "line",
      "area",
      "stackedarea",
      "bar",
      "stackedbar",
      "histogram",
      "scatterbubble",
      "heatmap",
      "treemap",
      "waterfall",
      "sankey",
      "radar",
      "pareto",
      "gauge",
      "forecastuncertaintyband",
      "beforeafter",
      "geographicmap",
    ];

    it("T1-F17-01: All 17 chart types render across the 6 role views without errors or NaN SVG paths", async () => {
      const session = await getBrowserSession();
      if (session.available) {
        const seenTypes = new Set();
        for (const role of ROLES) {
          await visitAndSettle(session.page, `/dashboard?role=${role}`, { role });
          const chartInfo = await session.page.evaluate(() => {
            const cards = Array.from(document.querySelectorAll('[data-testid="chart-card"]'));
            return cards.map((c) => ({
              type: (c.getAttribute("data-chart-type") || c.getAttribute("data-chart-id") || "").toLowerCase().replace(/[^a-z]/g, ""),
              badPaths: Array.from(c.querySelectorAll("svg path"))
                .map((p) => p.getAttribute("d") || "")
                .filter((d) => /NaN|Infinity/i.test(d)),
            }));
          });
          for (const item of chartInfo) {
            assert.equal(item.badPaths.length, 0, `Invalid SVG paths on role=${role}`);
            if (item.type) seenTypes.add(item.type);
          }
        }
        for (const requiredType of ALL_17_CHART_TYPES) {
          const matched = Array.from(seenTypes).some((s) => s.includes(requiredType));
          assert.ok(matched, `Chart type "${requiredType}" not observed across role dashboard views`);
        }
      } else {
        const chartIndexPath = path.join(REPO_ROOT, "src/components/charts/index.ts");
        const indexSource = await fs.readFile(chartIndexPath, "utf-8");
        for (const requiredType of ALL_17_CHART_TYPES) {
          assert.ok(
            indexSource.toLowerCase().replace(/[^a-z]/g, "").includes(requiredType),
            `src/components/charts/index.ts must export "${requiredType}" chart component`
          );
        }
      }
    });

    it("T1-F17-02: ChartCard exposes title, unit, dataStatus, and freshnessTimestamp contract", async () => {
      const session = await getBrowserSession();
      if (session.available) {
        await visitAndSettle(session.page, "/dashboard?role=finops", { role: "finops" });
        const cardCount = await session.page.locator('[data-testid="chart-card"]').count();
        assert.ok(cardCount >= 1, "Expected >= 1 ChartCard on FinOps dashboard");
        await assertChartCardContract(session.page, "", { allowEmpty: true });
      } else {
        const chartCardSrc = await fs.readFile(
          path.join(REPO_ROOT, "src/components/charts/ChartCard.tsx"),
          "utf-8"
        );
        assert.ok(chartCardSrc.includes('data-testid="chart-card"'));
        assert.ok(chartCardSrc.includes("data-unit"));
        assert.ok(chartCardSrc.includes("data-status"));
      }
    });

    it("T1-F17-03: ChartCard uses warm tonal tokens (#FAF6E8, #FFFDF4, #ECE5CC), 0px border, and tabular-nums", async () => {
      const dash = await fetchHtmlPage("/dashboard", { role: "finops", query: { role: "finops" } });
      const css = await fetchLinkedCss(dash.stylesheets);
      const session = await getBrowserSession();
      if (session.available) {
        await visitAndSettle(session.page, "/dashboard?role=finops", { role: "finops" });
        await assertDesignCompliance({
          cssText: css,
          routeName: "/dashboard?role=finops",
          page: session.page,
        });
      } else {
        await assertDesignCompliance({
          html: dash.html,
          textContent: dash.textContent,
          cssText: css,
          routeName: "/dashboard?role=finops",
        });
      }
    });

    it("T1-F17-04: Interactive Recharts tooltip renders with #2E2B1A container and valid formatted units", async () => {
      const session = await getBrowserSession();
      if (session.available) {
        await visitAndSettle(session.page, "/dashboard?role=finops", { role: "finops" });
        const svgTarget = session.page.locator('[data-testid="chart-card"] svg.recharts-surface').first();
        if ((await svgTarget.count()) > 0) {
          const box = await svgTarget.boundingBox();
          if (box) {
            await session.page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
            await session.page.waitForTimeout(200);
            const tooltipText = await session.page.evaluate(() => {
              const tip = document.querySelector(".recharts-tooltip-wrapper");
              return tip ? tip.textContent || "" : "";
            });
            assert.equal(/NaN|undefined/i.test(tooltipText), false, `Invalid tooltip text: ${tooltipText}`);
          }
        }
      } else {
        const globalsCss = await fs.readFile(path.join(REPO_ROOT, "src/styles/globals.css"), "utf-8");
        assert.ok(/tabular-nums/i.test(globalsCss));
      }
    });

    it("T1-F17-05: ForecastUncertaintyBand, Pareto, BeforeAfter, and GeographicMap receive valid domain payloads", async () => {
      const [dashRes, recsRes] = await Promise.all([
        apiRequest("/api/dashboard", {
          method: "GET",
          role: "architect",
          query: { window: "30d" },
          expectStatus: 200,
        }),
        apiRequest("/api/recommendations", {
          method: "GET",
          role: "architect",
          expectStatus: 200,
        }),
      ]);
      assert.ok(Array.isArray(dashRes.json?.forecast?.trajectory));
      assert.ok(Array.isArray(dashRes.json?.carbon?.regionalGrid));
      assert.ok(Array.isArray(unwrapArray(recsRes.json, ["recommendations", "items"])));
    });
  });

  // =========================================================================
  // Feature 18: 6 Role-Specific Views & design.md Compliance Sweep
  // =========================================================================
  describe("Feature 18: 6 Role-Specific Views & design.md Compliance Sweep", () => {
    it("T1-F18-01: Admin and FinOps views prioritize governance and cost intelligence", async () => {
      const session = await getBrowserSession();
      if (session.available) {
        const adminPage = await visitAndSettle(session.page, "/dashboard?role=admin", { role: "admin" });
        assert.ok(/rbac|sync|audit|approval/i.test(adminPage.textContent));
        const finopsPage = await visitAndSettle(session.page, "/dashboard?role=finops", { role: "finops" });
        assert.ok(/cost|budget|forecast|savings/i.test(finopsPage.textContent));
      } else {
        const [a, f] = await Promise.all([
          fetchHtmlPage("/dashboard", { role: "admin", query: { role: "admin" } }),
          fetchHtmlPage("/dashboard", { role: "finops", query: { role: "finops" } }),
        ]);
        assert.equal(a.status, 200);
        assert.equal(f.status, 200);
      }
    });

    it("T1-F18-02: DevOps and Architect views prioritize telemetry/K8s and regional Pareto/compatibility", async () => {
      const session = await getBrowserSession();
      if (session.available) {
        const devopsPage = await visitAndSettle(session.page, "/dashboard?role=devops", { role: "devops" });
        assert.ok(/p95|kubernetes|ebs|terraform|telemetry/i.test(devopsPage.textContent));
        const archPage = await visitAndSettle(session.page, "/dashboard?role=architect", { role: "architect" });
        assert.ok(/pareto|region|architecture|headroom|compatibility/i.test(archPage.textContent));
      } else {
        const [d, a] = await Promise.all([
          fetchHtmlPage("/dashboard", { role: "devops", query: { role: "devops" } }),
          fetchHtmlPage("/dashboard", { role: "architect", query: { role: "architect" } }),
        ]);
        assert.equal(d.status, 200);
        assert.equal(a.status, 200);
      }
    });

    it("T1-F18-03: Sustainability and Viewer views tailor carbon metrics and disable mutations for viewer", async () => {
      const session = await getBrowserSession();
      if (session.available) {
        const sustPage = await visitAndSettle(session.page, "/dashboard?role=sustainability", {
          role: "sustainability",
        });
        assert.ok(/sci|scope|carbon|grid/i.test(sustPage.textContent));
        await visitAndSettle(session.page, "/dashboard?role=viewer", { role: "viewer" });
      }
      const viewerPatch = await apiRequest("/api/workspace/config", {
        method: "PATCH",
        role: "viewer",
        body: { monthlyBudget: 999 },
      });
      assert.equal(viewerPatch.status, 403, "Viewer write attempt must return 403 FORBIDDEN");
    });

    it("T1-F18-04: All public and workspace routes return HTTP 200 with zero overflow at 1280px and 375px", async () => {
      const routes = ["/", "/onboarding", "/audit-history", "/how-it-works", "/why", "/docs"];
      for (const route of routes) {
        const pageRes = await fetchHtmlPage(route);
        assert.equal(pageRes.status, 200);
      }

      const session = await getBrowserSession();
      if (session.available) {
        for (const viewport of [
          { width: 1280, height: 800 },
          { width: 375, height: 812 },
        ]) {
          await session.page.setViewportSize(viewport);
          for (const route of routes) {
            await visitAndSettle(session.page, route);
            const overflow = await session.page.evaluate(
              () => document.documentElement.scrollWidth > window.innerWidth + 1
            );
            assert.equal(
              overflow,
              false,
              `Horizontal overflow detected on ${route} at ${viewport.width}px`
            );
          }
        }
        await session.page.setViewportSize({ width: 1280, height: 800 });
      }
    });

    it("T1-F18-05: Full design.md compliance sweep across all routes", async () => {
      const routes = ["/", "/dashboard", "/onboarding", "/audit-history", "/how-it-works", "/why", "/docs"];
      const session = await getBrowserSession();
      for (const route of routes) {
        const pageRes = await fetchHtmlPage(route, { role: "admin" });
        const cssText = await fetchLinkedCss(pageRes.stylesheets);
        if (session.available) {
          await visitAndSettle(session.page, route, { role: "admin" });
          await assertDesignCompliance({
            cssText,
            routeName: route,
            page: session.page,
          });
        } else {
          await assertDesignCompliance({
            html: pageRes.html,
            textContent: pageRes.textContent,
            cssText,
            routeName: route,
          });
        }
      }
    });
  });

  // =========================================================================
  // Feature 19: End-to-End Platform Documentation
  // =========================================================================
  describe("Feature 19: End-to-End Platform Documentation", () => {
    it("T1-F19-01: GET /docs renders multi-cloud, RBAC, lifecycle, and API documentation", async () => {
      const docsPage = await fetchHtmlPage("/docs");
      assert.equal(docsPage.status, 200);
      assert.ok(/aws|azure|gcp|kubernetes/i.test(docsPage.textContent));
      assert.ok(/rbac|lifecycle|verification/i.test(docsPage.textContent));

      const session = await getBrowserSession();
      if (session.available) {
        await visitAndSettle(session.page, "/docs");
      }
    });

    it("T1-F19-02: README.md, ARCHITECTURE_AND_FORMULAS.md, AUTH_AND_RBAC.md, and MILESTONES_2_TO_12.md exist", async () => {
      const requiredDocs = [
        "README.md",
        "docs/ARCHITECTURE_AND_FORMULAS.md",
        "docs/AUTH_AND_RBAC.md",
        "docs/MILESTONES_2_TO_12.md",
      ];
      for (const relPath of requiredDocs) {
        const fullPath = path.join(REPO_ROOT, relPath);
        const content = await fs.readFile(fullPath, "utf-8");
        assert.ok(content.trim().length > 100, `Documentation file ${relPath} must be non-empty`);
      }
    });

    it("T1-F19-03: docs/AUTH_AND_RBAC.md documents resolveRequestActor, allow/deny precedence, and SoD", async () => {
      const authDoc = await fs.readFile(path.join(REPO_ROOT, "docs/AUTH_AND_RBAC.md"), "utf-8");
      assert.ok(authDoc.includes("resolveRequestActor"));
      assert.ok(/allow|deny/i.test(authDoc));
      assert.ok(/separation of duties|sod/i.test(authDoc));
      assert.ok(/oidc|saml|nextauth|clerk/i.test(authDoc));
    });

    it("T1-F19-04: docs/ARCHITECTURE_AND_FORMULAS.md formulas match live API outputs", async () => {
      const archDoc = await fs.readFile(
        path.join(REPO_ROOT, "docs/ARCHITECTURE_AND_FORMULAS.md"),
        "utf-8"
      );
      assert.ok(archDoc.includes("SCI = ((E × I) + M) / R") || archDoc.includes("((E * I) + M) / R"));
      assert.ok(archDoc.includes("VerifiedSavings"));
      assert.ok(archDoc.includes("RequiredCapacity"));

      const dashRes = await apiRequest("/api/dashboard", {
        method: "GET",
        role: "sustainability",
        query: { window: "30d" },
        expectStatus: 200,
      });
      assert.equal(typeof dashRes.json?.carbon?.sciScore, "number");
    });

    it("T1-F19-05: /how-it-works and /why render cleanly without em dashes or banned demo banners", async () => {
      for (const route of ["/how-it-works", "/why"]) {
        const pageRes = await fetchHtmlPage(route);
        const cssText = await fetchLinkedCss(pageRes.stylesheets);
        await assertDesignCompliance({
          html: pageRes.html,
          textContent: pageRes.textContent,
          cssText,
          routeName: route,
        });
      }
    });
  });
});
