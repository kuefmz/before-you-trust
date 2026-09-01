#!/usr/bin/env bash
set -euo pipefail

log() {
  logger -t before-you-trust-search-watchdog "$*"
  echo "$*"
}

ensure_docker() {
  if ! systemctl is-active --quiet docker; then
    log "Docker is not active; restarting Docker."
    systemctl restart docker
    sleep 5
  fi
}

ensure_container() {
  local service="$1"
  local name="$2"

  if ! docker inspect "$name" >/dev/null 2>&1; then
    if [ -n "${BYT_COMPOSE_FILE:-}" ] && [ -f "$BYT_COMPOSE_FILE" ]; then
      log "Container $name is missing; recreating $service from Docker Compose."
      docker compose -f "$BYT_COMPOSE_FILE" up -d "$service"
      sleep 12
    else
      log "Container $name does not exist and BYT_COMPOSE_FILE is unavailable."
      return 1
    fi
  fi

  if [ "$(docker inspect -f '{{.State.Running}}' "$name" 2>/dev/null || echo false)" != "true" ]; then
    log "Container $name is stopped; starting it."
    docker start "$name" >/dev/null
    sleep 8
  fi
}

endpoint_ok() {
  local url="$1"
  curl --fail --silent --show-error --max-time 8 "$url" >/dev/null
}

recover_service() {
  local service="$1"
  local name="$2"
  local url="$3"

  ensure_container "$service" "$name" || return 1

  if endpoint_ok "$url"; then
    return 0
  fi

  sleep 3
  if endpoint_ok "$url"; then
    return 0
  fi

  log "$name is running but its health endpoint is unavailable; restarting container."
  docker restart "$name" >/dev/null
  sleep 12

  if endpoint_ok "$url"; then
    log "$name recovered successfully."
    return 0
  fi

  log "$name is still unhealthy after restart."
  return 1
}

main() {
  ensure_docker

  local failed=0

  recover_service     "searxng"     "before-you-trust-searxng"     "http://127.0.0.1:8888/" || failed=1

  recover_service     "yacy"     "before-you-trust-yacy"     "http://127.0.0.1:8090/" || failed=1

  exit "$failed"
}

main "$@"
