## TSK 信息助手（前后端一体）

这是一个“个人信息问答 + 知识库检索”的项目，包含：

- `front`：前端聊天界面（React + Vite + TypeScript）
- `backend`：后端 API（NestJS + LangChain + Qdrant）

核心能力：

- 对话问答：`/ai/chat`
- 个人知识库入库：上传简历文件、同步 GitHub 公开仓库
- RAG 检索：对入库内容做语义检索后再回答
- 访问保护：可通过 API Key 保护后端接口

---

## 1. 项目结构

```text
.
├── backend/      # NestJS 后端
├── front/        # React 前端
└── README.md
```

---

## 2. 技术栈

### 前端（`front`）

- React 19
- Vite 8
- TypeScript
- `@ai-sdk/react`（聊天流式 UI）
- TailwindCSS（已安装）

### 后端（`backend`）

- NestJS 11
- LangChain + OpenAI 兼容模型接口
- Qdrant（向量库）
- `mammoth` / `pdf-parse`（文件解析）

---

## 3. 快速开始

> 建议 Node.js >= 20，包管理器使用 `pnpm`。

### 3.1 安装依赖

```bash
pnpm --dir backend install
pnpm --dir front install
```

### 3.2 配置环境变量

在 `backend/.env` 中配置（示例）：

```env
# LLM
MODEL_NAME=qwen-plus
OPENAI_API_KEY=your_api_key
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1

# Web Search
BOCHA_API_KEY=your_bocha_key

# Qdrant
QDRANT_URL=https://your-qdrant-url
QDRANT_API_KEY=your-qdrant-api-key
QDRANT_COLLECTION=personal_intro
EMBEDDING_MODEL=text-embedding-v4
EMBEDDING_DIMENSIONS=1024

# Optional: API 访问保护
FRIEND_API_KEY=your_secure_random_key

# Optional: 提高 GitHub API 限额
GITHUB_TOKEN=your_github_token
GITHUB_USER_AGENT=agui-backend
```

前端通过环境变量 `VITE_API_BASE` 指定后端根地址；未设置时使用相对路径（适合 Vite 开发代理或 Docker 下同源 Nginx 反代）。本地若直连后端可设 `VITE_API_BASE=http://localhost:3001`。

### 3.3 启动服务

启动后端：

```bash
pnpm --dir backend start:dev
```

启动前端：

```bash
pnpm --dir front dev
```

默认访问：

- 前端：`http://localhost:5173`
- 后端：`http://localhost:3001`

---

## 4. 后端接口说明

后端主要提供两类接口：聊天、知识库管理。

### 4.1 聊天接口

#### `POST /ai/chat`

- 说明：流式聊天接口
- 鉴权：当配置 `FRIEND_API_KEY` 时，必须携带以下任一请求头  
  - `Authorization: Bearer <FRIEND_API_KEY>`
  - `X-Friend-Api-Key: <FRIEND_API_KEY>`

请求体示例：

```json
{
  "messages": [
    {
      "id": "u1",
      "role": "user",
      "parts": [{ "type": "text", "text": "你好，介绍一下你自己" }]
    }
  ]
}
```

### 4.2 知识库接口

#### `POST /knowledge/ingest/file`

- 说明：上传文件并入库（支持 `txt/pdf/docx`）
- 方式：`multipart/form-data`，字段名必须是 `file`
- 可选 query：
  - `replace=1`（默认）：先删除同名旧数据，再写入新数据
  - `replace=0`：不删除旧数据，直接追加

curl 示例：

```bash
curl -X POST "http://localhost:3001/knowledge/ingest/file?replace=1" \
  -F "file=@./resume.pdf"
```

返回重点字段：

- `chunksIndexed`：新增分块数量
- `deletedChunks`：覆盖模式下删除的旧分块数
- `qualityReport`：入库质量检查结果

#### `POST /knowledge/ingest/github`

- 说明：拉取 GitHub 用户公开仓库内容（含 README）并入库

请求体示例：

```json
{
  "username": "Little-Curry-Spicy",
  "maxRepos": 15
}
```

参数说明：

- `username`：必填，GitHub 用户名
- `maxRepos`：可选，范围 1~50，默认 15

#### `POST /knowledge/quality-check`

- 说明：手动触发入库质量检查

文件入库检查：

```json
{
  "profile": "file",
  "source": "resume.docx"
}
```

GitHub 入库检查：

```json
{
  "profile": "github",
  "username": "Little-Curry-Spicy"
}
```

---

## 5. 前端功能说明

`front` 当前主要功能：

- 聊天对话（流式响应、暂停/恢复、错误提示）
- 代表项目快捷提问（角色/难点/结果）
- 上传/重传简历并入库
- 同步指定 GitHub 用户公开仓库并入库
- 选中文本后“引用提问”

---

## 6. 常见问题

### Q1: 上传文件时报“未配置 Qdrant”

请检查 `backend/.env` 是否正确配置 `QDRANT_URL`（云端还需 `QDRANT_API_KEY`）。

### Q2: 调用接口 401

如果设置了 `FRIEND_API_KEY`，请求必须携带 `Authorization: Bearer ...` 或 `X-Friend-Api-Key`。

### Q3: 前端连不上后端

确认后端已启动；开发时可用 `VITE_API_BASE` 指向后端，或留空走 Vite 对 `/ai`、`/knowledge` 的代理。Docker 部署时默认同源反代，一般无需设置 `VITE_API_BASE`。  
跨域由后端 CORS 控制；当前默认放开。

---

## 7. Docker 部署（服务器）

在项目根目录准备 `backend/.env`（与本地开发相同变量，见上文「配置环境变量」）。**不要**把真实密钥提交到 Git。

可选：在根目录放置 `.env`（供 Compose 替换变量，不会进入镜像），示例：

```env
# 映射宿主机端口（前端 Nginx），默认 3001
HTTP_PORT=3001

# 构建前端时注入（Clerk 等）；不设则按空字符串构建
VITE_CLERK_PUBLISHABLE_KEY=
VITE_CLERK_ENABLED=

# 前端 API 根地址。默认留空：浏览器访问同源路径 /ai、/knowledge（由 Nginx 反代到后端）
# 若前后端不同域名，设为完整 URL，例如 https://api.example.com
# VITE_API_BASE=
```

启动（构建并后台运行）：

```bash
docker compose up -d --build
```

- 页面：`http://<服务器IP>:${HTTP_PORT:-3001}`
- 后端仅暴露在 Compose 网络内，由前端容器通过服务名 `backend:3001` 访问；聊天流式接口在 Nginx 中已关闭缓冲。

单独重建某服务：`docker compose up -d --build backend` 或 `frontend`。

---

## 8. 开发命令速查

后端：

```bash
pnpm --dir backend start:dev
pnpm --dir backend build
pnpm --dir backend test
```

前端：

```bash
pnpm --dir front dev
pnpm --dir front build
pnpm --dir front preview
```
