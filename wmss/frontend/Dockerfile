# syntax=docker/dockerfile:1

FROM node:20-alpine AS build
WORKDIR /app

# Install workspace dependencies
COPY package*.json ./
COPY frontend/package*.json frontend/
COPY shared/package*.json shared/
COPY server/package*.json server/
RUN npm install

# Copy source workspaces required by the frontend
COPY shared ./shared
COPY frontend ./frontend

# Build shared utilities first
RUN npm run build --workspace @wms/shared

# Build frontend
RUN npm run build --workspace frontend

FROM nginx:alpine AS runner
WORKDIR /usr/share/nginx/html

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist ./

EXPOSE 5173

CMD ["nginx", "-g", "daemon off;"]
