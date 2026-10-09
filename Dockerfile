# =========================================================
# Stage 1 — build
# =========================================================
FROM node:24-bookworm-slim AS build

WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma

RUN npm ci

COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
COPY data ./data

RUN npx prisma generate \
 && npm run build

# =========================================================
# Stage 2 — runtime
# =========================================================
FROM node:24-bookworm-slim AS runtime

WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PORT=8080

COPY package.json package-lock.json ./
COPY prisma ./prisma

# prisma CLI is needed at runtime so the CI workflow can run
# `npx prisma migrate deploy` against the deployed image.
RUN npm ci --omit=dev \
 && npm install prisma@4.16.2 --no-save --no-package-lock \
 && npx prisma generate

COPY --from=build /app/dist ./dist
COPY storage ./storage

EXPOSE 8080

CMD ["node", "dist/modules/server.js"]