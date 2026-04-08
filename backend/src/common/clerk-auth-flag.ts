import { ConfigService } from '@nestjs/config';

/**
 * 后端是否强制校验 Clerk 会话 JWT（与是否配置了 `CLERK_SECRET_KEY` 无关）。
 *
 * `CLERK_AUTH_ENABLED`：`true` / `1` / `yes`（不区分大小写）为开启，其它或未配置为关闭。
 */
export function isClerkAuthEnabledForApi(config: ConfigService): boolean {
  const v = config.get<string>('CLERK_AUTH_ENABLED')?.trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}
