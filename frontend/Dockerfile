# syntax=docker/dockerfile:1
# ── aras-fullstack-template: Frontend Dockerfile ──────────────────────────────
#
# OPTIMIZATION NOTES (read before modifying):
#
#   1. Alpine base (~150MB vs ~900MB for full node image)
#      node:20-alpine gives us a full Node.js runtime in a tiny image.
#
#   2. npm ci with npm install fallback
#      `npm ci` installs the exact versions pinned in package-lock.json.
#      Faster, stricter, and reproducible across all machines. If no lockfile
#      exists (first-time setup), falls back to `npm install` to generate one.
#
#   3. Layer cache for node_modules
#      package.json and package-lock.json are copied first and npm ci is run
#      before copying source. The node_modules layer is only rebuilt when
#      package files change — not on every code change.
#
#   4. Anonymous volume for node_modules (dev)
#      docker-compose mounts ./frontend:/app, which would normally overwrite
#      the container's node_modules with the host's (often empty on Windows/Mac).
#      The anonymous volume /app/node_modules shadows the bind mount at that
#      path, preserving the container's compiled node_modules.
#
#   5. WATCHPACK_POLLING / CHOKIDAR_USEPOLLING (dev)
#      Vite uses inotify for file watching, which doesn't work across the
#      Docker VM boundary on Windows and macOS. Polling mode enables HMR
#      (Hot Module Replacement) to work correctly in these environments.
#
#   6. Multi-stage: dev → builder → production (nginx:alpine)
#      The production stage is nginx:alpine (~25MB) serving pre-built static
#      files. There is NO Node.js runtime in production — just compiled HTML,
#      CSS, and JS. This is the smallest possible production image.
#
#   7. nginx-spa.conf for SPA routing
#      React Router uses client-side routing. Without SPA config, refreshing
#      any page other than "/" returns 404. try_files $uri /index.html fixes this.
#
# Usage:
#   Dev (via docker compose):   docker compose up
#   Prod (via docker compose):  docker compose -f docker-compose.prod.yml up -d
#   Manual build (prod):        docker build --target production -t kpdn-frontend .
# ─────────────────────────────────────────────────────────────────────────────

# ── DEVELOPMENT — hot reload with Vite HMR ────────────────────────────────────
FROM node:20-alpine AS development

WORKDIR /app

# Copy package files first (layer cache — node_modules only rebuild on dep changes)
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Source is bind-mounted at runtime — no COPY needed here.
# See WATCHPACK_POLLING note above regarding file watching.
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ── BUILDER — compile static assets ───────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .
RUN npm run build
# Output: /app/dist (Vite default build directory)

# ── PRODUCTION — nginx serving pre-built static files ─────────────────────────
FROM nginx:alpine AS production

# Copy compiled static assets from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# SPA routing config — handles React Router client-side navigation
# Without this, refreshing /some/deep/route returns nginx 404
COPY nginx-spa.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
