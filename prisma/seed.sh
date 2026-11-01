#!/bin/sh
# Runs every seed file in prisma/seed against the configured datasource, one file at a time. Calls the package's
# own prisma, so it runs the same with pnpm and in the container image, whose PATH has no node_modules/.bin.
set -eu
for file in prisma/seed/*.sql; do
  node_modules/.bin/prisma db execute --file "$file"
done
