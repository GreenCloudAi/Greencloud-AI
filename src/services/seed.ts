import { prisma } from "./db";

export interface PermissionSeed {
  key: string;
  category: string;
  description: string;
}

export interface RoleSeed {
  slug: "admin" | "finops" | "devops" | "architect" | "sustainability" | "viewer";
  name: string;
  description: string;
  allow: string[];
  deny: string[];
}

export const PERMISSION_SEEDS: PermissionSeed[] = [
  { key: "dashboard:read", category: "dashboard", description: "Read dashboard telemetry and summaries" },
  { key: "account:read", category: "accounts", description: "View connected cloud accounts" },
  { key: "account:write", category: "accounts", description: "Connect, update, or disconnect cloud accounts" },
  { key: "credentials:write", category: "accounts", description: "Store or purge encrypted cloud credentials" },
  { key: "sync:trigger", category: "sync", description: "Trigger cloud telemetry and billing sync jobs" },
  { key: "focus:import", category: "sync", description: "Import CNCF FOCUS CSV/JSON billing datasets" },
  { key: "recommendation:read", category: "recommendations", description: "View optimization recommendations and evidence" },
  { key: "recommendation:recommend", category: "recommendations", description: "Generate or promote recommendations" },
  { key: "recommendation:request_approval", category: "recommendations", description: "Submit recommendations for approval" },
  { key: "recommendation:approve", category: "recommendations", description: "Approve or dismiss optimization recommendations" },
  { key: "recommendation:dry_run", category: "recommendations", description: "Run pre-flight dry-run checks and generate IaC diffs" },
  { key: "recommendation:execute", category: "recommendations", description: "Execute approved infrastructure remediations" },
  { key: "recommendation:verify", category: "recommendations", description: "Run post-change counterfactual billing verification" },
  { key: "recommendation:rollback", category: "recommendations", description: "Revert or roll back executed recommendations" },
  { key: "rbac:read", category: "governance", description: "Inspect roles, permissions, users, and assignments" },
  { key: "rbac:manage", category: "governance", description: "Create users and manage scoped role assignments" },
  { key: "budget:write", category: "governance", description: "Update workspace monthly budget targets" },
  { key: "policy:write", category: "governance", description: "Update SCI functional units and optimization policies" },
  { key: "audit:read", category: "governance", description: "View immutable workspace audit logs" },
  { key: "k8s:read", category: "kubernetes", description: "View Kubernetes and OpenCost workload allocations" },
  { key: "k8s:sync", category: "kubernetes", description: "Trigger Kubernetes and OpenCost telemetry syncs" },
];

