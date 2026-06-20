#!/usr/bin/env bash
set -euo pipefail

: "${API_URL:?API_URL is required, for example https://staging-api.example.com}"

MAX_ATTEMPTS="${MAX_ATTEMPTS:-10}"
WAIT_SECONDS="${WAIT_SECONDS:-6}"

check_url() {
  local path="$1"
  local name="$2"
  local url="${API_URL%/}${path}"

  for attempt in $(seq 1 "${MAX_ATTEMPTS}"); do
    if curl -fsS "${url}" >/dev/null; then
      echo "${name} healthy: ${url}"
      return 0
    fi

    echo "${name} failed (${attempt}/${MAX_ATTEMPTS}): ${url}"
    sleep "${WAIT_SECONDS}"
  done

  echo "${name} failed after ${MAX_ATTEMPTS} attempts: ${url}" >&2
  return 1
}

check_url "/healthz" "healthz"
check_url "/readyz" "readyz"
