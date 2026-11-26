import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { issueSession } from "../../src/services/workspaceSession.ts";

const { GREENCLOUD_TEST_URL, GREENCLOUD_TEST_DB, GREENCLOUD_SESSION_SECRET } = process.env;
if (!GREENCLOUD_TEST_URL || !GREENCLOUD_TEST_DB || !GREENCLOUD_SESSION_SECRET) {
  throw new Error("Set GREENCLOUD_TEST_URL, GREENCLOUD_TEST_DB, and GREENCLOUD_SESSION_SECRET for an isolated test server and database.");
}
const base = new URL(GREENCLOUD_TEST_URL);
assert.ok(["localhost", "127.0.0.1"].includes(base.hostname) && base.port && base.port !== "3000",
  "Run this fixture on a separate loopback test server.");
const prisma = new PrismaClient({ datasourceUrl: "file:" + path.resolve(GREENCLOUD_TEST_DB) });
const fixture = randomUUID();
const tenants = [];

async function account(tenantId, name, provider, cost) {
  const created = await prisma.cloudAccount.create({ data: { tenantId, provider, externalAccountId: fixture + name, name, status: "active" } });
  await prisma.costLineItem.create({ data: {
    cloudAccountId: created.id, provider, chargeDate: new Date(), providerService: name,
    billedCost: cost, effectiveCost: cost,
  } });
  await prisma.cloudResource.create({ data: {
    cloudAccountId: created.id, provider, providerResourceId: fixture + name,
    resourceType: "ec2", region: "test-region", lifecycleState: "running", tags: "[]",
  } });
  return created.id;
}

async function role(name, permissions) {
  const created = await prisma.role.create({ data: {
    slug: fixture + name, name, description: "Authorization fixture", tenantId: tenants[0], isSystem: false,
  } });
  for (const key of permissions) {
    const permission = await prisma.permission.upsert({
      where: { key }, update: {}, create: { key, category: "test", description: "Test permission" },
    });
    await prisma.rolePermission.create({ data: { roleId: created.id, permissionId: permission.id } });
  }
  return created.id;
}

try {
  for (const name of ["Primary", "Other organization"]) {
    const workspace = await prisma.tenant.create({ data: { name: name + fixture } });
    tenants.push(workspace.id);
  }
  const [workspace, foreign] = tenants;
  const user = await prisma.user.create({ data: { tenantId: workspace, email: fixture + "@example.test", displayName: "Scoped user" } });
  const production = await account(workspace, "Production", "aws", 10);
  const development = await account(workspace, "Development", "azure", 20);
  const restricted = await account(workspace, "Restricted", "gcp", 100);
  const outside = await account(foreign, "Outside", "aws", 1000);
  const reads = ["account:read", "dashboard:read"];
  const finops = await role("FinOps", [...reads, "billing:export", "sync:trigger"]);
  const viewer = await role("Viewer", reads);
  for (const [scopeId, roleId] of [[production, finops], [development, viewer]]) {
    await prisma.roleAssignment.create({ data: {
      tenantId: workspace, userId: user.id, roleId, scopeId, scopeType: "account", assignedBy: "fixture",
    } });
  }
  await prisma.cloudAccount.update({ where: { id: production }, data: {
    externalAccountId: "000000000001", roleArn: "arn:aws:iam::000000000001:role/FixtureOnly",
  } });
  const priorSuccess = new Date(Date.now() - 86400000).toISOString();
  await prisma.syncJob.create({ data: {
    tenantId: workspace, cloudAccountId: production, provider: "aws", triggerType: "manual",
    status: "completed", startedAt: new Date(priorSuccess), finishedAt: new Date(priorSuccess),
    subSourceStatuses: JSON.stringify({ billing: { status: "available", records: 1, lastSuccess: priorSuccess } }),
  } });
  const token = issueSession(user.id, workspace, GREENCLOUD_SESSION_SECRET);
  const headers = { Authorization: "Bearer " + token };
  const request = (route, init) => fetch(new URL(route, base), init);

  assert.equal((await request("/api/dashboard")).status, 401);
  const response = await request("/api/dashboard?accountIds=all&role=finops", { headers });
  assert.equal(response.status, 200);
  const summary = await response.json();
  assert.deepEqual(summary.selectedAccounts.map(a => a.id).sort(), [production, development].sort());
  assert.equal(summary.costs.totalCost, 30);
  assert.equal(summary.resources.total, 2);
  assert.deepEqual(summary.resources.ec2.map(item => item.cloudAccountId).sort(), [production, development].sort());
  assert.deepEqual(summary.auditLogs, []);

  const filtered = await (await request("/api/dashboard?accountIds=" + [restricted, outside].join(","), { headers })).json();
  assert.deepEqual(filtered.scope.accountIds, []);
  assert.equal(filtered.account, null);

  for (const query of ["accountIds=", "providers=unknown", "accountIds=all," + outside]) {
    const invalidScope = await (await request("/api/dashboard?" + query, { headers })).json();
    assert.deepEqual(invalidScope.scope.accountIds, []);
    assert.equal((await request("/api/dashboard/export?" + query, { headers })).status, 403);
  }
  const azureScope = await (await request("/api/dashboard?providers=%20AZURE%20", { headers })).json();
  assert.deepEqual(azureScope.scope.accountIds, [development]);

  const exported = await request("/api/dashboard/export?accountIds=all", { headers });
  assert.equal(exported.status, 200);
  const billing = await exported.json();
  assert.deepEqual(billing.accounts.map(a => a.id), [production]);
  assert.deepEqual(billing.rows.map(row => row.billedCost), [10]);
  assert.equal((await request("/api/dashboard/export?accountIds=" + development, { headers })).status, 403);
  assert.equal((await request("/api/cloud-accounts", { headers })).status, 403);

  const syncPath = (id) => "/api/cloud-accounts/" + id + "/sync";
  assert.equal((await request(syncPath(production), { method: "POST" })).status, 401);
  for (const id of [development, restricted, outside]) {
    assert.equal((await request(syncPath(id), { method: "POST", headers })).status, 404);
  }
  if (process.env.GREENCLOUD_TEST_OFFLINE_SYNC === "true") {
    const syncResponse = await request(syncPath(production), { method: "POST", headers });
    assert.equal(syncResponse.status, 200);
    const outcome = await syncResponse.json();
    assert.equal(outcome.status, "failed");
    assert.equal(outcome.sources.billing.status, "failed");
    assert.equal(outcome.sources.billing.lastSuccess, priorSuccess);
    const refreshed = await (await request("/api/dashboard", { headers })).json();
    assert.equal(refreshed.costs.totalCost, 30);
    assert.equal(refreshed.selectedAccounts.find(a => a.id === production).sync.status, "failed");
    const audit = await prisma.auditLog.findFirstOrThrow({ where: { tenantId: workspace, action: "sync_triggered" } });
    assert.equal(audit.actor, user.id);
  }

  const signedIn = await request("/api/workspace/session", {
    method: "POST",
    headers: { Origin: base.origin },
    body: new URLSearchParams({ session: token }),
    redirect: "manual",
  });
  assert.equal(signedIn.status, 303);
  const cookie = signedIn.headers.get("set-cookie");
  assert.match(cookie, /HttpOnly/i);
  assert.equal((await request("/api/dashboard", { headers: { Cookie: cookie.split(";")[0] } })).status, 200);
  console.log("Verified real HTTP session, two-workspace isolation, scoped totals, restricted export, and legacy endpoint gating.");
} finally {
  await prisma.tenant.deleteMany({ where: { id: { in: tenants } } });
  await prisma.$disconnect();
}
