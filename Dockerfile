FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app/frontend

COPY package.json .pnp.cjs .pnp.loader.mjs ./
RUN npm install -f
COPY . .
RUN VITE_API_URL=__VITE_API_URL__ \
    VITE_API_VERSION=__VITE_API_VERSION__ \
    VITE_ADMIN_EMAIL=__VITE_ADMIN_EMAIL__ \
    VITE_GOOGLE_PROJECT_ID=__VITE_GOOGLE_PROJECT_ID__ \
    VITE_GOOGLE_CLIENT_ID=__VITE_GOOGLE_CLIENT_ID__ \
    VITE_GOOGLE_REDIRECT_URI=__VITE_GOOGLE_REDIRECT_URI__ \
    VITE_IS_SERVICE_ACCOUNT=__VITE_IS_SERVICE_ACCOUNT__ \
    npm run build

# EXPOSE 80

# ---------- 2. Build backend and copy frontend build ----------
FROM node:20-alpine AS backend

WORKDIR /app

# Copy backend files
COPY backend/package.json ./
RUN npm install

COPY backend/ ./

# Copy the built React files from previous stage
COPY --from=builder /app/frontend/dist ./dist

# Expose the server port
EXPOSE 8080

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
# Start the server
CMD ["/entrypoint.sh"]
