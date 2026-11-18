#!/bin/sh
# Deploys one image tag on the host: pull it, create the database if it is empty (prisma/deploy.ts), then restart and
# wait for /health. Usage: ./deploy.sh [tag]   (default main; a sha-<commit> rolls back or pins)
set -eu
cd "$(dirname "$0")"
export TAG="${1:-main}"
docker compose pull app
docker compose run --rm --no-deps app node prisma/deploy.ts
docker compose up -d
for attempt in $(seq 30); do
  if [ "$(docker inspect -f '{{.State.Health.Status}}' "$(docker compose ps -q app)")" = healthy ]; then
    echo "deployed $TAG"
    exit 0
  fi
  sleep 2
done
docker compose logs --tail 100 app
exit 1
