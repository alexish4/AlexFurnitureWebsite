#!/bin/bash
set -euo pipefail

project_dir="$(cd "$(dirname "$0")/.." && pwd)"
cd "$project_dir"

if [[ ! -f .env.production.local ]]; then
  echo "Missing .env.production.local. Copy the example file and set a strong ADMIN_PASSWORD."
  exit 1
fi

export SELF_HOSTED=true
exec ./node_modules/.bin/vinext start --hostname 127.0.0.1 --port "${PORT:-8787}"
