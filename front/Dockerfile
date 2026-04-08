# 构建静态资源 + Nginx 托管，并将 /ai、/knowledge 反代到后端
FROM node:22-alpine AS build
WORKDIR /app

ARG VITE_CLERK_PUBLISHABLE_KEY=
ARG VITE_CLERK_ENABLED=
ARG VITE_API_BASE=
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_CLERK_ENABLED=$VITE_CLERK_ENABLED
ENV VITE_API_BASE=$VITE_API_BASE

RUN corepack enable && corepack prepare pnpm@9 --activate
COPY package.json ./
RUN pnpm install
COPY . .
RUN pnpm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
