# syntax=docker/dockerfile:1

# ---- Build stage: same toolchain as CI (Node 22 + pnpm from packageManager) ----
# Static output, so build once on the runner's native platform even for multi-arch images.
FROM --platform=$BUILDPLATFORM node:22-alpine AS build
WORKDIR /app
RUN corepack enable

# Install dependencies first so this layer is cached until the lockfile changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# The app calls the profile API on its own origin (/api); nginx forwards it to API_UPSTREAM.
# Same-origin requests avoid CORS, so the inventory scan works on any domain or IP.
ENV VITE_API_TARGET=/api
RUN pnpm run build

# Turn Cloudflare's dist/_redirects ("/from /to 301") into nginx locations.
RUN awk '!/^#/ && NF >= 2 { printf "location = %s { return %s %s; }\n", $1, ($3 ? $3 : 301), $2 }' \
      dist/_redirects > /app/redirects.conf \
 && rm dist/_redirects

# ---- Runtime stage: static files served by nginx ----
FROM nginx:1.27-alpine

# Backend for the inventory scan. Override at runtime with -e API_UPSTREAM=...
ENV API_UPSTREAM=https://api.skyshards.com

# The nginx image runs envsubst on /etc/nginx/templates/*.template at startup,
# writing the result to /etc/nginx/conf.d/ (only defined env vars are replaced).
COPY docker/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/redirects.conf /etc/nginx/skyshards-redirects.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/ || exit 1
