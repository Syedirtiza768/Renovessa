FROM node:22-bookworm-slim AS base
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm install --ignore-scripts
RUN for i in 1 2 3 4 5; do npx prisma generate && break || sleep 15; done

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build?schema=public
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=7090
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs --create-home nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY package.json package-lock.json ./
COPY docker-entrypoint.sh ./

# Install full Prisma CLI tree (do NOT copy prisma/@prisma alone — misses "effect")
RUN npm install --omit=dev --no-save prisma bcryptjs && \
    npm install --no-save --include=dev tsx && \
    sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh && \
    chown -R nextjs:nodejs /app/node_modules /app/prisma docker-entrypoint.sh

USER nextjs
EXPOSE 7090
ENTRYPOINT ["./docker-entrypoint.sh"]
