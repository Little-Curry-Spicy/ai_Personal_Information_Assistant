# 构建静态资源 + Nginx 托管，并将 /ai、/knowledge 反代到后端
FROM node:22-alpine AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9 --activate

# 只拷依赖清单：package.json 不变时，下一层会命中缓存，跳过 pnpm install
COPY package.json ./
RUN pnpm install

COPY . .

# Vite 环境变量只影响 build，放在 install 之后，避免改 ARG 把依赖缓存打掉
ARG VITE_API_BASE=
ARG VITE_APP_BASE=/
ARG VITE_RESUME_INGEST_OVERWRITE=
ARG VITE_SHOW_KNOWLEDGE_PANEL=
ENV VITE_API_BASE=$VITE_API_BASE
ENV VITE_APP_BASE=$VITE_APP_BASE
ENV VITE_RESUME_INGEST_OVERWRITE=$VITE_RESUME_INGEST_OVERWRITE
ENV VITE_SHOW_KNOWLEDGE_PANEL=$VITE_SHOW_KNOWLEDGE_PANEL

RUN pnpm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
