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

# Build the specified workspace
RUN yarn workspace "$BUILD_CONTEXT" build

FROM node:24-alpine AS runtime
ARG BUILD_CONTEXT
WORKDIR /app

# Copy build output
COPY --from=build /app/apps/$BUILD_CONTEXT/dist ./dist

EXPOSE 80
CMD ["yarn", "start", "--prod"]
