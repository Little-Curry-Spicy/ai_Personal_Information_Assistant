/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 后端根 URL；留空则请求相对路径（适合 Nginx 与 API 同域） */
  readonly VITE_API_BASE?: string
  /** 前端部署子路径，默认 / */
  readonly VITE_APP_BASE?: string
  /**
   * 是否允许简历入库覆盖同名分块。未设置或 true：显示侧栏覆盖/追加开关；false：隐藏开关并固定追加。
   */
  readonly VITE_RESUME_INGEST_OVERWRITE?: string
  /** 是否展示侧栏知识库更新区域；未设置视为 true */
  readonly VITE_SHOW_KNOWLEDGE_PANEL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
