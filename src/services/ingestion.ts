import { prisma } from "./db";
import { AwsCloudConnector } from "./awsConnector";
import { CarbonEngine } from "./carbonEngine";
import { RecommendationEngine } from "./recommendationEngine";

export interface SyncOptions {
  cloudAccountId: string;
}

export class IngestionService {
  /**
   * Executes full ingestion sync for a Cloud Account:
   * 1. Fetches EC2, EBS, Elastic IPs, and Cost Explorer summaries.
   * 2. Ingests resources & telemetry into DB.
   * 3. Computes Carbon Footprint emissions.
   * 4. Evaluates evidence-backed Recommendations.
   * 5. Updates sync freshness timestamp and audit log.
   */
  static async syncCloudAccount(options: SyncOptions) {
    const cloudAccount = await prisma.cloudAccount.findUnique({
      where: { id: options.cloudAccountId },
      include: { tenant: true }
    });

    if (!cloudAccount) {
      throw new Error(`Cloud account ${options.cloudAccountId} not found`);
    }

    const startTime = new Date();
    console.log(`[IngestionEngine] Starting sync for account: ${cloudAccount.name} (${cloudAccount.id})`);

    const connector = new AwsCloudConnector(cloudAccount.roleArn || undefined, `greencloud-${cloudAccount.tenantId}`);

    try {
      // Step 1: Fetch resources & cost summaries
      const ec2List = await connector.fetchEC2Instances();
      const ebsList = await connector.fetchEBSVolumes();
      const eipList = await connector.fetchElasticIPs();

      let ingestedCount = 0;

      // Step 2: Upsert EC2 instances
      for (const ec2 of ec2List) {
        const resourceId = `${cloudAccount.id}_${ec2.InstanceId}`;
        const avgCpu = ec2.CpuUtilizationSeries.length > 0
          ? ec2.CpuUtilizationSeries.reduce((a, b) => a + b, 0) / ec2.CpuUtilizationSeries.length
          : 5.0;

        const dbRes = await prisma.cloudResource.upsert({
          where: { id: resourceId },
          update: {
            lifecycleState: ec2.State,
            tags: JSON.stringify(ec2.Tags),
            telemetryMetrics: JSON.stringify({ cpuUtilizationSeries: ec2.CpuUtilizationSeries, instanceType: ec2.InstanceType }),
            lastSeenAt: startTime
          },
          create: {
            id: resourceId,
            cloudAccountId: cloudAccount.id,
            providerResourceId: ec2.InstanceId,
            resourceType: "ec2",
            region: ec2.Region,
            lifecycleState: ec2.State,
            tags: JSON.stringify(ec2.Tags),
            telemetryMetrics: JSON.stringify({ cpuUtilizationSeries: ec2.CpuUtilizationSeries, instanceType: ec2.InstanceType }),
            firstSeenAt: new Date(ec2.LaunchTime),
            lastSeenAt: startTime
          }
        });

        // Compute Carbon Footprint
        const carbonRes = CarbonEngine.calculateInstanceCarbon({
          instanceType: ec2.InstanceType,
          cpuUtilPercent: avgCpu,
          hours: 730
        });

        await prisma.carbonEmission.create({
          data: {
            resourceId: dbRes.id,
            energyKwh: carbonRes.energyKwh,
            operationalGco2e: carbonRes.operationalGco2e,
            embodiedGco2e: carbonRes.embodiedGco2e,
            method: carbonRes.method,
            confidence: carbonRes.confidence
          }
        });

        // Evaluate Recommendations
        const recCandidate = RecommendationEngine.evaluateResource({
          id: dbRes.id,
          providerResourceId: ec2.InstanceId,
          resourceType: "ec2",
          lifecycleState: ec2.State,
          tags: ec2.Tags,
          cpuUtilizationSeries: ec2.CpuUtilizationSeries,
          monthlyCost: ec2.MonthlyCost,
          instanceType: ec2.InstanceType
        });

        if (recCandidate) {
          await prisma.recommendation.create({
            data: {
              tenantId: cloudAccount.tenantId,
              resourceId: dbRes.id,
              category: recCandidate.category,
              title: recCandidate.title,
              status: "active",
              estimatedMonthlySavings: recCandidate.estimatedMonthlySavings,
              estimatedGco2eSavings: recCandidate.estimatedGco2eSavings,
              riskScore: recCandidate.riskScore,
              confidence: recCandidate.confidence,
              evidence: JSON.stringify(recCandidate.evidence)
            }
          });
        }

        ingestedCount++;
      }

      // Step 3: Upsert EBS volumes
      for (const ebs of ebsList) {
        const resourceId = `${cloudAccount.id}_${ebs.VolumeId}`;
        const dbRes = await prisma.cloudResource.upsert({
          where: { id: resourceId },
          update: {
            lifecycleState: ebs.State,
            tags: JSON.stringify(ebs.Tags),
            lastSeenAt: startTime
          },
          create: {
            id: resourceId,
            cloudAccountId: cloudAccount.id,
            providerResourceId: ebs.VolumeId,
            resourceType: "ebs",
            region: ebs.Region,
            lifecycleState: ebs.State,
            tags: JSON.stringify(ebs.Tags),
            firstSeenAt: new Date(ebs.CreateTime),
            lastSeenAt: startTime
          }
        });

        const recCandidate = RecommendationEngine.evaluateResource({
          id: dbRes.id,
          providerResourceId: ebs.VolumeId,
          resourceType: "ebs",
          lifecycleState: ebs.State,
          tags: ebs.Tags,
          monthlyCost: ebs.MonthlyCost,
          volumeSizeGb: ebs.Size,
          isAttached: !!ebs.AttachmentInstanceId
        });

        if (recCandidate) {
          await prisma.recommendation.create({
            data: {
              tenantId: cloudAccount.tenantId,
              resourceId: dbRes.id,
              category: recCandidate.category,
              title: recCandidate.title,
              status: "active",
              estimatedMonthlySavings: recCandidate.estimatedMonthlySavings,
              estimatedGco2eSavings: recCandidate.estimatedGco2eSavings,
              riskScore: recCandidate.riskScore,
              confidence: recCandidate.confidence,
              evidence: JSON.stringify(recCandidate.evidence)
            }
          });
        }

        ingestedCount++;
      }

      // Step 4: Upsert Elastic IPs
      for (const eip of eipList) {
        const resourceId = `${cloudAccount.id}_${eip.AllocationId}`;
        const dbRes = await prisma.cloudResource.upsert({
          where: { id: resourceId },
          update: {
            lifecycleState: eip.AssociationId ? "associated" : "unassociated",
            tags: JSON.stringify(eip.Tags),
            lastSeenAt: startTime
          },
          create: {
            id: resourceId,
            cloudAccountId: cloudAccount.id,
            providerResourceId: eip.AllocationId,
            resourceType: "eip",
            region: eip.Region,
            lifecycleState: eip.AssociationId ? "associated" : "unassociated",
            tags: JSON.stringify(eip.Tags),
            firstSeenAt: startTime,
            lastSeenAt: startTime
          }
        });

        const recCandidate = RecommendationEngine.evaluateResource({
          id: dbRes.id,
          providerResourceId: eip.PublicIp,
          resourceType: "eip",
          lifecycleState: eip.AssociationId ? "associated" : "unassociated",
          tags: eip.Tags,
          monthlyCost: eip.MonthlyCost,
          isAttached: !!eip.AssociationId
        });

        if (recCandidate) {
          await prisma.recommendation.create({
            data: {
              tenantId: cloudAccount.tenantId,
              resourceId: dbRes.id,
              category: recCandidate.category,
              title: recCandidate.title,
              status: "active",
              estimatedMonthlySavings: recCandidate.estimatedMonthlySavings,
              estimatedGco2eSavings: recCandidate.estimatedGco2eSavings,
              riskScore: recCandidate.riskScore,
              confidence: recCandidate.confidence,
              evidence: JSON.stringify(recCandidate.evidence)
            }
          });
        }

        ingestedCount++;
      }

      // Step 5: Update Cloud Account sync freshness
      await prisma.cloudAccount.update({
        where: { id: cloudAccount.id },
        data: {
          status: "active",
          syncFreshness: startTime,
          syncError: null
        }
      });

      // Step 6: Write Audit Log
      await prisma.auditLog.create({
        data: {
          tenantId: cloudAccount.tenantId,
          actor: "IngestionEngineJob",
          action: "sync_completed",
          objectType: "CloudAccount",
          objectId: cloudAccount.id,
          metadata: JSON.stringify({
            ingestedResourcesCount: ingestedCount,
            syncDurationMs: Date.now() - startTime.getTime()
          })
        }
      });

      console.log(`[IngestionEngine] Completed sync for account ${cloudAccount.id}. Ingested ${ingestedCount} resources.`);
      return { success: true, ingestedCount };
    } catch (err: any) {
      console.error(`[IngestionEngine] Error syncing account ${cloudAccount.id}:`, err);
      
      await prisma.cloudAccount.update({
        where: { id: cloudAccount.id },
        data: {
          status: "sync_failed",
          syncError: err.message || String(err)
        }
      });

      await prisma.auditLog.create({
        data: {
          tenantId: cloudAccount.tenantId,
          actor: "IngestionEngineJob",
          action: "sync_failed",
          objectType: "CloudAccount",
          objectId: cloudAccount.id,
          metadata: JSON.stringify({ error: err.message || String(err) })
        }
      });

      throw err;
    }
  }
}