export const ROLE_SEEDS: RoleSeed[] = [
  {
    slug: "admin",
    name: "Workspace Admin",
    description: "Cross-account governance, RBAC administration, budgets, and approvals without silent infra execution",
    allow: [
      "dashboard:read",
      "account:read",
      "account:write",
      "credentials:write",
      "sync:trigger",
      "focus:import",
      "recommendation:read",
      "recommendation:recommend",
      "recommendation:request_approval",
      "recommendation:approve",
      "recommendation:dry_run",
      "recommendation:verify",
      "rbac:read",
      "rbac:manage",
      "budget:write",
      "policy:write",
      "audit:read",
      "k8s:read",
      "k8s:sync",
    ],
    deny: ["recommendation:execute", "recommendation:rollback"],
  },
  {
    slug: "finops",
    name: "FinOps Engineer",
    description: "Billed vs. effective cost attribution, commitment savings, budgets, and approval governance",
    allow: [
      "dashboard:read",
      "account:read",
      "sync:trigger",
      "focus:import",
      "recommendation:read",
      "recommendation:recommend",
      "recommendation:request_approval",
      "recommendation:approve",
      "recommendation:verify",
      "budget:write",
      "audit:read",
      "rbac:read",
      "k8s:read",
    ],
    deny: [
      "account:write",
      "credentials:write",
      "recommendation:dry_run",
      "recommendation:execute",
      "recommendation:rollback",
      "rbac:manage",
      "policy:write",
      "k8s:sync",
    ],
  },
  {
    slug: "devops",
    name: "DevOps Engineer",
    description: "Infrastructure telemetry, dry-run validation, execution, and rollback without self-approval",
    allow: [
      "dashboard:read",
      "account:read",
      "account:write",
      "sync:trigger",
      "recommendation:read",
      "recommendation:recommend",
      "recommendation:request_approval",
      "recommendation:dry_run",
      "recommendation:execute",
      "recommendation:verify",
      "recommendation:rollback",
      "audit:read",
      "rbac:read",
      "k8s:read",
      "k8s:sync",
    ],
    deny: [
      "credentials:write",
      "focus:import",
      "recommendation:approve",
      "rbac:manage",
      "budget:write",
      "policy:write",
    ],
  },
  {
    slug: "architect",
    name: "Solutions Architect",
    description: "Multi-region workload topology, SKU compatibility policies, and dry-run verification",
    allow: [
      "dashboard:read",
      "account:read",
      "recommendation:read",
      "recommendation:recommend",
      "recommendation:request_approval",
      "recommendation:dry_run",
      "policy:write",
      "audit:read",
      "rbac:read",
      "k8s:read",
    ],
    deny: [
      "account:write",
      "credentials:write",
      "sync:trigger",
      "focus:import",
      "recommendation:approve",
      "recommendation:execute",
      "recommendation:verify",
      "recommendation:rollback",
      "rbac:manage",
      "budget:write",
      "k8s:sync",
    ],
  },
  {
    slug: "sustainability",
    name: "Sustainability Lead",
    description: "Scope 2 operational and embodied CO2e, regional grid mix, and SCI policy stewardship",
    allow: [
      "dashboard:read",
      "account:read",
      "recommendation:read",
      "recommendation:recommend",
      "recommendation:request_approval",
      "recommendation:verify",
      "policy:write",
      "audit:read",
      "rbac:read",
      "k8s:read",
    ],
    deny: [
      "account:write",
      "credentials:write",
      "sync:trigger",
      "focus:import",
      "recommendation:approve",
      "recommendation:dry_run",
      "recommendation:execute",
      "recommendation:rollback",
      "rbac:manage",
      "budget:write",
      "k8s:sync",
    ],
  },
  {
    slug: "viewer",
    name: "Read-Only Viewer",
    description: "High-level spend, savings, and carbon summary with strict read-only guardrails",
    allow: [
      "dashboard:read",
      "account:read",
      "recommendation:read",
      "rbac:read",
      "k8s:read",
    ],
    deny: [
      "account:write",
      "credentials:write",
      "sync:trigger",
      "focus:import",
      "recommendation:recommend",
      "recommendation:request_approval",
      "recommendation:approve",
      "recommendation:dry_run",
      "recommendation:execute",
      "recommendation:verify",
      "recommendation:rollback",
      "rbac:manage",
      "budget:write",
      "policy:write",
      "audit:read",
      "k8s:sync",
    ],
  },
];

export const DEFAULT_USER_SEEDS: Array<{
  roleSlug: RoleSeed["slug"];
  email: string;
  displayName: string;
}> = [
  { roleSlug: "admin", email: "admin@greencloud.local", displayName: "Alex Morgan (Workspace Admin)" },
  { roleSlug: "finops", email: "finops@greencloud.local", displayName: "Priya Nair (FinOps Engineer)" },
  { roleSlug: "devops", email: "devops@greencloud.local", displayName: "Marcus Vance (DevOps Engineer)" },
  { roleSlug: "architect", email: "architect@greencloud.local", displayName: "Elena Rostova (Solutions Architect)" },
  { roleSlug: "sustainability", email: "sustainability@greencloud.local", displayName: "Liam Chen (Sustainability Lead)" },
  { roleSlug: "viewer", email: "viewer@greencloud.local", displayName: "Jordan Taylor (Read-Only Viewer)" },
];

const BASELINE_WORKLOADS = [
  {
    name: "checkout-api",
    environment: "production",
    owner: "payments-platform",
    criticality: "critical",
    latencySloMs: 45,
    minAvailabilityPct: 99.99,
    requiredArchitecture: "x86_64",
    requiredRegion: "us-east-1",
    cpuHeadroomPct: 25,
    memoryHeadroomPct: 25,
  },
  {
    name: "analytics-batch",
    environment: "staging",
    owner: "data-engineering",
    criticality: "standard",
    latencySloMs: 500,
    minAvailabilityPct: 99.5,
    requiredArchitecture: null,
    requiredRegion: null,
    cpuHeadroomPct: 15,
    memoryHeadroomPct: 15,
  },
  {
    name: "ml-inference-gpu",
    environment: "production",
    owner: "applied-ai",
    criticality: "high",
    latencySloMs: 120,
    minAvailabilityPct: 99.9,
    requiredArchitecture: "x86_64",
    requiredRegion: "us-west-2",
    cpuHeadroomPct: 20,
    memoryHeadroomPct: 20,
  },
];

