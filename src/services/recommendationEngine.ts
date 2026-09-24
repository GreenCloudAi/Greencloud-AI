import { prisma } from "./db";
import { GreenCloudConfig } from "./config";
import { Logger } from "./logger";

/**
 * Telemetry metrics shape stored in CloudResource.telemetryMetrics JSON field.
 */
interface TelemetryMetrics {
  cpuDailyAverages: number[];
  peakCpu: number;
  lookbackDays: number;
  collectedAt: string;
}

export class RecommendationEngine {
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  /**
   * Generates and writes optimization recommendations for all cloud accounts
   * under this tenant. All decisions are data-driven from real AWS telemetry
   * — no hardcoded instance IDs or mock values.
   */
  async generateRecommendations(): Promise<number> {
    Logger.info("REC", "REC_SWEEP_START", `Evaluating FinOps & GreenOps rules for tenant: ${this.tenantId}`);
    const accounts = await prisma.cloudAccount.findMany({
      where: { tenantId: this.tenantId },
    });

    let recommendationCount = 0;

    for (const account of accounts) {
      // Fetch all resources with their latest carbon emissions
      const resources = await prisma.cloudResource.findMany({
        where: { cloudAccountId: account.id },
        include: {
          carbonEmissions: {
            orderBy: { ts: "desc" },
            take: 1,
          },
        },
      });

      for (const res of resources) {
        const latestCarbon = res.carbonEmissions[0];
        const dailyOperationalCarbon = latestCarbon?.operationalGco2e || 0;
        const dailyEmbodiedCarbon = latestCarbon?.embodiedGco2e || 0;
        const monthlyCarbonEmissions =
          (dailyOperationalCarbon + dailyEmbodiedCarbon) * 30;

        const tags = JSON.parse(res.tags || "[]") as {
          Key: string;
          Value: string;
        }[];
        const nameTag =
          tags.find((t) => t.Key === "Name")?.Value ||
          res.providerResourceId;

        // ─── Recommendation 1: Unattached EBS Volumes ────────────────────────
        if (res.resourceType === "ebs") {
          if (res.lifecycleState === "available") {
            const sizeGb = res.sizeGb || 0;
            const monthlySavings = res.monthlyCost || sizeGb * 0.08;

            if (monthlySavings > 0) {
              const title = `Delete Unattached EBS Volume: ${nameTag}`;
              const evidence = {
                calculation: `Size: ${sizeGb} GB, Monthly cost: $${monthlySavings.toFixed(2)}/month. Volume state is "available" (unattached).`,
                reason: `EBS volume "${res.providerResourceId}" is in state "available", meaning it is not attached to any EC2 instance. It is accumulating storage charges with no compute benefit.`,
                carbonImpact: `Eliminating this volume removes ${(monthlyCarbonEmissions / 1000).toFixed(3)} kg CO2e/month of operational + embodied carbon emissions.`,
              };

              await prisma.recommendation.upsert({
                where: { id: `rec_ebs_${res.id}` },
                create: {
                  id: `rec_ebs_${res.id}`,
                  tenantId: this.tenantId,
                  resourceId: res.id,
                  category: "idle_cleanup",
                  title,
                  status: "active",
                  estimatedMonthlySavings: monthlySavings,
                  estimatedGco2eSavings: monthlyCarbonEmissions,
                  riskScore: 0.1,
                  confidence: 0.95,
                  evidence: JSON.stringify(evidence),
                },
                update: {
                  status: "active",
                  estimatedMonthlySavings: monthlySavings,
                  estimatedGco2eSavings: monthlyCarbonEmissions,
                  evidence: JSON.stringify(evidence),
                },
              });
              recommendationCount++;
            }
          } else {
            await prisma.recommendation.deleteMany({
              where: { id: `rec_ebs_${res.id}` },
            });
          }
        }

        // ─── Recommendation 2: Unassociated Elastic IPs ──────────────────────
        if (res.resourceType === "eip") {
          if (res.lifecycleState === "unassociated") {
            const monthlySavings = res.monthlyCost || 3.6;
            const title = `Release Unassociated Elastic IP: ${res.providerResourceId}`;
            const evidence = {
              calculation: `Rate: $0.005/hr idle charge × 730 hours/month = $${monthlySavings.toFixed(2)}/month.`,
              reason: `Elastic IP "${res.providerResourceId}" is allocated but not associated with any running EC2 instance. AWS charges for idle public IPv4 addresses.`,
              carbonImpact: `Negligible direct carbon impact, but releasing unused network allocations reduces infrastructure footprint.`,
            };

            await prisma.recommendation.upsert({
              where: { id: `rec_eip_${res.id}` },
              create: {
                id: `rec_eip_${res.id}`,
                tenantId: this.tenantId,
                resourceId: res.id,
                category: "idle_cleanup",
                title,
                status: "active",
                estimatedMonthlySavings: monthlySavings,
                estimatedGco2eSavings: 0,
                riskScore: 0.05,
                confidence: 1.0,
                evidence: JSON.stringify(evidence),
              },
              update: {
                status: "active",
                estimatedMonthlySavings: monthlySavings,
                estimatedGco2eSavings: 0,
                evidence: JSON.stringify(evidence),
              },
            });
            recommendationCount++;
          } else {
            await prisma.recommendation.deleteMany({
              where: { id: `rec_eip_${res.id}` },
            });
          }
        }

        // ─── Recommendation 3 & 4: EC2 Instance Optimizations ─────────────────
        if (res.resourceType === "ec2") {
          if (res.lifecycleState === "stopped") {
            // Instance is STOPPED:
            // 1. Purge obsolete "Stop Idle EC2" and "Rightsize" recommendations
            await prisma.recommendation.deleteMany({
              where: {
                id: { in: [`rec_ec2_idle_${res.id}`, `rec_ec2_rightsize_${res.id}`] },
              },
            });

            // 2. Recommend reviewing stopped instance to avoid unneeded EBS storage charges
            const title = `Review Stopped EC2 Instance: ${nameTag}`;
            const evidence = {
              calculation: `Instance "${res.providerResourceId}" (${res.instanceType || "unknown"}) is stopped. While compute costs are $0, any attached EBS volumes continue to accrue storage charges.`,
              reason: `Stopped instances do not incur compute charges, but their attached EBS volumes and any Elastic IPs remain billable. Consider creating an AMI and terminating if no longer needed.`,
              carbonImpact: `Minimal operational carbon while stopped, but embodied carbon from reserved hardware capacity remains allocated.`,
            };

            await prisma.recommendation.upsert({
              where: { id: `rec_ec2_stopped_${res.id}` },
              create: {
                id: `rec_ec2_stopped_${res.id}`,
                tenantId: this.tenantId,
                resourceId: res.id,
                category: "idle_cleanup",
                title,
                status: "active",
                estimatedMonthlySavings: 0,
                estimatedGco2eSavings: 0,
                riskScore: 0.15,
                confidence: 0.8,
                evidence: JSON.stringify(evidence),
              },
              update: {
                status: "active",
                evidence: JSON.stringify(evidence),
              },
            });
            recommendationCount++;
          } else if (res.lifecycleState === "running") {
            // Instance is RUNNING:
            // 1. Purge "Review Stopped EC2" recommendation
            await prisma.recommendation.deleteMany({
              where: { id: `rec_ec2_stopped_${res.id}` },
            });

            // 2. Check CloudWatch telemetry for idle or rightsizing
            if (res.telemetryMetrics) {
              let telemetry: TelemetryMetrics;
              try {
                telemetry = JSON.parse(res.telemetryMetrics);
              } catch {
                continue;
              }

              const cpuSeries = telemetry.cpuDailyAverages || [];
              if (cpuSeries.length > 0) {
                const avgCpu =
                  cpuSeries.reduce((a, b) => a + b, 0) / cpuSeries.length;
                const peakCpu = telemetry.peakCpu || Math.max(...cpuSeries);
                const idleThreshold = GreenCloudConfig.idleCpuThreshold;
                const rightsizingThreshold =
                  GreenCloudConfig.rightsizingPeakCpuThreshold;

                // Idle compute detection:
                if (avgCpu < idleThreshold) {
                  const monthlySavings = res.monthlyCost || 0;
                  if (monthlySavings > 0) {
                    const title = `Stop Idle EC2 Instance: ${nameTag} (${res.instanceType || "unknown"})`;
                    const evidence = {
                      calculation: `Instance Type: ${res.instanceType || "unknown"}, Monthly cost: $${monthlySavings.toFixed(2)}/month. Average CPU over ${telemetry.lookbackDays} days: ${avgCpu.toFixed(1)}%, Peak: ${peakCpu.toFixed(1)}%.`,
                      reason: `Instance "${res.providerResourceId}" average CPU utilization is ${avgCpu.toFixed(1)}%, which is below the idle threshold of ${idleThreshold}%. The instance appears to be underutilized or idle.`,
                      carbonImpact: `Stopping saves ${(monthlyCarbonEmissions / 1000).toFixed(3)} kg CO2e/month (${dailyOperationalCarbon.toFixed(1)}g operational + ${dailyEmbodiedCarbon.toFixed(1)}g embodied carbon daily).`,
                    };

                    await prisma.recommendation.upsert({
                      where: { id: `rec_ec2_idle_${res.id}` },
                      create: {
                        id: `rec_ec2_idle_${res.id}`,
                        tenantId: this.tenantId,
                        resourceId: res.id,
                        category: "idle_cleanup",
                        title,
                        status: "active",
                        estimatedMonthlySavings: monthlySavings,
                        estimatedGco2eSavings: monthlyCarbonEmissions,
                        riskScore: 0.35,
                        confidence: cpuSeries.length >= 7 ? 0.9 : 0.7,
                        evidence: JSON.stringify(evidence),
                      },
                      update: {
                        status: "active",
                        estimatedMonthlySavings: monthlySavings,
                        estimatedGco2eSavings: monthlyCarbonEmissions,
                        confidence: cpuSeries.length >= 7 ? 0.9 : 0.7,
                        evidence: JSON.stringify(evidence),
                      },
                    });
                    recommendationCount++;
                  }
                } else {
                  await prisma.recommendation.deleteMany({
                    where: { id: `rec_ec2_idle_${res.id}` },
                  });
                }

                // Rightsizing detection:
                if (
                  avgCpu >= idleThreshold &&
                  peakCpu < rightsizingThreshold &&
                  peakCpu > 0
                ) {
                  const monthlySavings = (res.monthlyCost || 0) * 0.4;
                  if (monthlySavings > 0) {
                    const title = `Rightsize EC2 Instance: ${nameTag} (${res.instanceType || "unknown"})`;
                    const evidence = {
                      calculation: `Current type: ${res.instanceType || "unknown"}, Monthly cost: $${(res.monthlyCost || 0).toFixed(2)}/month. Peak CPU: ${peakCpu.toFixed(1)}% (below ${rightsizingThreshold}% threshold). Estimated ~40% savings from downsizing: $${monthlySavings.toFixed(2)}/month.`,
                      reason: `Instance "${res.providerResourceId}" peak CPU utilization over ${telemetry.lookbackDays} days is only ${peakCpu.toFixed(1)}%, suggesting it can safely run on a smaller instance type.`,
                      carbonImpact: `Rightsizing reduces energy consumption proportionally, saving approximately ${((monthlyCarbonEmissions * 0.4) / 1000).toFixed(3)} kg CO2e/month.`,
                    };

                    await prisma.recommendation.upsert({
                      where: { id: `rec_ec2_rightsize_${res.id}` },
                      create: {
                        id: `rec_ec2_rightsize_${res.id}`,
                        tenantId: this.tenantId,
                        resourceId: res.id,
                        category: "rightsizing",
                        title,
                        status: "active",
                        estimatedMonthlySavings: parseFloat(
                          monthlySavings.toFixed(2)
                        ),
                        estimatedGco2eSavings: parseFloat(
                          (monthlyCarbonEmissions * 0.4).toFixed(2)
                        ),
                        riskScore: 0.25,
                        confidence: cpuSeries.length >= 7 ? 0.85 : 0.65,
                        evidence: JSON.stringify(evidence),
                      },
                      update: {
                        status: "active",
                        estimatedMonthlySavings: parseFloat(
                          monthlySavings.toFixed(2)
                        ),
                        estimatedGco2eSavings: parseFloat(
                          (monthlyCarbonEmissions * 0.4).toFixed(2)
                        ),
                        confidence: cpuSeries.length >= 7 ? 0.85 : 0.65,
                        evidence: JSON.stringify(evidence),
                      },
                    });
                    recommendationCount++;
                  }
                } else {
                  await prisma.recommendation.deleteMany({
                    where: { id: `rec_ec2_rightsize_${res.id}` },
                  });
                }
              }
            }
          } else {
            // Other states (terminated, etc.): purge all recommendations
            await prisma.recommendation.deleteMany({
              where: { resourceId: res.id },
            });
          }
        }
      }
    }

    Logger.success(
      "REC",
      "REC_SWEEP_COMPLETE",
      `Generated ${recommendationCount} evidence-backed optimization recommendations.`,
      { recommendationCount }
    );
    return recommendationCount;
  }
}
