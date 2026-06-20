#!/usr/bin/env bash
set -euo pipefail

: "${ENVIRONMENT:?ENVIRONMENT is required: staging or prod}"
: "${ECR_REPO:?ECR_REPO is required}"
: "${IMAGE_TAG:?IMAGE_TAG is required}"
: "${AWS_ACCOUNT_ID:?AWS_ACCOUNT_ID is required}"
: "${DOMAIN_NAME:?DOMAIN_NAME is required}"
: "${UPLOAD_BUCKET:?UPLOAD_BUCKET is required}"
: "${UPLOAD_ASSETS_DOMAIN:?UPLOAD_ASSETS_DOMAIN is required}"

case "${ENVIRONMENT}" in
  staging)
    NAMESPACE="gpa-staging"
    K8S_DIR="k8s/staging"
    API_HOST="staging-api.${DOMAIN_NAME}"
    APP_HOST="staging-app.${DOMAIN_NAME}"
    ;;
  prod|production)
    NAMESPACE="gpa-prod"
    K8S_DIR="k8s/prod"
    API_HOST="api.${DOMAIN_NAME}"
    APP_HOST="app.${DOMAIN_NAME}"
    ;;
  *)
    echo "ENVIRONMENT must be staging or prod" >&2
    exit 1
    ;;
esac

RENDER_DIR="$(mktemp -d)"
trap 'rm -rf "${RENDER_DIR}"' EXIT

cp -R "${K8S_DIR}/." "${RENDER_DIR}/"

find "${RENDER_DIR}" -type f -name '*.yaml' -print0 | while IFS= read -r -d '' file; do
  sed -i \
    -e "s|<AWS_ACCOUNT_ID>|${AWS_ACCOUNT_ID}|g" \
    -e "s|<GIT_SHA>|${IMAGE_TAG}|g" \
    -e "s|<RELEASE_TAG>|${IMAGE_TAG}|g" \
    -e "s|api.<your-domain>|${API_HOST}|g" \
    -e "s|app.<your-domain>|${APP_HOST}|g" \
    -e "s|<your-domain>|${DOMAIN_NAME}|g" \
    -e "s|<upload-bucket-name>|${UPLOAD_BUCKET}|g" \
    -e "s|<prod-upload-bucket-name>|${UPLOAD_BUCKET}|g" \
    -e "s|https://<upload-assets-domain>|${UPLOAD_ASSETS_DOMAIN}|g" \
    -e "s|https://<prod-upload-assets-domain>|${UPLOAD_ASSETS_DOMAIN}|g" \
    "${file}"
done

echo "Applying base manifests for ${ENVIRONMENT}"
kubectl apply -f "${RENDER_DIR}/namespace.yaml"
kubectl apply -f "${RENDER_DIR}/configmap.yaml"
kubectl apply -f "${RENDER_DIR}/serviceaccount.yaml"
kubectl apply -f "${RENDER_DIR}/backend-service.yaml"

echo "Applying workload manifests for ${ENVIRONMENT}"
kubectl apply -f "${RENDER_DIR}/backend-deployment.yaml"
kubectl apply -f "${RENDER_DIR}/worker-deployment.yaml"

echo "Updating backend and worker image to ${ECR_REPO}:${IMAGE_TAG}"
kubectl set image "deployment/gpa-backend" "gpa-backend=${ECR_REPO}:${IMAGE_TAG}" -n "${NAMESPACE}"
kubectl set image "deployment/gpa-worker" "gpa-worker=${ECR_REPO}:${IMAGE_TAG}" -n "${NAMESPACE}"

echo "Applying Gateway API and autoscaling manifests"
kubectl apply -f "k8s/staging/gatewayclass.yaml"
kubectl apply -f "${RENDER_DIR}/loadbalancerconfiguration.yaml"
kubectl apply -f "${RENDER_DIR}/gateway.yaml"
kubectl apply -f "${RENDER_DIR}/httproute.yaml"
kubectl apply -f "${RENDER_DIR}/hpa-backend.yaml"
kubectl apply -f "${RENDER_DIR}/pdb.yaml"

echo "Waiting for backend rollout in ${NAMESPACE}"
kubectl rollout status "deployment/gpa-backend" -n "${NAMESPACE}" --timeout=180s

echo "Waiting for worker rollout in ${NAMESPACE}"
kubectl rollout status "deployment/gpa-worker" -n "${NAMESPACE}" --timeout=180s
