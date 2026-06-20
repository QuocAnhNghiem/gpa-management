#!/usr/bin/env bash
set -euo pipefail

AWS_REGION="${AWS_REGION:-ap-southeast-1}"
CLUSTER_NAME="${CLUSTER_NAME:-gpa-management}"
PROJECT_FILTER="${PROJECT_FILTER:-gpa-management}"

echo "AWS region: ${AWS_REGION}"
echo "Cluster: ${CLUSTER_NAME}"
echo

echo "EKS cluster"
aws eks describe-cluster \
  --name "${CLUSTER_NAME}" \
  --region "${AWS_REGION}" \
  --query 'cluster.{Name:name,Status:status,Version:version,Endpoint:endpoint}' \
  --output table
echo

echo "EKS node groups"
aws eks list-nodegroups \
  --cluster-name "${CLUSTER_NAME}" \
  --region "${AWS_REGION}" \
  --output table
echo

echo "EC2 instances tagged for this project or Jenkins"
aws ec2 describe-instances \
  --region "${AWS_REGION}" \
  --filters "Name=instance-state-name,Values=pending,running,stopping,stopped" \
  --query "Reservations[].Instances[?contains(join('', Tags[].Value), '${PROJECT_FILTER}') || contains(join('', Tags[].Value), 'Jenkins') || contains(join('', Tags[].Key), 'eks:cluster-name')].{Id:InstanceId,State:State.Name,Type:InstanceType,AZ:Placement.AvailabilityZone,Name:Tags[?Key=='Name']|[0].Value}" \
  --output table
echo

echo "NAT gateways"
aws ec2 describe-nat-gateways \
  --region "${AWS_REGION}" \
  --filter "Name=state,Values=pending,available" \
  --query 'NatGateways[].{Id:NatGatewayId,State:State,SubnetId:SubnetId,PublicIp:NatGatewayAddresses[0].PublicIp}' \
  --output table
echo

echo "Load balancers"
aws elbv2 describe-load-balancers \
  --region "${AWS_REGION}" \
  --query 'LoadBalancers[].{Name:LoadBalancerName,DNS:DNSName,Type:Type,Scheme:Scheme,State:State.Code}' \
  --output table
echo

echo "CloudFront distributions"
aws cloudfront list-distributions \
  --query 'DistributionList.Items[].{Id:Id,DomainName:DomainName,Aliases:Aliases.Items,Status:Status,Enabled:Enabled}' \
  --output table
echo

echo "CloudWatch Container Insights log groups"
aws logs describe-log-groups \
  --region "${AWS_REGION}" \
  --log-group-name-prefix "/aws/containerinsights/${CLUSTER_NAME}" \
  --query 'logGroups[].{Name:logGroupName,Retention:retentionInDays,StoredBytes:storedBytes}' \
  --output table
echo

echo "ECR repositories"
aws ecr describe-repositories \
  --region "${AWS_REGION}" \
  --query 'repositories[].{Name:repositoryName,Uri:repositoryUri,ScanOnPush:imageScanningConfiguration.scanOnPush}' \
  --output table
echo

echo "S3 project buckets"
aws s3api list-buckets \
  --query "Buckets[?contains(Name, '${PROJECT_FILTER}')].{Name:Name,Created:CreationDate}" \
  --output table

