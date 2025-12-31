FROM node:24-alpine AS build
ARG BUILD_CONTEXT

WORKDIR /app

# Copy root manifests and base tsconfig
COPY package.json yarn.lock tsconfig.json ./

# Copy all packages and apps
COPY packages ./packages
COPY apps ./apps

# Install all dependencies for monorepo
RUN yarn install
RUN npm install -g @nestjs/cli

# Build the specified workspace
RUN yarn workspace "$BUILD_CONTEXT" build

FROM node:24-alpine AS runtime
ARG BUILD_CONTEXT

# Set the working directory to the same relative location as the app in the source tree
WORKDIR /app/apps/$BUILD_CONTEXT

# Copy build output into the app folder
COPY --from=build /app/apps/$BUILD_CONTEXT/dist ./dist

# Copy the app package manifest and app-level tsconfig into the app folder
COPY --from=build /app/apps/$BUILD_CONTEXT/package.json ./package.json
COPY --from=build /app/apps/$BUILD_CONTEXT/tsconfig.json ./tsconfig.json
COPY --from=build /app/apps/$BUILD_CONTEXT/node_modules ./node_modules

# Copy the repository root tsconfig to /app/tsconfig.json so app tsconfig's extends "../../tsconfig.json" resolves
COPY --from=build /app/tsconfig.json /app/tsconfig.json

# Copy installed node_modules from the build stage into /app so workspace-relative imports resolve
COPY --from=build /app/node_modules /app/node_modules

RUN npm install -g @nestjs/cli vite

ENV NODE_ENV=production

CMD ["yarn", "start"]
