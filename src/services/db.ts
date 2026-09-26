import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import { encryptCredential, decryptCredential } from './encryption'

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

function resolveDatabaseUrl(): string {
  // 1. If explicit remote database URL is configured (Postgres, Neon, Supabase, Turso), use it
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('file:')) {
    return process.env.DATABASE_URL;
  }

  // 2. Vercel Serverless / AWS Lambda environment detection:
  // Root /var/task is read-only. SQLite requires a writable directory (/tmp) to create locks & journals.
  const isServerless = Boolean(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT
  );

  if (isServerless) {
    const tmpDbPath = '/tmp/dev.db';

    if (!fs.existsSync(tmpDbPath)) {
      const candidates = [
        path.join(process.cwd(), 'prisma', 'dev.db'),
        path.join('/var/task', 'prisma', 'dev.db'),
        path.resolve(process.cwd(), 'prisma/dev.db'),
        path.join(__dirname, '..', '..', 'prisma', 'dev.db'),
        path.join(__dirname, '..', 'prisma', 'dev.db'),
      ];

      let copied = false;
      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          try {
            fs.copyFileSync(candidate, tmpDbPath);
            console.log(`[GreenCloud DB] Initialized serverless SQLite DB from ${candidate} to ${tmpDbPath}`);
            copied = true;
            break;
          } catch (err) {
            console.error(`[GreenCloud DB] Error copying SQLite from ${candidate}:`, err);
          }
        }
      }

      if (!copied) {
        console.warn('[GreenCloud DB] No candidate dev.db found to copy into /tmp. Ensuring empty DB exists at:', tmpDbPath);
      }
    }

    return `file:${tmpDbPath}`;
  }

  // 3. Local Development: Use absolute path to ensure consistency regardless of CWD
  const localDb = path.resolve(process.cwd(), 'prisma', 'dev.db');
  if (fs.existsSync(localDb)) {
    return `file:${localDb}`;
  }

  return process.env.DATABASE_URL || 'file:./dev.db';
}

const activeDbUrl = resolveDatabaseUrl();

export const prisma =
  global.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: activeDbUrl,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

/**
 * Tenant Isolation Query Helper
 * Ensures all DB operations are scoped to the active tenant.
 */
export class TenantIsolatedDb {
  private tenantId: string

  constructor(tenantId: string) {
    if (!tenantId) {
      throw new Error('Tenant ID is required for database operations.')
    }
    this.tenantId = tenantId
  }

  getTenantId() {
    return this.tenantId;
  }

  async getAccount(accountId: string) {
    return prisma.cloudAccount.findFirst({
      where: { id: accountId, tenantId: this.tenantId }
    })
  }

  async listAccounts() {
    return prisma.cloudAccount.findMany({
      where: { tenantId: this.tenantId }
    })
  }

  sanitizeAccount(account: any) {
    if (!account) return null;
    const { encryptedAccessKey, encryptedSecretKey, ...rest } = account;
    let maskedAccessKey: string | null = null;
    if (encryptedAccessKey) {
      const decrypted = decryptCredential(encryptedAccessKey);
      if (decrypted && decrypted.length >= 8) {
        maskedAccessKey = `${decrypted.slice(0, 4)}••••${decrypted.slice(-4)}`;
      } else if (decrypted) {
        maskedAccessKey = "AKIA••••••••";
      }
    }
    return {
      ...rest,
      hasEncryptedCredentials: Boolean(encryptedAccessKey && encryptedSecretKey),
      maskedAccessKey,
    };
  }

  async listSanitizedAccounts() {
    const accounts = await this.listAccounts();
    return accounts.map((a) => this.sanitizeAccount(a));
  }

  async createAccount(data: {
    provider: string;
    externalAccountId: string;
    name: string;
    roleArn?: string;
    externalId?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
  }) {
    const encryptedAccessKey = data.accessKeyId ? encryptCredential(data.accessKeyId) : undefined;
    const encryptedSecretKey = data.secretAccessKey ? encryptCredential(data.secretAccessKey) : undefined;

    // Check if account with same externalAccountId already exists for this tenant
    const existing = await prisma.cloudAccount.findFirst({
      where: {
        tenantId: this.tenantId,
        externalAccountId: data.externalAccountId,
      }
    });

    if (existing) {
      return prisma.cloudAccount.update({
        where: { id: existing.id },
        data: {
          name: data.name,
          roleArn: data.roleArn,
          externalId: data.externalId,
          ...(encryptedAccessKey ? { encryptedAccessKey } : {}),
          ...(encryptedSecretKey ? { encryptedSecretKey } : {}),
        }
      });
    }

    return prisma.cloudAccount.create({
      data: {
        tenantId: this.tenantId,
        provider: data.provider,
        externalAccountId: data.externalAccountId,
        name: data.name,
        roleArn: data.roleArn,
        externalId: data.externalId,
        encryptedAccessKey,
        encryptedSecretKey,
        status: 'pending_validation'
      }
    });
  }

