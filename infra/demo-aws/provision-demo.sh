#!/bin/bash
# GreenCloud AI AWS Demo Provisioning Script
# Re-creates a mock AWS environment repeatedly inside LocalStack for E2E validation.

export AWS_ACCESS_KEY_ID=mock_key
export AWS_SECRET_ACCESS_KEY=mock_secret
export AWS_DEFAULT_REGION=us-east-1

ENDPOINT_URL="http://localhost:4566"

echo "=== Initializing LocalStack Resources ==="

# 1. Verify STS AssumeRole capability
echo "Validating STS configuration..."
aws --endpoint-url=$ENDPOINT_URL sts get-caller-identity

# 2. Provision EC2 Instances
echo "Creating EC2 instance: prod-web-server..."
aws --endpoint-url=$ENDPOINT_URL ec2 run-instances \
  --image-id ami-df5de7b8 \
  --instance-type t3.medium \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=prod-web-server},{Key=Environment,Value=production},{Key=Owner,Value=WebTeam}]' \
  --count 1

echo "Creating EC2 instance: staging-processor (Idle)..."
aws --endpoint-url=$ENDPOINT_URL ec2 run-instances \
  --image-id ami-df5de7b8 \
  --instance-type m5.large \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=staging-processor},{Key=Environment,Value=staging},{Key=Owner,Value=BatchTeam}]' \
  --count 1

# 3. Provision EBS Volumes
echo "Creating unattached EBS volume: dev-backup (Waste)..."
aws --endpoint-url=$ENDPOINT_URL ec2 create-volume \
  --size 500 \
  --volume-type gp3 \
  --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=volume,Tags=[{Key=Name,Value=deprecated-backup},{Key=Environment,Value=dev},{Key=Owner,Value=OpsTeam}]'

# 4. Provision Elastic IPs
echo "Allocating Elastic IP (associated)..."
ALLOC_ID1=$(aws --endpoint-url=$ENDPOINT_URL ec2 allocate-address --query "AllocationId" --output text)

echo "Allocating unassociated Elastic IP (Waste)..."
aws --endpoint-url=$ENDPOINT_URL ec2 allocate-address \
  --tag-specifications 'ResourceType=elastic-ip,Tags=[{Key=Environment,Value=staging},{Key=Owner,Value=OpsTeam}]'

echo "=== AWS Demo Environment Setup Completed Successfully ==="
