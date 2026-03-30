# syntax=docker/dockerfile:1

FROM node:18-alpine AS base
WORKDIR /app

# Install workspace dependencies
COPY package*.json ./
COPY server/package*.json server/
COPY shared/package*.json shared/
COPY frontend/package*.json frontend/
RUN npm install

# Copy source workspaces required by the API
COPY shared ./shared
COPY server ./server

# Build shared utilities first so they are available for the API build
RUN npm run build --workspace @wms/shared
# Compile the API to JavaScript output
RUN npm run build --workspace @wms/server
# Copy non-TypeScript assets that the API needs at runtime
RUN mkdir -p server/dist/src/docs && cp server/src/docs/openapi.yaml server/dist/src/docs/openapi.yaml
# Copy server static assets (e.g., fonts for PDFKIT)
RUN mkdir -p server/dist/src/assets && cp -r server/src/assets/* server/dist/src/assets/
# Strip dev dependencies for the runtime image
RUN npm prune --omit=dev

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=base /app/package.json ./package.json
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/shared/package.json ./shared/package.json
COPY --from=base /app/shared/dist ./shared/dist
COPY --from=base /app/server/package.json ./server/package.json
COPY --from=base /app/server/dist ./server/dist

EXPOSE 4000
CMD ["node", "server/dist/src/index.js"]