const SKU_VERSION = "2026-11-v1";
const SKU_EFFECTIVE_DATE = new Date("2026-11-01T00:00:00.000Z");

const BASELINE_SKUS: Array<{
  provider: string;
  serviceType: string;
  skuName: string;
  region: string;
  vcpu: number;
  memoryGb: number;
  architecture: string;
  availabilityPct: number;
  hourlyPriceUsd: number;
  monthlyPriceUsd: number;
  iops: number | null;
}> = [
  // AWS EC2
  { provider: "aws", serviceType: "ec2", skuName: "t3.small", region: "us-east-1", vcpu: 2, memoryGb: 2, architecture: "x86_64", availabilityPct: 99.95, hourlyPriceUsd: 0.0208, monthlyPriceUsd: 15.18, iops: 2000 },
  { provider: "aws", serviceType: "ec2", skuName: "t3.medium", region: "us-east-1", vcpu: 2, memoryGb: 4, architecture: "x86_64", availabilityPct: 99.95, hourlyPriceUsd: 0.0416, monthlyPriceUsd: 30.37, iops: 2500 },
  { provider: "aws", serviceType: "ec2", skuName: "m5.large", region: "us-east-1", vcpu: 2, memoryGb: 8, architecture: "x86_64", availabilityPct: 99.99, hourlyPriceUsd: 0.096, monthlyPriceUsd: 70.08, iops: 3500 },
  { provider: "aws", serviceType: "ec2", skuName: "m6i.large", region: "us-east-1", vcpu: 2, memoryGb: 8, architecture: "x86_64", availabilityPct: 99.99, hourlyPriceUsd: 0.096, monthlyPriceUsd: 70.08, iops: 4000 },
  { provider: "aws", serviceType: "ec2", skuName: "c6i.large", region: "us-east-1", vcpu: 2, memoryGb: 4, architecture: "x86_64", availabilityPct: 99.99, hourlyPriceUsd: 0.085, monthlyPriceUsd: 62.05, iops: 4000 },
  { provider: "aws", serviceType: "ec2", skuName: "c6i.2xlarge", region: "us-east-1", vcpu: 8, memoryGb: 16, architecture: "x86_64", availabilityPct: 99.99, hourlyPriceUsd: 0.34, monthlyPriceUsd: 248.2, iops: 8000 },
  { provider: "aws", serviceType: "ec2", skuName: "c7g.large", region: "us-east-1", vcpu: 2, memoryGb: 4, architecture: "arm64", availabilityPct: 99.99, hourlyPriceUsd: 0.0725, monthlyPriceUsd: 52.93, iops: 5000 },
  { provider: "aws", serviceType: "ec2", skuName: "r6i.2xlarge", region: "us-east-1", vcpu: 8, memoryGb: 64, architecture: "x86_64", availabilityPct: 99.99, hourlyPriceUsd: 0.504, monthlyPriceUsd: 367.92, iops: 8000 },
  // AWS EBS & RDS
  { provider: "aws", serviceType: "ebs", skuName: "gp2", region: "us-east-1", vcpu: 0, memoryGb: 0, architecture: "x86_64", availabilityPct: 99.9, hourlyPriceUsd: 0.000137, monthlyPriceUsd: 0.1, iops: 3000 },
  { provider: "aws", serviceType: "ebs", skuName: "gp3", region: "us-east-1", vcpu: 0, memoryGb: 0, architecture: "x86_64", availabilityPct: 99.9, hourlyPriceUsd: 0.00011, monthlyPriceUsd: 0.08, iops: 3000 },
  { provider: "aws", serviceType: "ebs", skuName: "io2", region: "us-east-1", vcpu: 0, memoryGb: 0, architecture: "x86_64", availabilityPct: 99.999, hourlyPriceUsd: 0.000171, monthlyPriceUsd: 0.125, iops: 64000 },
  { provider: "aws", serviceType: "rds", skuName: "db.t4g.medium", region: "us-east-1", vcpu: 2, memoryGb: 4, architecture: "arm64", availabilityPct: 99.95, hourlyPriceUsd: 0.065, monthlyPriceUsd: 47.45, iops: 3000 },
  { provider: "aws", serviceType: "rds", skuName: "db.m5.xlarge", region: "us-east-1", vcpu: 4, memoryGb: 16, architecture: "x86_64", availabilityPct: 99.95, hourlyPriceUsd: 0.342, monthlyPriceUsd: 249.66, iops: 6000 },
  // Azure
  { provider: "azure", serviceType: "azure_vm", skuName: "Standard_B2s", region: "swedencentral", vcpu: 2, memoryGb: 4, architecture: "x86_64", availabilityPct: 99.9, hourlyPriceUsd: 0.0416, monthlyPriceUsd: 30.37, iops: 1280 },
  { provider: "azure", serviceType: "azure_vm", skuName: "Standard_D2s_v5", region: "swedencentral", vcpu: 2, memoryGb: 8, architecture: "x86_64", availabilityPct: 99.95, hourlyPriceUsd: 0.096, monthlyPriceUsd: 70.08, iops: 3750 },
  { provider: "azure", serviceType: "azure_vm", skuName: "Standard_D4s_v5", region: "swedencentral", vcpu: 4, memoryGb: 16, architecture: "x86_64", availabilityPct: 99.95, hourlyPriceUsd: 0.192, monthlyPriceUsd: 140.16, iops: 6400 },
  { provider: "azure", serviceType: "managed_disk", skuName: "StandardSSD_LRS", region: "swedencentral", vcpu: 0, memoryGb: 0, architecture: "x86_64", availabilityPct: 99.9, hourlyPriceUsd: 0.000103, monthlyPriceUsd: 0.075, iops: 500 },
  { provider: "azure", serviceType: "managed_disk", skuName: "Premium_LRS", region: "swedencentral", vcpu: 0, memoryGb: 0, architecture: "x86_64", availabilityPct: 99.95, hourlyPriceUsd: 0.000185, monthlyPriceUsd: 0.135, iops: 5000 },
  { provider: "azure", serviceType: "azure_sql", skuName: "GP_Gen5_2", region: "swedencentral", vcpu: 2, memoryGb: 10.2, architecture: "x86_64", availabilityPct: 99.99, hourlyPriceUsd: 0.505, monthlyPriceUsd: 368.65, iops: 5000 },
  // GCP
  { provider: "gcp", serviceType: "gce_vm", skuName: "e2-medium", region: "us-central1", vcpu: 2, memoryGb: 4, architecture: "x86_64", availabilityPct: 99.95, hourlyPriceUsd: 0.0335, monthlyPriceUsd: 24.46, iops: 3000 },
  { provider: "gcp", serviceType: "gce_vm", skuName: "e2-standard-2", region: "us-central1", vcpu: 2, memoryGb: 8, architecture: "x86_64", availabilityPct: 99.95, hourlyPriceUsd: 0.067, monthlyPriceUsd: 48.91, iops: 3000 },
  { provider: "gcp", serviceType: "gce_vm", skuName: "n2-standard-2", region: "us-central1", vcpu: 2, memoryGb: 8, architecture: "x86_64", availabilityPct: 99.99, hourlyPriceUsd: 0.0971, monthlyPriceUsd: 70.88, iops: 6000 },
  { provider: "gcp", serviceType: "gce_vm", skuName: "n2-standard-4", region: "us-central1", vcpu: 4, memoryGb: 16, architecture: "x86_64", availabilityPct: 99.99, hourlyPriceUsd: 0.1942, monthlyPriceUsd: 141.77, iops: 10000 },
  { provider: "gcp", serviceType: "gce_vm", skuName: "t2a-standard-2", region: "us-central1", vcpu: 2, memoryGb: 8, architecture: "arm64", availabilityPct: 99.95, hourlyPriceUsd: 0.077, monthlyPriceUsd: 56.21, iops: 6000 },
  { provider: "gcp", serviceType: "persistent_disk", skuName: "pd-standard", region: "us-central1", vcpu: 0, memoryGb: 0, architecture: "x86_64", availabilityPct: 99.9, hourlyPriceUsd: 0.000055, monthlyPriceUsd: 0.04, iops: 750 },
  { provider: "gcp", serviceType: "persistent_disk", skuName: "pd-balanced", region: "us-central1", vcpu: 0, memoryGb: 0, architecture: "x86_64", availabilityPct: 99.95, hourlyPriceUsd: 0.000137, monthlyPriceUsd: 0.1, iops: 3000 },
  { provider: "gcp", serviceType: "persistent_disk", skuName: "pd-ssd", region: "us-central1", vcpu: 0, memoryGb: 0, architecture: "x86_64", availabilityPct: 99.95, hourlyPriceUsd: 0.000233, monthlyPriceUsd: 0.17, iops: 15000 },
  { provider: "gcp", serviceType: "cloud_sql", skuName: "db-custom-2-7680", region: "us-central1", vcpu: 2, memoryGb: 7.5, architecture: "x86_64", availabilityPct: 99.95, hourlyPriceUsd: 0.132, monthlyPriceUsd: 96.36, iops: 4000 },
  // Kubernetes profiles
  { provider: "kubernetes", serviceType: "k8s_pod", skuName: "pod-balanced-1c-2g", region: "cluster-default", vcpu: 1, memoryGb: 2, architecture: "x86_64", availabilityPct: 99.9, hourlyPriceUsd: 0.032, monthlyPriceUsd: 23.36, iops: null },
  { provider: "kubernetes", serviceType: "k8s_node", skuName: "node-pool-4c-16g", region: "cluster-default", vcpu: 4, memoryGb: 16, architecture: "x86_64", availabilityPct: 99.95, hourlyPriceUsd: 0.18, monthlyPriceUsd: 131.4, iops: null },
];

