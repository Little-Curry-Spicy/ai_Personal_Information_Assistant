import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verifyToken } from '@clerk/backend';
import { isClerkAuthEnabledForApi } from '../clerk-auth-flag';
import type { Request } from 'express';

/**
 * 当 `CLERK_AUTH_ENABLED=true`（等）时，要求请求携带 Clerk 会话 JWT：
 * `Authorization: Bearer <token>`，并用 `CLERK_SECRET_KEY` 验签。
 *
 * 开关关闭时不校验 JWT（便于本地开发）；仅关闭开关时，可保留 `CLERK_SECRET_KEY` 不配或预填。
 */
@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!isClerkAuthEnabledForApi(this.config)) {
      return true;
    }

    const secretKey = this.config.get<string>('CLERK_SECRET_KEY')?.trim();
    if (!secretKey) {
      throw new InternalServerErrorException(
        '已启用 CLERK_AUTH_ENABLED，但未配置 CLERK_SECRET_KEY，无法校验登录令牌。',
      );
    }

    const req = context.switchToHttp().getRequest<Request>();
    const auth = req.headers.authorization;
    const bearer =
      typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')
        ? auth.slice(7).trim()
        : '';

    if (!bearer) {
      throw new UnauthorizedException(
        '请先登录：请求头需携带 Authorization: Bearer <Clerk 会话令牌>。',
      );
    }

    const partiesRaw = this.config.get<string>('CLERK_AUTHORIZED_PARTIES')?.trim();
    const authorizedParties = partiesRaw
      ? partiesRaw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined;

    try {
      await verifyToken(bearer, {
        secretKey,
        ...(authorizedParties?.length ? { authorizedParties } : {}),
      });
      return true;
    } catch {
      throw new UnauthorizedException('无效或已过期的登录令牌，请重新登录。');
    }
  }
}
