import { prisma } from "./db";
import { GreenCloudConfig } from "./config";
import { Logger } from "./logger";

interface TelemetryMetrics {
  cpuDailyAverages: number[];
  peakCpu: number;
  lookbackDays: number;
  collectedAt: string;
}

function buildTerraformBlock(
  kind: "ebs_delete" | "eip_release" | "ec2_stop" | "ec2_rightsize" | "stopped_review",
  provider: string,
  resourceId: string,
  region: string,
  instanceType?: string | null
): string {
  const safeName = resourceId.replace(/[^a-zA-Z0-9_]/g, "_");
  if (provider === "gcp") {
    if (kind === "ebs_delete") {
      return `# GCP Persistent Disk unattached cleanup (${region})\n# Import existing disk then remove resource from state/manifest:\n# terraform import google_compute_disk.${safeName} projects/<project>/zones/${region}-a/disks/${resourceId}`;
    }
    return `resource "google_compute_instance" "${safeName}" {\n  name         = "${resourceId}"\n  zone         = "${region}-a"\n  machine_type = "${kind === "ec2_rightsize" ? "e2-medium" : instanceType || "e2-standard-2"}" # Downsized for <40% peak CPU\n}`;
  }
  if (provider === "azure") {
    if (kind === "ebs_delete") {
      return `# Azure Unattached Managed Disk (${region})\n# Remove unused resource from azurerm Terraform module:\n# az disk show --name "${resourceId}"`;
    }
    return `resource "azurerm_linux_virtual_machine" "${safeName}" {\n  name     = "${resourceId}"\n  location = "${region}"\n  size     = "${kind === "ec2_rightsize" ? "Standard_B2s" : instanceType || "Standard_D2s_v5"}"\n}`;
  }

  switch (kind) {
    case "ebs_delete":
      return `# Remove unattached AWS EBS volume (${resourceId} in ${region})\n# Snapshot first, then delete the unused aws_ebs_volume block:\n# aws ec2 create-snapshot --volume-id ${resourceId} --region ${region}\n- resource "aws_ebs_volume" "${safeName}" {\n-   availability_zone = "${region}a"\n-   tags = { Name = "${resourceId}" }\n- }`;
    case "eip_release":
      return `# Release unassociated AWS Elastic IP (${resourceId} in ${region})\n- resource "aws_eip" "${safeName}" {\n-   domain = "vpc"\n- }`;
    case "ec2_stop":
      return `resource "aws_ec2_instance_state" "${safeName}_schedule" {\n  instance_id = "${resourceId}"\n  state       = "stopped" # Average CPU below ${GreenCloudConfig.idleCpuThreshold}% over lookback window\n}`;
    case "ec2_rightsize": {
      const nextType =
        instanceType && instanceType.includes("xlarge")
          ? instanceType.replace("xlarge", "large")
          : instanceType && instanceType.includes("large")
          ? instanceType.replace("large", "medium")
          : "t3.small";
      return `resource "aws_instance" "${safeName}" {\n  ami           = data.aws_ami.ubuntu.id\n- instance_type = "${instanceType || "m5.large"}"\n+ instance_type = "${nextType}" # Peak CPU below ${GreenCloudConfig.rightsizingPeakCpuThreshold}%\n}`;
    }
    default:
      return `# Stopped instance audit (${resourceId} in ${region})\n# Verify whether attached root/data EBS volumes can be snapshotted and terminated.`;
  }
}

