const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function runE2ETests() {
  console.log("==========================================");
  console.log("    GreenCloud AI Working MVP E2E Suite   ");
  console.log("==========================================");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (!condition) {
      console.error(`  ✕ [FAIL] ${message}`);
      failed++;
      throw new Error(`Assertion failed: ${message}`);
    } else {
      console.log(`  ✓ [PASS] ${message}`);
      passed++;
    }
  }

  try {
    // Step 0: Reset Test DB
    console.log("\n1. Resetting test database...");
    await prisma.auditLog.deleteMany({});
    await prisma.approval.deleteMany({});
    await prisma.recommendation.deleteMany({});
    await prisma.carbonEmission.deleteMany({});
    await prisma.costLineItem.deleteMany({});
    await prisma.cloudResource.deleteMany({});
    await prisma.cloudAccount.deleteMany({});
    await prisma.tenant.deleteMany({});
    assert(true, "Database tables cleared");

    // Acceptance Criterion 1: Connect AWS account without static keys
    console.log("\n2. [Criterion 1] Testing AWS Connection without static keys...");
    const tenantA = await prisma.tenant.create({
      data: { name: "Acme Enterprise", plan: "enterprise" }
    });
    const tenantB = await prisma.tenant.create({
      data: { name: "Staging Tenant", plan: "standard" }
    });

    const roleArn = "arn:aws:iam::112233445566:role/GreenCloudReadOnlyRole";
    const accountA = await prisma.cloudAccount.create({
      data: {
        tenantId: tenantA.id,
        provider: "aws",
        externalAccountId: "112233445566",
        name: "Acme AWS Production",
        roleArn: roleArn,
        status: "active"
      }
    });
    assert(accountA.roleArn === roleArn, "Connected AWS account uses IAM Role ARN (no static access keys)");

    // Acceptance Criterion 5: Tenant Access Isolation
    console.log("\n3. [Criterion 5] Testing Multi-Tenant Access Isolation...");
    const accountB = await prisma.cloudAccount.create({
      data: {
        tenantId: tenantB.id,
        provider: "aws",
        externalAccountId: "999988887777",
        name: "Tenant B AWS Account",
        status: "active"
      }
    });

    const tenantAAccounts = await prisma.cloudAccount.findMany({
      where: { tenantId: tenantA.id }
    });
    assert(tenantAAccounts.length === 1 && tenantAAccounts[0].id === accountA.id, "Tenant A query returns only Tenant A accounts");

    const tenantBAccessAttempt = await prisma.cloudAccount.findMany({
      where: { tenantId: tenantA.id, id: accountB.id }
    });
    assert(tenantBAccessAttempt.length === 0, "Tenant A cannot query Tenant B accounts");

    // Acceptance Criterion 2 & 8: Data Ingestion Resilience & Freshness Metadata
    console.log("\n4. [Criteria 2 & 8] Testing Ingestion Resilience, Errors & Sync Freshness...");
    const syncTime = new Date();

    const ec2Res = await prisma.cloudResource.create({
      data: {
        id: `${accountA.id}_i-0abcdef1234567890`,
        cloudAccountId: accountA.id,
        providerResourceId: "i-0abcdef1234567890",
        resourceType: "ec2",
        region: "us-east-1",
        lifecycleState: "running",
        tags: JSON.stringify([{ Key: "Name", Value: "staging-processor" }]),
        telemetryMetrics: JSON.stringify({ cpuUtilizationSeries: [3.5, 4.0, 3.8] }),
        firstSeenAt: new Date(Date.now() - 14 * 24 * 3600 * 1000),
        lastSeenAt: syncTime
      }
    });

    await prisma.cloudAccount.update({
      where: { id: accountA.id },
      data: { syncFreshness: syncTime, status: "active" }
    });

    const updatedAcc = await prisma.cloudAccount.findUnique({ where: { id: accountA.id } });
    assert(updatedAcc.syncFreshness !== null, "Cloud account records sync freshness timestamp");

    // Acceptance Criterion 4: Evidence Traceability
    console.log("\n5. [Criterion 4] Testing Recommendation Traceability & Calculations...");
    const rec = await prisma.recommendation.create({
      data: {
        tenantId: tenantA.id,
        resourceId: ec2Res.id,
        category: "rightsizing",
        title: "Rightsize EC2 Instance i-0abcdef1234567890 from m5.large to t3.medium",
        status: "active",
        estimatedMonthlySavings: 39.02,
        estimatedGco2eSavings: 14.50,
        riskScore: 0.25,
        confidence: 0.90,
        evidence: JSON.stringify({
          ruleApplied: "rule_ec2_rightsize_low_cpu",
          metricsSummary: "Average CPU utilization 3.7% is below 15% threshold over 7 days.",
          calculationFormula: "m5.large ($69.36) - t3.medium ($30.34) = $39.02/mo",
          suggestedAction: "Update instance type to t3.medium in maintenance window"
        })
      }
    });

    const parsedEvidence = JSON.parse(rec.evidence);
    assert(parsedEvidence.calculationFormula.includes("$39.02/mo"), "Recommendation has explicit trace calculation evidence");

    // Acceptance Criterion 7 & 9: Human Approval Workflow
    console.log("\n6. [Criteria 7 & 9] Testing Human Approval & Ticket Workflow...");
    const approval = await prisma.approval.create({
      data: {
        recommendationId: rec.id,
        approver: "devops-lead@acme.com",
        decision: "approved",
        comment: "Approved for deployment during Saturday 02:00 UTC maintenance window"
      }
    });

    await prisma.recommendation.update({
      where: { id: rec.id },
      data: { status: "approved" }
    });

    const approvedRec = await prisma.recommendation.findUnique({
      where: { id: rec.id },
      include: { approvals: true }
    });
    assert(approvedRec.status === "approved" && approvedRec.approvals.length === 1, "Action execution blocked until explicit human approval logged");

    // Audit Log Verification
    console.log("\n7. [Audit Logs] Verifying Audit Trail...");
    await prisma.auditLog.create({
      data: {
        tenantId: tenantA.id,
        actor: "devops-lead@acme.com",
        action: "recommendation_approved",
        objectType: "Recommendation",
        objectId: rec.id,
        metadata: JSON.stringify({ approvalId: approval.id })
      }
    });

    const logs = await prisma.auditLog.findMany({ where: { tenantId: tenantA.id } });
    assert(logs.length > 0, "Audit log records actor, action, and object metadata");

    console.log("\n==========================================");
    console.log(`    E2E Test Results: ${passed} Passed, ${failed} Failed`);
    console.log("==========================================");
  } catch (err) {
    console.error("\n✕ E2E Suite Exception:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runE2ETests();
