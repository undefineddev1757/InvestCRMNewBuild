FROM node:20-slim AS base

# Install dependencies only when needed
FROM base AS deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments for NEXT_PUBLIC_* variables (needed at build time)
ARG NEXT_PUBLIC_POLYGON_API_KEY
ENV NEXT_PUBLIC_POLYGON_API_KEY=${NEXT_PUBLIC_POLYGON_API_KEY}

# Generate Prisma Client
RUN npx prisma generate

# Build the application
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 --gid nodejs --shell /bin/bash --create-home nextjs

# Настраиваем npm cache в /app/.npm для избежания проблем с правами
RUN mkdir -p /app/.npm && chown -R nextjs:nodejs /app/.npm
ENV npm_config_cache=/app/.npm

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/.bin ./node_modules/.bin
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
# Copy required runtime dependencies
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --from=builder /app/node_modules/jsonwebtoken ./node_modules/jsonwebtoken
COPY --from=builder /app/node_modules/@types ./node_modules/@types

# Set correct permissions
RUN chown -R nextjs:nodejs /app
RUN chown -R nextjs:nodejs /home/nextjs

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]

