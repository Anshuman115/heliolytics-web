FROM node:24.22.0-alpine3.24@sha256:44fce696f38ba8c987c4db89954051000bbd05ffd8d8659ba15ed4a8602e937f AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24.22.0-alpine3.24@sha256:44fce696f38ba8c987c4db89954051000bbd05ffd8d8659ba15ed4a8602e937f AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24.22.0-alpine3.24@sha256:44fce696f38ba8c987c4db89954051000bbd05ffd8d8659ba15ed4a8602e937f AS run
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV TMPDIR=/tmp
ARG GIT_SHA
ARG BUILD_TIME
LABEL org.opencontainers.image.revision=$GIT_SHA
LABEL org.opencontainers.image.created=$BUILD_TIME
COPY --chown=node:node --from=build /app/public ./public
COPY --chown=node:node --from=build /app/.next/standalone ./
COPY --chown=node:node --from=build /app/.next/static ./.next/static
COPY --chown=node:node --from=build /app/scripts/validate-runtime.mjs ./scripts/validate-runtime.mjs
COPY --chown=node:node --from=build /app/lib/auth/runtime_config.mjs ./lib/auth/runtime_config.mjs
RUN mkdir -p /app/.next/cache && chown node:node /app/.next/cache
USER node
EXPOSE 3000
CMD ["node","--import","./scripts/validate-runtime.mjs","server.js"]
