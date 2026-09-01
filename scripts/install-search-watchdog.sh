#!/usr/bin/env bash
set -euo pipefail

if [ "${EUID}" -ne 0 ]; then
  echo "Run this installer with sudo."
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required before installing the watchdog."
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required before installing the watchdog."
  exit 1
fi

install -m 0755   "$REPO_ROOT/scripts/search-stack-watchdog.sh"   /usr/local/sbin/before-you-trust-search-watchdog

install -m 0644   "$REPO_ROOT/ops/systemd/before-you-trust-search-watchdog.service"   /etc/systemd/system/before-you-trust-search-watchdog.service

install -m 0644   "$REPO_ROOT/ops/systemd/before-you-trust-search-watchdog.timer"   /etc/systemd/system/before-you-trust-search-watchdog.timer

systemctl daemon-reload
systemctl enable docker
systemctl enable --now before-you-trust-search-watchdog.timer
systemctl start before-you-trust-search-watchdog.service

echo
echo "Installed. Current status:"
systemctl --no-pager --full status before-you-trust-search-watchdog.timer || true
echo
systemctl --no-pager --full status before-you-trust-search-watchdog.service || true