export class RecommendationEngine {
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  async generateRecommendations(): Promise<number> {
    Logger.info("REC", "REC_SWEEP_START", `Evaluating FinOps & GreenOps rules for tenant: ${this.tenantId}`);
    const accounts = await prisma.cloudAccount.findMany({
      where: { tenantId: this.tenantId },
    });

    let recommendationCount = 0;

    for (const account of accounts) {
      const resources = await prisma.cloudResource.findMany({
        where: { cloudAccountId: account.id },
        include: {
          carbonEmissions: {
            orderBy: { ts: "desc" },
            take: 1,
          },
        },
      });

      const provider = account.provider || "aws";

      for (const res of resources) {
        const latestCarbon = res.carbonEmissions[0];
        const dailyOperationalCarbon = latestCarbon?.operationalGco2e || 0;
        const dailyEmbodiedCarbon = latestCarbon?.embodiedGco2e || 0;
        const monthlyCarbonEmissions = (dailyOperationalCarbon + dailyEmbodiedCarbon) * 30;

        let tags: Array<{ Key: string; Value: string }> = [];
        try {
          tags = JSON.parse(res.tags || "[]");
        } catch {
          tags = [];
        }
        const nameTag =
          tags.find((t) => t.Key === "Name" || t.Key === "name")?.Value ||
          res.providerResourceId;

        // 1. Storage cleanup (AWS EBS "available", GCP/Azure unattached disks)
        if (res.resourceType === "ebs" || res.resourceType === "disk") {
          if (res.lifecycleState === "available" || res.lifecycleState === "unattached") {
            const sizeGb = res.sizeGb || 0;
            const monthlySavings = res.monthlyCost || sizeGb * 0.08;
            if (monthlySavings > 0) {
              const title = `Remove Unattached Volume: ${nameTag}`;
              const description = `Storage volume ${res.providerResourceId} (${sizeGb} GB in ${res.region}) has been unattached while accruing $${monthlySavings.toFixed(2)}/mo.`;
              const terraformHcl = buildTerraformBlock("ebs_delete", provider, res.providerResourceId, res.region);
              const evidence = {
                calculation: `Size: ${sizeGb} GB, Monthly cost: $${monthlySavings.toFixed(2)}/month. Lifecycle: "${res.lifecycleState}".`,
                reason: `Volume "${res.providerResourceId}" is unattached and incurs continuous block storage billing with zero active compute consumer.`,
                carbonImpact: `Removing saves ${(monthlyCarbonEmissions / 1000).toFixed(3)} kg CO2e/month.`,
              };

              await prisma.recommendation.upsert({
                where: { id: `rec_ebs_${res.id}` },
                create: {
                  id: `rec_ebs_${res.id}`,
                  tenantId: this.tenantId,
                  resourceId: res.id,
                  category: "idle_cleanup",
                  title,
                  description,
                  terraformHcl,
                  status: "active",
                  estimatedMonthlySavings: monthlySavings,
                  estimatedGco2eSavings: monthlyCarbonEmissions,
                  riskScore: 1,
                  confidence: 0.95,
                  evidence: JSON.stringify(evidence),
                },
                update: {
                  title,
                  description,
                  terraformHcl,
                  estimatedMonthlySavings: monthlySavings,
                  estimatedGco2eSavings: monthlyCarbonEmissions,
                  evidence: JSON.stringify(evidence),
                },
              });
              recommendationCount++;
            }
          } else {
            await prisma.recommendation.deleteMany({ where: { id: `rec_ebs_${res.id}` } });
          }
        }

        // 2. Network IP cleanup
        if (res.resourceType === "eip") {
          if (res.lifecycleState === "unassociated") {
            const monthlySavings = res.monthlyCost || 3.6;
            const title = `Release Unassociated Elastic IP: ${res.providerResourceId}`;
            const description = `Static public IPv4 ${res.providerResourceId} in ${res.region} is idle and incurs hourly unassociated IPv4 charges.`;
            const terraformHcl = buildTerraformBlock("eip_release", provider, res.providerResourceId, res.region);
            const evidence = {
              calculation: `Idle IPv4 rate: $0.005/hr x 730 hrs = $${monthlySavings.toFixed(2)}/month.`,
              reason: `Address "${res.providerResourceId}" is allocated without an attached ENI or NAT gateway.`,
              carbonImpact: `Reduces unused control-plane allocation footprint.`,
            };

            await prisma.recommendation.upsert({
              where: { id: `rec_eip_${res.id}` },
              create: {
                id: `rec_eip_${res.id}`,
                tenantId: this.tenantId,
                resourceId: res.id,
                category: "idle_cleanup",
                title,
                description,
                terraformHcl,
                status: "active",
                estimatedMonthlySavings: monthlySavings,
                estimatedGco2eSavings: 0,
                riskScore: 1,
                confidence: 1.0,
                evidence: JSON.stringify(evidence),
              },
              update: {
                title,
                description,
                terraformHcl,
                estimatedMonthlySavings: monthlySavings,
                evidence: JSON.stringify(evidence),
              },
            });
            recommendationCount++;
          } else {
            await prisma.recommendation.deleteMany({ where: { id: `rec_eip_${res.id}` } });
          }
        }

        // 3. Compute (EC2 / GCE / Azure VM)
        if (res.resourceType === "ec2" || res.resourceType === "gce_vm" || res.resourceType === "azure_vm") {
          if (res.lifecycleState === "stopped") {
            await prisma.recommendation.deleteMany({
              where: { id: { in: [`rec_ec2_idle_${res.id}`, `rec_ec2_rightsize_${res.id}`] } },
            });

            const title = `Audit Stopped Compute Instance: ${nameTag}`;
            const description = `Instance ${res.providerResourceId} (${res.instanceType || "unknown"}) in ${res.region} is stopped while attached storage remains billable.`;
            const terraformHcl = buildTerraformBlock("stopped_review", provider, res.providerResourceId, res.region, res.instanceType);
            const evidence = {
              calculation: `Instance "${res.providerResourceId}" (${res.instanceType || "unknown"}) is stopped ($0 compute, ongoing attached volume billing).`,
              reason: `Snapshot and decommission if permanently unused to stop EBS retention charges.`,
              carbonImpact: `Removes reserved hardware embodied allocation when terminated.`,
            };

            await prisma.recommendation.upsert({
              where: { id: `rec_ec2_stopped_${res.id}` },
              create: {
                id: `rec_ec2_stopped_${res.id}`,
                tenantId: this.tenantId,
                resourceId: res.id,
                category: "idle_cleanup",
                title,
                description,
                terraformHcl,
                status: "active",
                estimatedMonthlySavings: 0,
                estimatedGco2eSavings: 0,
                riskScore: 2,
                confidence: 0.8,
                evidence: JSON.stringify(evidence),
              },
              update: {
                title,
                description,
                terraformHcl,
                evidence: JSON.stringify(evidence),
              },
            });
            recommendationCount++;
          } else if (res.lifecycleState === "running") {
            await prisma.recommendation.deleteMany({
              where: { id: `rec_ec2_stopped_${res.id}` },
            });

            if (res.telemetryMetrics) {
              let telemetry: TelemetryMetrics;
              try {
                telemetry = JSON.parse(res.telemetryMetrics);
              } catch {
                continue;
              }

              const cpuSeries = telemetry.cpuDailyAverages || [];
              if (cpuSeries.length > 0) {
                const avgCpu = cpuSeries.reduce((a, b) => a + b, 0) / cpuSeries.length;
                const peakCpu = telemetry.peakCpu || Math.max(...cpuSeries);
                const idleThreshold = GreenCloudConfig.idleCpuThreshold;
                const rightsizingThreshold = GreenCloudConfig.rightsizingPeakCpuThreshold;

                if (avgCpu < idleThreshold) {
                  const monthlySavings = res.monthlyCost || 0;
                  if (monthlySavings > 0) {
                    const title = `Stop Idle Instance: ${nameTag} (${res.instanceType || "compute"})`;
                    const description = `Average CPU of ${avgCpu.toFixed(1)}% over ${telemetry.lookbackDays || cpuSeries.length} days is below ${idleThreshold}%; stopping or scheduling saves $${monthlySavings.toFixed(2)}/mo.`;
                    const terraformHcl = buildTerraformBlock("ec2_stop", provider, res.providerResourceId, res.region, res.instanceType);
                    const evidence = {
                      calculation: `SKU: ${res.instanceType || "unknown"}, Cost: $${monthlySavings.toFixed(2)}/mo. Avg CPU: ${avgCpu.toFixed(1)}%, Peak: ${peakCpu.toFixed(1)}%.`,
                      reason: `Utilization stayed below idle threshold (${idleThreshold}%).`,
                      carbonImpact: `Saves ${(monthlyCarbonEmissions / 1000).toFixed(3)} kg CO2e/month.`,
                    };

                    await prisma.recommendation.upsert({
                      where: { id: `rec_ec2_idle_${res.id}` },
                      create: {
                        id: `rec_ec2_idle_${res.id}`,
                        tenantId: this.tenantId,
                        resourceId: res.id,
                        category: "idle_cleanup",
                        title,
                        description,
                        terraformHcl,
                        status: "active",
                        estimatedMonthlySavings: monthlySavings,
                        estimatedGco2eSavings: monthlyCarbonEmissions,
                        riskScore: 4,
                        confidence: cpuSeries.length >= 7 ? 0.9 : 0.7,
                        evidence: JSON.stringify(evidence),
                      },
                      update: {
                        title,
                        description,
                        terraformHcl,
                        estimatedMonthlySavings: monthlySavings,
                        estimatedGco2eSavings: monthlyCarbonEmissions,
                        confidence: cpuSeries.length >= 7 ? 0.9 : 0.7,
                        evidence: JSON.stringify(evidence),
                      },
                    });
                    recommendationCount++;
                  }
                } else {
                  await prisma.recommendation.deleteMany({ where: { id: `rec_ec2_idle_${res.id}` } });
                }

                if (avgCpu >= idleThreshold && peakCpu < rightsizingThreshold && peakCpu > 0) {
                  const monthlySavings = (res.monthlyCost || 0) * 0.4;
                  if (monthlySavings > 0) {
                    const title = `Rightsize Compute: ${nameTag} (${res.instanceType || "compute"})`;
                    const description = `Peak CPU reached only ${peakCpu.toFixed(1)}% over ${telemetry.lookbackDays || cpuSeries.length} days; downsizing one family tier saves ~$${monthlySavings.toFixed(2)}/mo.`;
                    const terraformHcl = buildTerraformBlock("ec2_rightsize", provider, res.providerResourceId, res.region, res.instanceType);
                    const evidence = {
                      calculation: `SKU: ${res.instanceType || "unknown"}, Monthly cost: $${(res.monthlyCost || 0).toFixed(2)}/mo. Peak CPU: ${peakCpu.toFixed(1)}% (<${rightsizingThreshold}%).`,
                      reason: `Substantial compute headroom remains across peak traffic windows.`,
                      carbonImpact: `Cuts emissions ~${((monthlyCarbonEmissions * 0.4) / 1000).toFixed(3)} kg CO2e/month.`,
                    };

                    await prisma.recommendation.upsert({
                      where: { id: `rec_ec2_rightsize_${res.id}` },
                      create: {
                        id: `rec_ec2_rightsize_${res.id}`,
                        tenantId: this.tenantId,
                        resourceId: res.id,
                        category: "rightsizing",
                        title,
                        description,
                        terraformHcl,
                        status: "active",
                        estimatedMonthlySavings: parseFloat(monthlySavings.toFixed(2)),
                        estimatedGco2eSavings: parseFloat((monthlyCarbonEmissions * 0.4).toFixed(2)),
                        riskScore: 3,
                        confidence: cpuSeries.length >= 7 ? 0.85 : 0.65,
                        evidence: JSON.stringify(evidence),
                      },
                      update: {
                        title,
                        description,
                        terraformHcl,
                        estimatedMonthlySavings: parseFloat(monthlySavings.toFixed(2)),
                        estimatedGco2eSavings: parseFloat((monthlyCarbonEmissions * 0.4).toFixed(2)),
                        confidence: cpuSeries.length >= 7 ? 0.85 : 0.65,
                        evidence: JSON.stringify(evidence),
                      },
                    });
                    recommendationCount++;
                  }
                } else {
                  await prisma.recommendation.deleteMany({ where: { id: `rec_ec2_rightsize_${res.id}` } });
                }
              }
            }
          } else {
            await prisma.recommendation.deleteMany({ where: { resourceId: res.id } });
          }
        }
      }
    }

    Logger.success("REC", "REC_SWEEP_COMPLETE", `Evaluated ${recommendationCount} recommendations.`, {
      recommendationCount,
    });
    return recommendationCount;
  }
}
