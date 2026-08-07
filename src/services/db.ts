import { PrismaClient } from '@prisma/client'

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

export const prisma = global.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
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

  async createAccount(data: { provider: string; externalAccountId: string; name: string; roleArn?: string }) {
    return prisma.cloudAccount.create({
      data: {
        tenantId: this.tenantId,
        provider: data.provider,
        externalAccountId: data.externalAccountId,
        name: data.name,
        roleArn: data.roleArn,
        status: 'pending_validation'
      }
    })
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
