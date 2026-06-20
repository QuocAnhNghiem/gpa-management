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
    if [[ "${CONFIRM_PRODUCTION_ROLLBACK:-}" != "I_UNDERSTAND" ]]; then
      echo "Production rollback is guarded." >&2
      echo "Re-run with CONFIRM_PRODUCTION_ROLLBACK=I_UNDERSTAND after checking impact." >&2
      exit 1
    fi
    ;;
  *)
    echo "ENVIRONMENT must be staging or prod" >&2
    exit 1
    ;;
esac

if [[ -n "${IMAGE_TAG:-}" && -z "${ECR_REPO:-}" ]]; then
  echo "ECR_REPO is required when IMAGE_TAG is provided" >&2
  exit 1
fi

echo "Environment: ${ENVIRONMENT}"
echo "Namespace: ${NAMESPACE}"
echo "API URL: ${API_URL}"
echo

echo "Images before rollback"
kubectl get deployment gpa-backend gpa-worker -n "${NAMESPACE}" \
  -o custom-columns='NAME:.metadata.name,IMAGE:.spec.template.spec.containers[0].image'
echo

if [[ -n "${IMAGE_TAG:-}" ]]; then
  echo "Rolling back by setting explicit image tag: ${ECR_REPO}:${IMAGE_TAG}"
  kubectl set image deployment/gpa-backend "gpa-backend=${ECR_REPO}:${IMAGE_TAG}" -n "${NAMESPACE}"
  kubectl set image deployment/gpa-worker "gpa-worker=${ECR_REPO}:${IMAGE_TAG}" -n "${NAMESPACE}"
else
  echo "Rolling back to previous Kubernetes rollout revision"
  kubectl rollout undo deployment/gpa-backend -n "${NAMESPACE}"
  kubectl rollout undo deployment/gpa-worker -n "${NAMESPACE}"
fi

echo "Waiting for backend rollback rollout"
kubectl rollout status deployment/gpa-backend -n "${NAMESPACE}" --timeout="${ROLLOUT_TIMEOUT:-240s}"

echo "Waiting for worker rollback rollout"
kubectl rollout status deployment/gpa-worker -n "${NAMESPACE}" --timeout="${ROLLOUT_TIMEOUT:-240s}"

echo "Images after rollback"
kubectl get deployment gpa-backend gpa-worker -n "${NAMESPACE}" \
  -o custom-columns='NAME:.metadata.name,IMAGE:.spec.template.spec.containers[0].image'
echo

if [[ "${SKIP_SMOKE_TEST:-false}" != "true" ]]; then
  API_URL="${API_URL}" scripts/deploy/smoke-test.sh
fi
