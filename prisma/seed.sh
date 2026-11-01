#!/bin/sh
# Runs every seed file in prisma/seed against the configured datasource, one file at a time.
set -eu
for file in prisma/seed/*.sql; do
  prisma db execute --file "$file"
done
