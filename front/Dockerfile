# 构建静态资源 + Nginx 托管，并将 /ai、/knowledge 反代到后端
FROM node:22-alpine AS build
WORKDIR /app

ARG VITE_API_BASE=
ARG VITE_APP_BASE=/
ARG VITE_RESUME_INGEST_OVERWRITE=
ARG VITE_SHOW_KNOWLEDGE_PANEL=
ENV VITE_API_BASE=$VITE_API_BASE
ENV VITE_APP_BASE=$VITE_APP_BASE
ENV VITE_RESUME_INGEST_OVERWRITE=$VITE_RESUME_INGEST_OVERWRITE
ENV VITE_SHOW_KNOWLEDGE_PANEL=$VITE_SHOW_KNOWLEDGE_PANEL

RUN corepack enable && corepack prepare pnpm@9 --activate
COPY package.json ./
RUN pnpm install
COPY . .
RUN pnpm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
