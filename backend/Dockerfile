# Base stage for Corepack and pnpm configuration
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# Stage 1: Install all dependencies (development + production)
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Stage 2: Build the NestJS application
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build
# Prune node_modules to only production dependencies
RUN rm -rf node_modules && pnpm install --prod --frozen-lockfile

# Stage 3: Production-ready runner stage
FROM base AS runner
ENV NODE_ENV=production

# Run under the non-root 'node' user provided by node:alpine image
USER node

# Copy built artifacts and production dependencies
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json ./package.json

# Expose the application port
EXPOSE 3001

# Command to run the NestJS application
CMD ["node", "dist/main.js"]
