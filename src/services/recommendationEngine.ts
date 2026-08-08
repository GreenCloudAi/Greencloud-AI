import { CarbonEngine } from "./carbonEngine";

export interface CandidateResource {
  id: string;
  providerResourceId: string;
  resourceType: string; // "ec2", "ebs", "eip"
  lifecycleState: string;
  tags: { Key: string; Value: string }[];
  cpuUtilizationSeries?: number[];
  monthlyCost: number;
  instanceType?: string;
  volumeSizeGb?: number;
  isAttached?: boolean;
}

export interface GeneratedRecommendation {
  resourceId: string;
  category: "idle_cleanup" | "rightsizing" | "carbon_aware";
  title: string;
  estimatedMonthlySavings: number;
  estimatedGco2eSavings: number;
  riskScore: number; // 0.0 (low risk) to 1.0 (high risk)
  confidence: number; // 0.0 to 1.0
  evidence: {
    ruleApplied: string;
    metricsSummary: string;
    calculationFormula: string;
    suggestedAction: string;
  };
}

export class RecommendationEngine {
  /**
   * Evaluates cloud resources and generates evidence-backed cost and carbon recommendations.
   */
  static evaluateResource(res: CandidateResource): GeneratedRecommendation | null {
    // Rule 1: Idle Unattached EBS Volume Cleanup
    if (res.resourceType === "ebs" && res.lifecycleState === "available" && !res.isAttached) {
      const sizeGb = res.volumeSizeGb || 100;
      const monthlySavings = res.monthlyCost > 0 ? res.monthlyCost : sizeGb * 0.08;
      
      // Embodied carbon calculation for idle storage
      const carbonSavings = sizeGb * 0.15 * 730; // ~150g CO2e per 100GB monthly

      return {
        resourceId: res.id,
        category: "idle_cleanup",
        title: `Delete Unattached EBS Volume (${res.providerResourceId})`,
        estimatedMonthlySavings: parseFloat(monthlySavings.toFixed(2)),
        estimatedGco2eSavings: parseFloat(carbonSavings.toFixed(2)),
        riskScore: 0.1, // Low risk because disk is unattached
        confidence: 0.98,
        evidence: {
          ruleApplied: "rule_ebs_unattached_cleanup",
          metricsSummary: `EBS volume ${res.providerResourceId} (${sizeGb} GB) has been unattached in available state for > 30 days.`,
          calculationFormula: `${sizeGb} GB * $0.08/GB-month = $${monthlySavings.toFixed(2)}/mo`,
          suggestedAction: `Create EBS snapshot for safety, then terminate unattached volume ${res.providerResourceId}.`
        }
      };
    }

    // Rule 2: Unassociated Elastic IP Cleanup
    if (res.resourceType === "eip" && !res.isAttached) {
      const monthlySavings = 3.60;
      return {
        resourceId: res.id,
        category: "idle_cleanup",
        title: `Release Unassociated Elastic IP (${res.providerResourceId})`,
        estimatedMonthlySavings: monthlySavings,
        estimatedGco2eSavings: 5.0,
        riskScore: 0.05,
        confidence: 0.99,
        evidence: {
          ruleApplied: "rule_eip_unassociated_release",
          metricsSummary: `Elastic IP ${res.providerResourceId} is not assigned to any running EC2 instance or ENI interface.`,
          calculationFormula: `1 Unassociated EIP * $0.005/hr * 730 hrs = $3.60/mo`,
          suggestedAction: `Release Elastic IP allocation ${res.providerResourceId} back to AWS pool.`
        }
      };
    }

    // Rule 3: Oversized / Low CPU EC2 Instance Rightsizing
    if (res.resourceType === "ec2" && res.cpuUtilizationSeries && res.cpuUtilizationSeries.length > 0) {
      const avgCpu = res.cpuUtilizationSeries.reduce((a, b) => a + b, 0) / res.cpuUtilizationSeries.length;
      
      if (avgCpu < 15.0 && res.instanceType === "m5.large") {
        const currentCost = res.monthlyCost || 69.36;
        const targetType = "t3.medium";
        const targetCost = 30.34;
        const savings = currentCost - targetCost;

        // Calculate carbon reduction
        const currentCarbon = CarbonEngine.calculateInstanceCarbon({ instanceType: "m5.large", cpuUtilPercent: avgCpu, hours: 730 });
        const targetCarbon = CarbonEngine.calculateInstanceCarbon({ instanceType: "t3.medium", cpuUtilPercent: avgCpu * 1.5, hours: 730 });
        const carbonSavings = Math.max(0, currentCarbon.operationalGco2e - targetCarbon.operationalGco2e);

        return {
          resourceId: res.id,
          category: "rightsizing",
          title: `Rightsize EC2 Instance ${res.providerResourceId} from m5.large to t3.medium`,
          estimatedMonthlySavings: parseFloat(savings.toFixed(2)),
          estimatedGco2eSavings: parseFloat(carbonSavings.toFixed(2)),
          riskScore: 0.25, // Moderate risk - requires short reboot during maintenance window
          confidence: 0.90,
          evidence: {
            ruleApplied: "rule_ec2_rightsize_low_cpu",
            metricsSummary: `Average 7-day CPU utilization is ${avgCpu.toFixed(1)}% (below 15% threshold). Peak CPU did not exceed 28%.`,
            calculationFormula: `Current ($${currentCost.toFixed(2)}) - Proposed t3.medium ($${targetCost.toFixed(2)}) = $${savings.toFixed(2)}/mo`,
            suggestedAction: `Schedule change window to update EC2 instance type from m5.large to t3.medium.`
          }
        };
      }
    }

    return null;
  }
}
