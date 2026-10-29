# Built here or in CI; the server only pulls and runs the image.
FROM node:26-slim AS build
WORKDIR /app
RUN npm install -g pnpm@12.3.4
# prisma.config.ts reads DATABASE_URL; generate does not connect.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml prisma.config.ts openapi.yaml ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN pnpm build && pnpm prune --prod --ignore-scripts

FROM node:26-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/prisma.config.ts /app/openapi.yaml ./
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
