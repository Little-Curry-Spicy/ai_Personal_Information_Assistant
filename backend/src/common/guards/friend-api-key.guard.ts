import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

/**
 * 当环境变量 `FRIEND_API_KEY` 非空时，要求请求携带相同密钥：
 * `Authorization: Bearer <密钥>` 或 `X-Friend-Api-Key: <密钥>`
 *
 * 未配置密钥时不校验（本地开发友好）。若给朋友用，请在服务端设置强随机字符串，勿提交到 git。
 */
@Injectable()
export class FriendApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('FRIEND_API_KEY')?.trim();
    if (!expected) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const auth = req.headers.authorization;
    const bearer =
      typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')
        ? auth.slice(7).trim()
        : '';

    const headerVal = req.headers['x-friend-api-key'];
    const headerKey = Array.isArray(headerVal) ? headerVal[0] : headerVal;
    const fromHeader = typeof headerKey === 'string' ? headerKey.trim() : '';

    const provided = bearer || fromHeader;
    if (provided && provided === expected) return true;

    throw new UnauthorizedException(
      '缺少或错误的访问密钥。请配置 Authorization: Bearer，或请求头 X-Friend-Api-Key。',
    );
  }
}