const seededTenantPromises = new Map<string, Promise<void>>();
let catalogSeededPromise: Promise<void> | null = null;

async function seedSystemCatalog(): Promise<void> {
  // 1. Upsert all granular permissions
  const permissionIdByKey = new Map<string, string>();
  for (const perm of PERMISSION_SEEDS) {
    const saved = await prisma.permission.upsert({
      where: { key: perm.key },
      update: { category: perm.category, description: perm.description },
      create: { key: perm.key, category: perm.category, description: perm.description },
    });
    permissionIdByKey.set(perm.key, saved.id);
  }

  // 2. Upsert all 6 system roles + RolePermission matrix
  for (const roleSeed of ROLE_SEEDS) {
    const role = await prisma.role.upsert({
      where: { slug: roleSeed.slug },
      update: {
        name: roleSeed.name,
        description: roleSeed.description,
        isSystem: true,
      },
      create: {
        slug: roleSeed.slug,
        name: roleSeed.name,
        description: roleSeed.description,
        isSystem: true,
      },
    });

    for (const permKey of roleSeed.allow) {
      const permissionId = permissionIdByKey.get(permKey);
      if (!permissionId) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: { effect: "allow" },
        create: { roleId: role.id, permissionId, effect: "allow" },
      });
    }

    for (const permKey of roleSeed.deny) {
      const permissionId = permissionIdByKey.get(permKey);
      if (!permissionId) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: { effect: "deny" },
        create: { roleId: role.id, permissionId, effect: "deny" },
      });
    }
  }

  // 3. Upsert baseline CompatibilitySku catalog
  for (const sku of BASELINE_SKUS) {
    await prisma.compatibilitySku.upsert({
      where: {
        provider_serviceType_skuName_region_sourceVersion: {
          provider: sku.provider,
          serviceType: sku.serviceType,
          skuName: sku.skuName,
          region: sku.region,
          sourceVersion: SKU_VERSION,
        },
      },
      update: {
        vcpu: sku.vcpu,
        memoryGb: sku.memoryGb,
        architecture: sku.architecture,
        availabilityPct: sku.availabilityPct,
        hourlyPriceUsd: sku.hourlyPriceUsd,
        monthlyPriceUsd: sku.monthlyPriceUsd,
        iops: sku.iops,
        effectiveDate: SKU_EFFECTIVE_DATE,
      },
      create: {
        provider: sku.provider,
        serviceType: sku.serviceType,
        skuName: sku.skuName,
        region: sku.region,
        vcpu: sku.vcpu,
        memoryGb: sku.memoryGb,
        architecture: sku.architecture,
        availabilityPct: sku.availabilityPct,
        hourlyPriceUsd: sku.hourlyPriceUsd,
        monthlyPriceUsd: sku.monthlyPriceUsd,
        iops: sku.iops,
        effectiveDate: SKU_EFFECTIVE_DATE,
        sourceVersion: SKU_VERSION,
      },
    });
  }
}

