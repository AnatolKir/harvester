# syntax=docker/dockerfile:1.4

# Build arguments
ARG NODE_VERSION=20.18.1
ARG ALPINE_VERSION=3.20

# ===========================
# Stage 1: Dependencies
# ===========================
FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS dependencies

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++ 

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production && \
    # Clean npm cache
    npm cache clean --force

# ===========================
# Stage 2: Builder
# ===========================
FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev)
RUN npm ci && \
    npm cache clean --force

# Copy source code
COPY src ./src

# Build the application
RUN npm run build

# ===========================
# Stage 3: Production
# ===========================
FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS production

# Add metadata
LABEL maintainer="MCP Gateway Team"
LABEL version="1.0.1"
LABEL description="MCP Gateway server with Inngest integration for job scheduling"

# Install runtime dependencies only
RUN apk add --no-cache \
    # Health check dependency
    curl \
    # Security updates
    && apk upgrade --no-cache \
    # Clean apk cache
    && rm -rf /var/cache/apk/*

# Create non-root user and group
RUN addgroup -g 1001 -S nodejs && \
    adduser -S mcpgateway -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy production dependencies from dependencies stage
COPY --from=dependencies --chown=mcpgateway:nodejs /app/node_modules ./node_modules

# Copy built application from builder stage
COPY --from=builder --chown=mcpgateway:nodejs /app/dist ./dist

# Copy package files for version info
COPY --chown=mcpgateway:nodejs package*.json ./

# Create logs directory with proper permissions
RUN mkdir -p /app/logs && \
    chown -R mcpgateway:nodejs /app/logs

# Security: Set proper file permissions
RUN chmod -R 755 /app && \
    chmod -R 770 /app/logs && \
    chmod -R 755 /app/dist && \
    chmod -R 755 /app/node_modules

# Switch to non-root user
USER mcpgateway

# Expose port (informational)
EXPOSE 3333

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3333/health || exit 1

# Set Node.js production environment
ENV NODE_ENV=production

# Disable Node.js deprecation warnings in production
ENV NODE_NO_WARNINGS=1

# Set memory limits for Node.js
ENV NODE_OPTIONS="--max-old-space-size=512"

# Start the application
ENTRYPOINT ["node"]
CMD ["dist/index.js"]

# (Development stage removed to ensure production image is built by default)