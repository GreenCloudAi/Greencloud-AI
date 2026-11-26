# GreenCloud AI - Demo & AWS Setup Guide

This guide explains how to connect AWS accounts to GreenCloud AI using the least-privilege `GreenCloudReadOnlyRole` IAM Role and how to provision a repeatable local demo environment.

---

## 1. Security Architecture (`GreenCloudReadOnlyRole`)

GreenCloud AI connects to AWS without static access keys (such as AWS Access Key ID / Secret Access Key). It uses AWS Security Token Service (STS) `AssumeRole` with a unique `ExternalId` (`greencloud-<tenantId>`).

### Granted Read-Only Permissions:
1. **AWS Cost Explorer**: `ce:GetCostAndUsage`, `ce:GetCostForecast`, `ce:GetDimensionValues`, `ce:GetReservationUtilization`
2. **STS Validation**: `sts:GetCallerIdentity`
3. **EC2 / EBS / EIP Metadata**: `ec2:DescribeInstances`, `ec2:DescribeVolumes`, `ec2:DescribeAddresses`, `ec2:DescribeRegions`, `ec2:DescribeSnapshots`, `ec2:DescribeTags`
4. **CloudWatch Metrics**: `cloudwatch:GetMetricData`, `cloudwatch:GetMetricStatistics`
5. **Resource Tagging API**: `tag:GetResources`, `tag:GetTagKeys`, `tag:GetTagValues`
6. **AWS Compute Optimizer**: `compute-optimizer:GetEC2InstanceRecommendations`, `compute-optimizer:GetEBSVolumeRecommendations`
7. **CUR S3 Bucket Read** *(Optional)*: `s3:GetObject`, `s3:ListBucket`

No write, modify, or delete permissions are requested or required.

---

## 2. Deploying the CloudFormation Stack in AWS

### Option A: AWS Management Console
1. Log in to your AWS Management Console.
2. Navigate to **CloudFormation** -> **Create stack (with new resources)**.
3. Choose **Upload a template file** and select `infra/cloudformation.template.json`.
4. Enter parameters:
   - `GreenCloudTenantExternalId`: `greencloud-<your-tenant-id>` (generated in GreenCloud Onboarding screen).
   - `GreenCloudAccountId`: `123456789012` (GreenCloud Control Plane Account ID).
5. Click **Next** -> check "I acknowledge that AWS CloudFormation might create IAM resources" -> click **Submit**.
6. Copy the output `RoleARN` (e.g., `arn:aws:iam::123456789012:role/GreenCloudReadOnlyRole`).

### Option B: AWS CLI
```bash
aws cloudformation create-stack \
  --stack-name GreenCloudReadOnlyRoleStack \
  --template-body file://infra/cloudformation.template.json \
  --parameters \
    ParameterKey=GreenCloudTenantExternalId,ParameterValue=greencloud-demo-tenant \
    ParameterKey=GreenCloudAccountId,ParameterValue=123456789012 \
  --capabilities CAPABILITY_NAMED_IAM
```

---

## 3. Connecting the Account in GreenCloud AI

1. Open GreenCloud AI at `http://localhost:3000` (or `3001`).
2. Go to **Onboarding** (`/onboarding`).
3. Fill in:
   - **AWS Account Name**: `Acme AWS Production`
   - **AWS Account ID**: `112233445566`
   - **Role ARN**: `arn:aws:iam::112233445566:role/GreenCloudReadOnlyRole`
   - **External ID**: `greencloud-demo-tenant`
4. Click **Connect AWS Account**.
5. GreenCloud will validate the STS identity, initiate the initial sync, normalize cost records to FOCUS schema, run carbon accounting models, and populate the dashboard.

---

## 4. Running the Repeatable Demo Environment Locally

You can run the full end-to-end demo locally without active AWS credentials using our built-in simulator:

```bash
# 1. Push Prisma DB schema
npx prisma db push

# 2. Seed default demo data (Tenant, AWS Account, Resources, Cost Items, Carbon, Recommendations)
npx tsx src/services/seed.ts

# 3. Start local development server
npm run dev

# 4. Run E2E verification test suite
npm run test:e2e
```