async function seedTenantEntities(tenantId: string): Promise<void> {
  const roles = await prisma.role.findMany();
  const roleBySlug = new Map(roles.map((r) => [r.slug, r]));

  // Upsert 6 default workspace users + initial org-wide RoleAssignments
  for (const userSeed of DEFAULT_USER_SEEDS) {
    const user = await prisma.user.upsert({
      where: { tenantId_email: { tenantId, email: userSeed.email } },
      update: { displayName: userSeed.displayName, status: "active" },
      create: {
        tenantId,
        email: userSeed.email,
        displayName: userSeed.displayName,
        status: "active",
      },
    });

    const role = roleBySlug.get(userSeed.roleSlug);
    if (role) {
      await prisma.roleAssignment.upsert({
        where: {
          tenantId_userId_roleId_scopeType_scopeId: {
            tenantId,
            userId: user.id,
            roleId: role.id,
            scopeType: "organization",
            scopeId: "*",
          },
        },
        update: { effect: "allow", assignedBy: "system_seed" },
        create: {
          tenantId,
          userId: user.id,
          roleId: role.id,
          scopeType: "organization",
          scopeId: "*",
          effect: "allow",
          assignedBy: "system_seed",
        },
      });
    }
  }

  // Upsert 3 baseline Workloads
  for (const w of BASELINE_WORKLOADS) {
    await prisma.workload.upsert({
      where: { tenantId_name: { tenantId, name: w.name } },
      update: {
        environment: w.environment,
        owner: w.owner,
        criticality: w.criticality,
        latencySloMs: w.latencySloMs,
        minAvailabilityPct: w.minAvailabilityPct,
        requiredArchitecture: w.requiredArchitecture,
        requiredRegion: w.requiredRegion,
        cpuHeadroomPct: w.cpuHeadroomPct,
        memoryHeadroomPct: w.memoryHeadroomPct,
      },
      create: {
        tenantId,
        name: w.name,
        environment: w.environment,
        owner: w.owner,
        criticality: w.criticality,
        latencySloMs: w.latencySloMs,
        minAvailabilityPct: w.minAvailabilityPct,
        requiredArchitecture: w.requiredArchitecture,
        requiredRegion: w.requiredRegion,
        cpuHeadroomPct: w.cpuHeadroomPct,
        memoryHeadroomPct: w.memoryHeadroomPct,
      },
    });
  }
}

