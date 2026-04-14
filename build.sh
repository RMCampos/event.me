#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   NO_CACHE=1 ./build.sh          # force no cache
#   CACHE_TO=type=local,dest=./cache ./build.sh
#   CACHE_TO=type=registry,ref=ghcr.io/<user>/repo-cache:buildcache \
#       CACHE_FROM=type=registry,ref=ghcr.io/<user>/repo-cache:buildcache ./build.sh
#
# Requires Docker BuildKit for inline cache export/import. Enable with:
#   export DOCKER_BUILDKIT=1

: "${DOCKER_BUILDKIT:=1}"
export DOCKER_BUILDKIT

NO_CACHE="${NO_CACHE:-0}"
CACHE_TO="${CACHE_TO:-}"
CACHE_FROM="${CACHE_FROM:-}"

# Common build args
BUILD_ARGS=()
if [ "$NO_CACHE" != "1" ] && [ -n "$CACHE_TO" ]; then
  BUILD_ARGS+=(--cache-to "$CACHE_TO")
  if [ -n "$CACHE_FROM" ]; then
    BUILD_ARGS+=(--cache-from "$CACHE_FROM")
  else
    # Try to use the registry image cache by default if TAG exists
    # (useful if you previously pushed a cache image)
    # no-op here; user can set CACHE_FROM explicitly
    :
  fi
fi

# Build production image
docker build "${BUILD_ARGS[@]}" \
  --target production \
  -t ghcr.io/rmcampos/event.me:latest \
  .

# Build migrations image (separate tag)
docker build "${BUILD_ARGS[@]}" \
  --target migrations \
  -t ghcr.io/rmcampos/event.me:latest-migrations \
  .

