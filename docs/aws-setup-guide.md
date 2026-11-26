# AWS Setup Guide

This guide walks you through every step to connect a **real AWS account** to GreenCloud AI with proper IAM policies, least-privilege roles, and Cost Explorer activation.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Step 1: Enable AWS Cost Explorer](#2-step-1-enable-aws-cost-explorer)
3. [Step 2: Create the IAM Policy](#3-step-2-create-the-iam-policy)
4. [Step 3: Create the IAM Role](#4-step-3-create-the-iam-role)
5. [Step 4: Create IAM User for Local Development](#5-step-4-create-iam-user-for-local-development)
6. [Step 5: Configure Environment Variables](#6-step-5-configure-environment-variables)
7. [Step 6: Connect Account in GreenCloud](#7-step-6-connect-account-in-greencloud)
8. [Step 7: Provision Demo Resources (Optional)](#8-step-7-provision-demo-resources-optional)
9. [Understanding the Architecture](#9-understanding-the-architecture)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

- An **AWS account** with billing access (AWS Free Tier works for most resources)
- **AWS CLI** installed (optional but helpful) — [Install guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- GreenCloud AI running locally (`npm run dev`)

---

## 2. Step 1: Enable AWS Cost Explorer

> **⚠️ IMPORTANT**: Cost Explorer must be enabled manually and takes **up to 24 hours** to activate. Do this first.

### Via AWS Console:
1. Sign in to **AWS Management Console** → search "**Cost Explorer**"
2. Click **"Launch Cost Explorer"** or **"Enable Cost Explorer"**
3. Wait 24 hours for historical billing data to become available via API

### Via AWS CLI:
```bash
aws ce get-cost-and-usage \
  --time-period Start=2026-07-01,End=2026-07-31 \
  --granularity MONTHLY \
  --metrics "UnblendedCost"
```
If this returns data, Cost Explorer is active. If it fails with "not enabled", enable it from the console.

> **Billing Note**: Cost Explorer API calls cost **$0.01 per request**. GreenCloud makes ~1 request per sync.

---

## 3. Step 2: Create the IAM Policy

This policy grants **read-only** access to EC2, EBS, EIP, CloudWatch, Cost Explorer, and tagging APIs. **No write, modify, or delete permissions are included.**

### Via AWS Console:
1. Go to **IAM** → **Policies** → **Create Policy**
2. Switch to **JSON** tab
3. Paste the following policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CostExplorerRead",
      "Effect": "Allow",
      "Action": [
        "ce:GetCostAndUsage",
        "ce:GetCostForecast",
        "ce:GetDimensionValues",
        "ce:GetReservationUtilization",
        "ce:GetTags"
      ],
      "Resource": "*"
    },
    {
      "Sid": "EC2InventoryRead",
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeInstances",
        "ec2:DescribeVolumes",
        "ec2:DescribeAddresses",
        "ec2:DescribeRegions",
        "ec2:DescribeSnapshots",
        "ec2:DescribeTags",
        "ec2:DescribeInstanceTypes",
        "ec2:DescribeInstanceStatus"
      ],
      "Resource": "*"
    },
    {
      "Sid": "CloudWatchMetricsRead",
      "Effect": "Allow",
      "Action": [
        "cloudwatch:GetMetricData",
        "cloudwatch:GetMetricStatistics",
        "cloudwatch:ListMetrics"
      ],
      "Resource": "*"
    },
    {
      "Sid": "STSIdentity",
      "Effect": "Allow",
      "Action": [
        "sts:GetCallerIdentity"
      ],
      "Resource": "*"
    },
    {
      "Sid": "TaggingRead",
      "Effect": "Allow",
      "Action": [
        "tag:GetResources",
        "tag:GetTagKeys",
        "tag:GetTagValues"
      ],
      "Resource": "*"
    },
    {
      "Sid": "ComputeOptimizerRead",
      "Effect": "Allow",
      "Action": [
        "compute-optimizer:GetEC2InstanceRecommendations",
        "compute-optimizer:GetEBSVolumeRecommendations"
      ],
      "Resource": "*"
    }
  ]
}
```

4. Click **Next** → Name it: `GreenCloudReadOnlyPolicy`
5. Click **Create Policy**

### Via AWS CLI:
```bash
aws iam create-policy \
  --policy-name GreenCloudReadOnlyPolicy \
  --policy-document file://infra/greencloud-policy.json
```

---

## 4. Step 3: Create the IAM Role

The IAM Role is what GreenCloud "assumes" to access your account. This uses STS AssumeRole — **no static access keys are stored in the database**.

### Via AWS Console:
1. Go to **IAM** → **Roles** → **Create Role**
2. Select **"AWS Account"** as the trusted entity type
3. Select **"Another AWS account"** and enter your **own AWS Account ID** (for local dev, you'll assume a role within the same account)
4. Check **"Require external ID"** and enter: `greencloud-<your-tenant-id>` (e.g., `greencloud-demo`)
5. Click **Next** → Attach the `GreenCloudReadOnlyPolicy` you created above
6. Name the role: `GreenCloudReadOnlyRole`
7. Click **Create Role**
8. Copy the **Role ARN** (e.g., `arn:aws:iam::123456789012:role/GreenCloudReadOnlyRole`)

### Via CloudFormation (Automated):
```bash
aws cloudformation deploy \
  --template-file infra/cloudformation.template.json \
  --stack-name GreenCloudReadOnlyRoleStack \
  --parameter-overrides \
    GreenCloudTenantExternalId=greencloud-demo \
    GreenCloudAccountId=YOUR_AWS_ACCOUNT_ID \
  --capabilities CAPABILITY_NAMED_IAM
```

### Understanding the Trust Policy:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::YOUR_ACCOUNT_ID:root"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "greencloud-demo"
        }
      }
    }
  ]
}
```

**Why ExternalId?** This prevents the ["confused deputy" attack](https://docs.aws.amazon.com/IAM/latest/UserGuide/confused-deputy.html). Only callers who know the secret ExternalId can assume this role.

---

## 5. Step 4: Create IAM User for Local Development

For local development, you need an IAM User whose credentials can make the initial STS AssumeRole call.

### Via AWS Console:
1. Go to **IAM** → **Users** → **Create User**
2. Name: `greencloud-local-dev`
3. Select **"Programmatic access"** (Access Key)
4. Attach this inline policy (allows ONLY assuming the GreenCloud role):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "sts:AssumeRole",
      "Resource": "arn:aws:iam::YOUR_ACCOUNT_ID:role/GreenCloudReadOnlyRole"
    }
  ]
}
```

5. Create the user and **download the Access Key ID and Secret Access Key**
6. **NEVER commit these keys to git**

> **For production**: Use OIDC identity federation, IAM Roles for Service Accounts (IRSA), or EC2 Instance Profiles instead of static keys.

---

## 6. Step 5: Configure Environment Variables

1. Copy the example file:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` with your credentials:
   ```env
   AWS_ACCESS_KEY_ID=AKIA...your-key...
   AWS_SECRET_ACCESS_KEY=wJal...your-secret...
   AWS_DEFAULT_REGION=us-east-1
   GREENCLOUD_SCAN_REGIONS=us-east-1
   ```

3. Verify `.env.local` is in `.gitignore` (it should already be)

---

## 7. Step 6: Connect Account in GreenCloud

1. Start the dev server: `npm run dev`
2. Open [http://localhost:3000/onboarding](http://localhost:3000/onboarding)
3. Fill in:
   - **Connection Name**: `My AWS Production`
   - **AWS Account ID**: Your 12-digit AWS account ID (find it in AWS Console → top-right menu)
   - **Role ARN**: `arn:aws:iam::YOUR_ACCOUNT_ID:role/GreenCloudReadOnlyRole`
   - **External ID**: `greencloud-demo` (must match what you set in Step 3)
4. Click **"Securely Connect AWS Account"**
5. Navigate to the **Dashboard** and click **"Sync Billing & Assets"**

The sync will:
- Call STS AssumeRole to get temporary credentials
- Fetch all EC2 instances, EBS volumes, and Elastic IPs
- Query CloudWatch for 7-day CPU utilization per running instance
- Query Cost Explorer for 30-day billing breakdown
- Calculate carbon footprint using grid intensity data
- Generate optimization recommendations based on real usage data

---

## 8. Step 7: Provision Demo Resources (Optional)

If your AWS account is empty, you can create test resources to generate meaningful data:

### Launch a Demo EC2 Instance:
```bash
# Create a t2.micro instance (Free Tier eligible)
aws ec2 run-instances \
  --image-id ami-0c02fb55956c7d316 \
  --instance-type t2.micro \
  --count 1 \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=greencloud-demo-web},{Key=Environment,Value=staging},{Key=Owner,Value=DevTeam}]' \
  --region us-east-1
```

### Create an Unattached EBS Volume (will trigger recommendation):
```bash
aws ec2 create-volume \
  --availability-zone us-east-1a \
  --size 50 \
  --volume-type gp3 \
  --tag-specifications 'ResourceType=volume,Tags=[{Key=Name,Value=greencloud-demo-unused-vol},{Key=Environment,Value=dev}]' \
  --region us-east-1
```

### Allocate an Elastic IP (will trigger recommendation if unassociated):
```bash
aws ec2 allocate-address \
  --domain vpc \
  --tag-specifications 'ResourceType=elastic-ip,Tags=[{Key=Name,Value=greencloud-demo-ip},{Key=Environment,Value=dev}]' \
  --region us-east-1
```

> **⚠️ COST WARNING**: Remember to terminate these resources after testing to avoid charges:
> ```bash
> # Terminate instance
> aws ec2 terminate-instances --instance-ids i-XXXXXXXXXXXX
> # Delete volume
> aws ec2 delete-volume --volume-id vol-XXXXXXXXXXXX
> # Release EIP
> aws ec2 release-address --allocation-id eipalloc-XXXXXXXXXXXX
> ```

---

## 9. Understanding the Architecture

### How GreenCloud Connects to AWS (No Static Keys in DB)

```
┌──────────────────────────────────────────────────────────────┐
│  YOUR LOCAL MACHINE                                         │
│  ┌──────────────────────────────────────────────────┐       │
│  │  .env.local                                      │       │
│  │  AWS_ACCESS_KEY_ID = AKIA...                     │       │
│  │  AWS_SECRET_ACCESS_KEY = wJal...                  │ ①     │
│  └──────────────────────────────────────────────────┘       │
│         │                                                    │
│         ▼                                                    │
│  ┌──────────────────────────────────────────────────┐       │
│  │  GreenCloud AI (Next.js App)                     │       │
│  │                                                   │       │
│  │  1. Read roleArn from SQLite DB                  │       │
│  │  2. STS AssumeRole (roleArn + externalId)     ──────②──→ AWS STS
│  │  3. Receive temporary credentials (15 min TTL)←──────③── │
│  │  4. Use temp creds for EC2/CW/CE API calls    ──────④──→ AWS APIs
│  │  5. Store results in SQLite                      │       │
│  └──────────────────────────────────────────────────┘       │
└──────────────────────────────────────────────────────────────┘

YOUR AWS ACCOUNT:
┌──────────────────────────────────────────────────────────────┐
│  IAM Role: GreenCloudReadOnlyRole                           │
│  Trust: Your own account (for local dev)                    │
│  Permissions: Read-only EC2, CloudWatch, Cost Explorer      │
│  ExternalId: greencloud-demo                                │
└──────────────────────────────────────────────────────────────┘
```

### Key Security Properties:
- **No static keys in the database** — Only the Role ARN and ExternalId are stored
- **Temporary credentials** — STS tokens expire in 15 minutes
- **Read-only permissions** — The role cannot modify or delete any AWS resources
- **ExternalId protection** — Prevents confused deputy attacks
- **Tenant isolation** — Each tenant's data is scoped by tenantId in every DB query

### IAM Groups (If Multiple Developers):
If you have a team, create an IAM Group:
1. **IAM** → **Groups** → **Create Group**: `GreenCloudDevelopers`
2. Attach the inline policy allowing `sts:AssumeRole` on `GreenCloudReadOnlyRole`
3. Add team members to this group
4. Each developer uses their own IAM User credentials in their local `.env.local`

---

## 10. Troubleshooting

### "STS AssumeRole denied"
- Verify the Role ARN is correct (check for typos, especially the account ID)
- Verify the ExternalId matches exactly (case-sensitive)
- Verify the Trust Policy allows your account to assume the role
- Check that the IAM User has `sts:AssumeRole` permission

### "Cost Explorer not enabled"
- Cost Explorer takes up to 24 hours to activate
- Ensure you enabled it from the **billing account** (not a linked account)
- Try the AWS CLI test command from Step 1

### "CloudWatch returns no data"
- CloudWatch metrics are only available for **running** instances
- EC2 basic monitoring (5-min intervals) is free and enabled by default
- Detailed monitoring (1-min intervals) costs extra but is not required
- New instances need ~5-10 minutes before metrics appear
- Data is retained for 15 months (standard resolution)

### "ec2:DescribeInstances Access Denied"
- The IAM Role is missing the `ec2:DescribeInstances` permission
- Re-check the policy attached to `GreenCloudReadOnlyRole`
- Verify the policy matches the JSON in Step 2 above

### "No resources found after sync"
- Verify resources exist in the **correct region** (`us-east-1` by default)
- Check `GREENCLOUD_SCAN_REGIONS` in `.env.local` matches where your resources are
- Check the sync error in the dashboard's Connected Cloud Accounts table
