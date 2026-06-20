#!/usr/bin/env bash
set -euo pipefail

: "${FRONTEND_BUCKET:?FRONTEND_BUCKET is required}"
: "${CLOUDFRONT_DISTRIBUTION_ID:?CLOUDFRONT_DISTRIBUTION_ID is required}"
: "${VITE_API_URL:?VITE_API_URL is required, for example https://staging-api.example.com}"

echo "Building frontend with VITE_API_URL=${VITE_API_URL}"
(
  cd source/frontend
  npm ci
  VITE_API_URL="${VITE_API_URL}" npm run build
)

echo "Syncing frontend dist to s3://${FRONTEND_BUCKET}"
aws s3 sync source/frontend/dist/ "s3://${FRONTEND_BUCKET}/" --delete

echo "Invalidating CloudFront distribution ${CLOUDFRONT_DISTRIBUTION_ID}"
aws cloudfront create-invalidation \
  --distribution-id "${CLOUDFRONT_DISTRIBUTION_ID}" \
  --paths "/*"
