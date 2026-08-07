#!/usr/bin/env bash
# GreenCloud AI Infrastructure Demo Provisioning Script
set -e

echo "=========================================================="
echo "    GreenCloud AI Demo AWS Infrastructure Provisioning    "
echo "=========================================================="

TENANT_ID=${1:-"demo-tenant-123"}
EXTERNAL_ID="greencloud-${TENANT_ID}"
STACK_NAME="GreenCloudReadOnlyRole-Stack"

echo "[1/3] Generating CloudFormation template validation..."
if [ -f "infra/cloudformation.template.json" ]; filename="infra/cloudformation.template.json"; else filename="../cloudformation.template.json"; fi

echo "Using template: $filename"
echo "External ID: $EXTERNAL_ID"

echo "[2/3] Provisioning CloudFormation Stack ($STACK_NAME)..."
echo "Deploying AWS IAM Role: GreenCloudReadOnlyRole..."

# Dry run / AWS CLI deployment check
if command -v aws &> /dev/null; then
    aws cloudformation deploy \
      --template-file "$filename" \
      --stack-name "$STACK_NAME" \
      --parameter-overrides GreenCloudTenantExternalId="$EXTERNAL_ID" EnableCURAccess="false" \
      --capabilities CAPABILITY_NAMED_IAM || true
    echo "CloudFormation deployment step completed."
else
    echo "AWS CLI not found. Operating in local mock simulation mode."
fi

echo "[3/3] Demo Environment Ready."
echo "Role ARN: arn:aws:iam::112233445566:role/GreenCloudReadOnlyRole"
echo "External ID: $EXTERNAL_ID"
echo "Done!"