/**
 * Idempotently seeds the 6 system roles, granular permissions, RolePermission matrix,
 * baseline CompatibilitySkus, 6 default workspace users + org-wide RoleAssignments, and 3 Workloads.
 */
export async function seedRbacForTenant(
  tenantId: string,
  options?: { force?: boolean }
): Promise<void> {
  if (!options?.force && seededTenantPromises.has(tenantId)) {
    return seededTenantPromises.get(tenantId)!;
  }

  const run = (async () => {
    if (options?.force || !catalogSeededPromise) {
      catalogSeededPromise = seedSystemCatalog();
    }
    await catalogSeededPromise;
    await seedTenantEntities(tenantId);
  })().catch((err) => {
    seededTenantPromises.delete(tenantId);
    catalogSeededPromise = null;
    throw err;
  });

  seededTenantPromises.set(tenantId, run);
  return run;
}

export const seedRbacAndCatalog = seedRbacForTenant;

export function resetSeedMemoization(tenantId?: string) {
  if (tenantId) {
    seededTenantPromises.delete(tenantId);
  } else {
    seededTenantPromises.clear();
    catalogSeededPromise = null;
  }
}

/**
 * Seeds a default tenant if one does not exist, and ensures RBAC/catalog entities exist for it.
 * In production mode, no mock telemetry is created; the user connects cloud accounts or imports FOCUS data.
 */
export async function seedDefaultTenant() {
  let tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    console.log("[Seed] Creating default tenant...");
    tenant = await prisma.tenant.create({
      data: {
        name: "GreenCloud Default Organization",
        plan: "enterprise",
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        actor: "system",
        action: "tenant_created",
        objectType: "tenant",
        objectId: tenant.id,
        metadata: JSON.stringify({
          message: "Default tenant created. Connect an AWS account via /onboarding to begin.",
        }),
      },
    });

    console.log(`[Seed] Tenant created: ${tenant.id}. Navigate to /onboarding to connect your AWS account.`);
  }

  await seedRbacForTenant(tenant.id);
  return tenant;
}
