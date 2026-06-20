#!/usr/bin/env bash
set -euo pipefail

: "${ENVIRONMENT:?ENVIRONMENT is required: staging or prod}"
: "${AWS_ACCOUNT_ID:?AWS_ACCOUNT_ID is required}"
: "${IMAGE_TAG:?IMAGE_TAG is required}"
: "${DOMAIN_NAME:?DOMAIN_NAME is required}"
: "${UPLOAD_BUCKET:?UPLOAD_BUCKET is required}"
: "${UPLOAD_ASSETS_DOMAIN:?UPLOAD_ASSETS_DOMAIN is required}"

case "${ENVIRONMENT}" in
  staging)
    K8S_DIR="k8s/staging"
    API_HOST="staging-api.${DOMAIN_NAME}"
    APP_HOST="staging-app.${DOMAIN_NAME}"
    ;;
  prod|production)
    K8S_DIR="k8s/prod"
    API_HOST="api.${DOMAIN_NAME}"
    APP_HOST="app.${DOMAIN_NAME}"
    ;;
  *)
    echo "ENVIRONMENT must be staging or prod" >&2
    exit 1
    ;;
esac

echo "Replacing placeholders in ${K8S_DIR}"
find "${K8S_DIR}" -type f -name '*.yaml' -print0 | while IFS= read -r -d '' file; do
  sed -i \
    -e "s|<AWS_ACCOUNT_ID>|${AWS_ACCOUNT_ID}|g" \
    -e "s|<GIT_SHA>|${IMAGE_TAG}|g" \
    -e "s|<RELEASE_TAG>|${IMAGE_TAG}|g" \
    -e "s|<your-domain>|${DOMAIN_NAME}|g" \
    -e "s|api.${DOMAIN_NAME}|${API_HOST}|g" \
    -e "s|app.${DOMAIN_NAME}|${APP_HOST}|g" \
    -e "s|<upload-bucket-name>|${UPLOAD_BUCKET}|g" \
    -e "s|<prod-upload-bucket-name>|${UPLOAD_BUCKET}|g" \
    -e "s|https://<upload-assets-domain>|${UPLOAD_ASSETS_DOMAIN}|g" \
    -e "s|https://<prod-upload-assets-domain>|${UPLOAD_ASSETS_DOMAIN}|g" \
    "${file}"
done
