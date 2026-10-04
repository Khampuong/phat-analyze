# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

# ── Production stage ──────────────────────────────────────────────────────────
# A Node server (not a static file server) is required here: the login/user-management
# API reads and writes the .env-backed user store at runtime, which a static host can't do.
FROM node:20-alpine AS prod

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=80

COPY package.json ./
RUN npm install --omit=dev

COPY server ./server
# The corpus JSON: served only via the authenticated /api/app-data route (server/appData.js),
# never bundled into the client JS that dist/ contains. docker-compose.yml mounts your own
# ./data over this; the copy here is the example corpus used when nothing is mounted.
COPY data ./data
COPY --from=build /app/dist ./dist

EXPOSE 80

CMD ["node", "server/index.js"]
