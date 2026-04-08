/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLERK_PUBLISHABLE_KEY?: string
  /** 设为 false / 0 / off / no 可关闭 Clerk（不挂载 Provider、不显示登录 UI） */
  readonly VITE_CLERK_ENABLED?: string
  /** 后端根 URL；留空则请求相对路径（适合 Nginx 与 API 同域） */
  readonly VITE_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
