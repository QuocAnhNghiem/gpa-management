#!/usr/bin/env bash
set -euo pipefail

: "${ENVIRONMENT:?ENVIRONMENT is required: staging or prod}"

case "${ENVIRONMENT}" in
  staging)
    NAMESPACE="gpa-staging"
    API_URL="${API_URL:-https://staging-api.${DOMAIN_NAME:-nghiemquocanh.me}}"
    ;;
  prod|production)
    NAMESPACE="gpa-prod"
    API_URL="${API_URL:-https://api.${DOMAIN_NAME:-nghiemquocanh.me}}"
    ;;
  *)
    echo "ENVIRONMENT must be staging or prod" >&2
    exit 1
    ;;
esac

echo "Environment: ${ENVIRONMENT}"
echo "Namespace: ${NAMESPACE}"
echo "API URL: ${API_URL}"
echo

echo "Current images"
kubectl get deployment gpa-backend gpa-worker -n "${NAMESPACE}" \
  -o custom-columns='NAME:.metadata.name,IMAGE:.spec.template.spec.containers[0].image'
echo

echo "Backend rollout history"
kubectl rollout history deployment/gpa-backend -n "${NAMESPACE}"
echo

echo "Worker rollout history"
kubectl rollout history deployment/gpa-worker -n "${NAMESPACE}"
echo

echo "Current pods"
kubectl get pods -n "${NAMESPACE}" -o wide

