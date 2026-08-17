#!/usr/bin/env bash
# GreenCloud AI - Demo AWS LocalStack Infrastructure Provisioner

set -euo pipefail

ENDPOINT_URL="http://localhost:4566"
REGION="us-east-1"

export AWS_ACCESS_KEY_ID="test"
export AWS_SECRET_ACCESS_KEY="test"
export AWS_DEFAULT_REGION="${REGION}"

echo "========================================================"
echo "   Provisioning GreenCloud AI Demo AWS Resources       "
echo "========================================================"

echo "1. Creating Unattached 100GB EBS Volume (Idle Waste Opportunity)..."
aws --endpoint-url=${ENDPOINT_URL} ec2 create-volume \
    --availability-zone ${REGION}a \
    --size 100 \
    --volume-type gp3 \
    --tag-specifications 'ResourceType=volume,Tags=[{Key=Name,Value=legacy-temp-backup}]'

echo "2. Allocating Unassociated Elastic IP (Idle Surcharge Opportunity)..."
aws --endpoint-url=${ENDPOINT_URL} ec2 allocate-address \
    --domain vpc \
    --tag-specifications 'ResourceType=elastic-ip,Tags=[{Key=Name,Value=unassigned-staging-eip}]'

echo "3. Creating Low-CPU Oversized EC2 Instance (Rightsizing Opportunity)..."
aws --endpoint-url=${ENDPOINT_URL} ec2 run-instances \
    --image-id ami-0c55b159cbfafe1f0 \
    --instance-type m5.large \
    --count 1 \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=analytics-worker-idle},{Key=Environment,Value=staging}]'

echo "========================================================"
echo "   Demo Infrastructure Successfully Provisioned!        "
echo "========================================================"
