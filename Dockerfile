FROM node:20-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN pnpm add -g @nestjs/cli

FROM base AS build
ARG BUILD_CONTEXT

WORKDIR /app

# Copy root manifests and base tsconfig
# include pnpm workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.json ./

# Copy all packages and apps
COPY packages ./packages
COPY apps ./apps

# Install pnpm and workspace dependencies
RUN pnpm add -g langium-cli

# Build core packages first (langium-core, toolbox-api), then the requested app
RUN pnpm build:packages

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Build the specified workspace (app)
RUN pnpm --filter ./apps/$BUILD_CONTEXT... run build

FROM base AS runtime
ARG BUILD_CONTEXT

WORKDIR /app

COPY --from=build /app/packages/toolbox-api ./packages/toolbox-api
COPY --from=build /app/packages/langium-core ./packages/langium-core

# Copy build output into the app folder
COPY --from=build /app/apps/$BUILD_CONTEXT/dist ./apps/$BUILD_CONTEXT/dist

# Copy the app package manifest and app-level tsconfig into the app folder
COPY --from=build /app/apps/$BUILD_CONTEXT/package.json ./apps/$BUILD_CONTEXT/package.json
COPY --from=build /app/apps/$BUILD_CONTEXT/tsconfig.json ./apps/$BUILD_CONTEXT/tsconfig.json
COPY --from=build /app/apps/$BUILD_CONTEXT/node_modules ./apps/$BUILD_CONTEXT/node_modules

# Copy node_modules from the build stage
COPY --from=build /app/node_modules ./node_modules

# Copy the repository root tsconfig to /app/tsconfig.json so app tsconfig's extends "../../tsconfig.json" resolves
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY --from=build /app/package.json ./package.json

# Copy installed node_modules from the build stage into /app so workspace-relative imports resolve

RUN pnpm add -g vite

ENV NODE_ENV=production

CMD ["pnpm", "start"]
