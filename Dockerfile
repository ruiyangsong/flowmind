# syntax=docker/dockerfile:1.6
# ─────────────────────────────────────────────────────────────────────────────
# FlowMind — single-container build
#   stage 1: install deps (pnpm)
#   stage 2: build frontend (Vite) + backend (tsc)
#   stage 3: minimal runtime image (alpine + node 20)
# ─────────────────────────────────────────────────────────────────────────────

ARG NODE_VERSION=20-alpine

# ─── Stage 1: dependencies ──────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS deps
RUN apk add --no-cache python3 make g++ libc6-compat
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml ./
COPY backend/package.json   backend/package.json
COPY frontend/package.json  frontend/package.json
RUN pnpm install --frozen-lockfile=false


# ─── Stage 2: build ─────────────────────────────────────────────────────────
FROM deps AS build
WORKDIR /app
COPY . .
RUN pnpm --filter flowmind-frontend build && \
    pnpm --filter flowmind-backend  build


# ─── Stage 3: runtime ───────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS runtime
RUN apk add --no-cache tini libc6-compat
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    DB_PATH=/data/flowmind.db

# Backend production deps + compiled JS
COPY --from=build /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=build /app/backend/package.json ./backend/package.json
COPY --from=build /app/backend/dist        ./backend/dist
COPY --from=build /app/backend/node_modules ./backend/node_modules

# Frontend build output
COPY --from=build /app/frontend/dist ./frontend/dist

# Volume for SQLite + auto-generated JWT secret
RUN mkdir -p /data
VOLUME ["/data"]

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=4s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT}/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "backend/dist/index.js"]
