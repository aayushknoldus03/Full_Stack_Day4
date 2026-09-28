#!/usr/bin/env sh
set -eu

NEXUS_URL="${NEXUS_URL:-http://localhost:8081}"
: "${NEXUS_USERNAME:?Set NEXUS_USERNAME to a Nexus user with repository-admin privileges}"
: "${NEXUS_PASSWORD:?Set NEXUS_PASSWORD in your shell}"

curl --fail --silent --show-error \
  --user "$NEXUS_USERNAME:$NEXUS_PASSWORD" \
  --header 'Content-Type: application/json' \
  --request POST \
  --data '{"name":"maven-releases","online":true,"storage":{"blobStoreName":"default","strictContentTypeValidation":true,"writePolicy":"ALLOW_ONCE"},"maven":{"versionPolicy":"RELEASE","layoutPolicy":"STRICT"}}' \
  "$NEXUS_URL/service/rest/v1/repositories/maven/hosted"

printf '\nCreated hosted Maven release repository at %s/repository/maven-releases/\n' "$NEXUS_URL"