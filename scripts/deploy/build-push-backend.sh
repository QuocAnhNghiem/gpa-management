#!/usr/bin/env bash
set -euo pipefail

: "${AWS_REGION:?AWS_REGION is required, for example ap-southeast-1}"
: "${ECR_REPO:?ECR_REPO is required, for example 123456789012.dkr.ecr.ap-southeast-1.amazonaws.com/gpa-management-backend}"

IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD)}"
ACCOUNT_ID="${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text)}"
REGISTRY="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

echo "Building backend image: gpa-backend:${IMAGE_TAG}"
docker build -t "gpa-backend:${IMAGE_TAG}" source/backend

echo "Logging in to ECR: ${REGISTRY}"
aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin "${REGISTRY}"

echo "Tagging image: ${ECR_REPO}:${IMAGE_TAG}"
docker tag "gpa-backend:${IMAGE_TAG}" "${ECR_REPO}:${IMAGE_TAG}"

echo "Pushing image: ${ECR_REPO}:${IMAGE_TAG}"
docker push "${ECR_REPO}:${IMAGE_TAG}"

echo "Backend image pushed: ${ECR_REPO}:${IMAGE_TAG}"
