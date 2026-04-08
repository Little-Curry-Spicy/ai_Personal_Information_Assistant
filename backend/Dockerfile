# NestJS 生产镜像
FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9 --activate
COPY package.json ./
RUN pnpm install

FROM deps AS build
COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN pnpm run build

FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@9 --activate
COPY package.json ./
RUN pnpm install --prod
COPY --from=build /app/dist ./dist
EXPOSE 3001
CMD ["node", "dist/main.js"]
