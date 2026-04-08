/**
 * 是否启用 Clerk 登录（由环境变量控制，便于本地/演示一键关闭）。
 *
 * - 需要配置 `VITE_CLERK_PUBLISHABLE_KEY`
 * - 若设置 `VITE_CLERK_ENABLED` 为 `false` / `0` / `off` / `no`，则关闭（即使有 key 也不挂载 Clerk）
 * - 未设置 `VITE_CLERK_ENABLED` 时：有 key 即视为开启（兼容旧配置）
 */
export function isClerkAuthEnabled(): boolean {
  const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY?.trim()
  if (!key) return false

  const raw = import.meta.env.VITE_CLERK_ENABLED?.trim().toLowerCase()
  if (raw === 'false' || raw === '0' || raw === 'off' || raw === 'no') {
    return false
  }

  return true
}

export function clerkPublishableKey(): string | undefined {
  const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY?.trim()
  return key || undefined
}