  async updateAccountCredentials(accountId: string, accessKeyId: string, secretAccessKey: string) {
    const account = await this.getAccount(accountId);
    if (!account) throw new Error('Cloud account not found or unauthorized');

    return prisma.cloudAccount.update({
      where: { id: accountId },
      data: {
        encryptedAccessKey: encryptCredential(accessKeyId),
        encryptedSecretKey: encryptCredential(secretAccessKey),
        status: 'active',
      }
    });
  }

  async updateAccountStatus(accountId: string, status: string, error?: string) {
    // Verify ownership
    const account = await this.getAccount(accountId)
    if (!account) throw new Error('Cloud account not found or unauthorized')

    return prisma.cloudAccount.update({
      where: { id: accountId },
      data: {
        status,
        syncFreshness: status === 'active' ? new Date() : undefined,
        syncError: error || null
      }
    })
  }

  async deleteAccount(accountId: string) {
    const account = await this.getAccount(accountId)
    if (!account) throw new Error('Cloud account not found or unauthorized')

    // Find all resources belonging to this account
    const resources = await prisma.cloudResource.findMany({
      where: { cloudAccountId: accountId }
    })

    // Clean up dependent records in transaction
    await prisma.$transaction([
      ...resources.map((r) =>
        prisma.approval.deleteMany({
          where: { recommendation: { resourceId: r.id } }
        })
      ),
      ...resources.map((r) =>
        prisma.recommendation.deleteMany({ where: { resourceId: r.id } })
      ),
      ...resources.map((r) =>
        prisma.carbonEmission.deleteMany({ where: { resourceId: r.id } })
      ),
      ...resources.map((r) =>
        prisma.costLineItem.deleteMany({ where: { resourceId: r.id } })
      ),
      prisma.cloudResource.deleteMany({ where: { cloudAccountId: accountId } }),
      prisma.costLineItem.deleteMany({ where: { cloudAccountId: accountId } }),
      prisma.cloudAccount.delete({ where: { id: accountId } }),
      prisma.auditLog.create({
        data: {
          tenantId: this.tenantId,
          actor: 'user',
          action: 'account_disconnected',
          objectType: 'cloud_account',
          objectId: accountId,
          metadata: JSON.stringify({ name: account.name, provider: account.provider, externalAccountId: account.externalAccountId })
        }
      })
    ])

    return { success: true }
  }

  async listResources(filters: { provider?: string; region?: string; resourceType?: string } = {}) {
    return prisma.cloudResource.findMany({
      where: {
        cloudAccount: {
          tenantId: this.tenantId,
          provider: filters.provider
        },
        resourceType: filters.resourceType,
        region: filters.region
      },
      include: {
        carbonEmissions: {
          orderBy: { ts: 'desc' },
          take: 1
        }
      }
    })
  }

  async listRecommendations(category?: string) {
    return prisma.recommendation.findMany({
      where: {
        tenantId: this.tenantId,
        category: category
      },
      include: {
        resource: true
      }
    })
  }

  async getRecommendation(id: string) {
    return prisma.recommendation.findFirst({
      where: { id, tenantId: this.tenantId },
      include: { resource: true, approvals: true }
    })
  }

  async approveRecommendation(id: string, approver: string, comment?: string) {
    const recommendation = await this.getRecommendation(id)
    if (!recommendation) throw new Error('Recommendation not found or unauthorized')

    return prisma.$transaction([
      prisma.recommendation.update({
        where: { id },
        data: { status: 'approved' }
      }),
      prisma.approval.create({
        data: {
          recommendationId: id,
          approver,
          decision: 'approved',
          comment
        }
      }),
      prisma.auditLog.create({
        data: {
          tenantId: this.tenantId,
          actor: approver,
          action: 'recommendation_approved',
          objectType: 'recommendation',
          objectId: id,
          metadata: JSON.stringify({ title: recommendation.title, savings: recommendation.estimatedMonthlySavings })
        }
      })
    ])
  }

  async listAuditLogs() {
    return prisma.auditLog.findMany({
      where: { tenantId: this.tenantId },
      orderBy: { ts: 'desc' }
    })
  }

  async logAction(actor: string, action: string, objectType: string, objectId: string, metadata?: Record<string, any>) {
    return prisma.auditLog.create({
      data: {
        tenantId: this.tenantId,
        actor,
        action,
        objectType,
        objectId,
        metadata: metadata ? JSON.stringify(metadata) : null
      }
    })
  }
}
