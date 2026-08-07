import { promises as fs } from "fs";
import path from "path";

export interface TicketPayload {
  recommendationId: string;
  title: string;
  category: string;
  estimatedMonthlySavings: number;
  estimatedGco2eSavings: number;
  riskScore: number;
  evidence: {
    calculation: string;
    reason: string;
    carbonImpact: string;
  };
  resourceId: string;
}

export class TicketService {
  private static workspaceRoot = "c:/Users/cosmi/OneDrive/Documents/GitHub/Greencloud-AI";

  /**
   * Generates a markdown format Jira Ticket file.
   */
  static async createJiraTicket(payload: TicketPayload): Promise<string> {
    const ticketsDir = path.join(this.workspaceRoot, "tickets");
    await fs.mkdir(ticketsDir, { recursive: true });

    const ticketId = `GC-${Math.floor(1000 + Math.random() * 9000)}`;
    const ticketPath = path.join(ticketsDir, `ticket_${ticketId}.md`);

    const markdown = `# Jira Ticket [${ticketId}] — ${payload.title}

* **Status:** TO DO
* **Priority:** ${payload.riskScore < 0.2 ? "Medium" : "High"}
* **Component:** Cloud-Optimization / ${payload.category === "idle_cleanup" ? "FinOps-IdleClean" : "FinOps-Rightsizing"}
* **Estimated Savings:** $${payload.estimatedMonthlySavings.toFixed(2)} / month
* **Estimated Carbon Reduction:** ${(payload.estimatedGco2eSavings / 1000).toFixed(2)} kg CO2e / month
* **Risk Score:** ${payload.riskScore} (Low Risk)

## Description
GreenCloud AI has identified an optimization opportunity for resource \`${payload.resourceId}\`.

### Evidence and Calculations
* **Observation:** ${payload.evidence.reason}
* **Financial Details:** ${payload.evidence.calculation}
* **Carbon Details:** ${payload.evidence.carbonImpact}

### Proposed Action
1. Stop or terminate/deprovision the referenced cloud asset in the AWS console or IaC.
2. Confirm the cost reduction in AWS Cost Explorer after 24 hours.

---
*Created automatically by GreenCloud AI. Ref Recommendation: ${payload.recommendationId}*
`;

    await fs.writeFile(ticketPath, markdown, "utf-8");
    return ticketPath;
  }

  /**
   * Generates a git diff patch representing a Terraform PR to clean up the resource.
   */
  static async createPullRequest(payload: TicketPayload): Promise<string> {
    const prsDir = path.join(this.workspaceRoot, "pull_requests");
    await fs.mkdir(prsDir, { recursive: true });

    const prId = `pr_${Math.floor(100 + Math.random() * 900)}`;
    const prPath = path.join(prsDir, `${prId}_remediate.diff`);

    const resourceBaseName = payload.resourceId.split("_").pop() || "resource";
    
    let diffContent = "";

    if (payload.title.toLowerCase().includes("ebs")) {
      diffContent = `diff --git a/terraform/ebs.tf b/terraform/ebs.tf
index e69de29..d6008f8 100644
--- a/terraform/ebs.tf
+++ /dev/null
@@ -1,6 +0,0 @@
-resource "aws_ebs_volume" "volume_${resourceBaseName}" {
-  availability_zone = "us-east-1a"
-  size              = 500
-  type              = "gp3"
-  tags              = { Name = "deprecated-backup" }
-}
`;
    } else if (payload.title.toLowerCase().includes("eip")) {
      diffContent = `diff --git a/terraform/network.tf b/terraform/network.tf
index a87f3b8..f452a3b 100644
--- a/terraform/network.tf
+++ /dev/null
@@ -1,4 +0,0 @@
-resource "aws_eip" "eip_${resourceBaseName.replace(/\./g, "_")}" {
-  vpc  = true
-  tags = { Environment = "staging" }
-}
`;
    } else {
      diffContent = `diff --git a/terraform/ec2.tf b/terraform/ec2.tf
index 548c7bb..b210abf 100644
--- a/terraform/ec2.tf
+++ b/terraform/ec2.tf
@@ -4,3 +4,3 @@ resource "aws_instance" "staging_server" {
   instance_type = "m5.large"
-  instance_state = "running"
+  instance_state = "stopped" # Stopped by GreenCloud AI to save $69.35/mo and reduce carbon
   tags          = { Name = "staging-processor" }
`;
    }

    const prHeader = `# Pull Request [${prId}] — Cost & Carbon Remediation
**Target Branch:** \`main\`
**Author:** \`GreenCloud AI\`

## Proposed Changes
Remediates cloud waste for resource \`${payload.resourceId}\`.
- **Monthly Savings:** $${payload.estimatedMonthlySavings.toFixed(2)}
- **Monthly Carbon Savings:** ${(payload.estimatedGco2eSavings / 1000).toFixed(2)} kg CO2e

---

${diffContent}
`;

    await fs.writeFile(prPath, prHeader, "utf-8");
    return prPath;
  }
}
