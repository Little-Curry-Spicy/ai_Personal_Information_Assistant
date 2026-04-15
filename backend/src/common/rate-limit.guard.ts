import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

type WindowState = { count: number; windowStart: number };

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly store = new Map<string, WindowState>();
  private readonly max: number;
  private readonly windowMs: number;
  private readonly enabled: boolean;

  constructor(private readonly config: ConfigService) {
    this.max = RateLimitGuard.parsePositiveInt(
      this.config.get<string>('RATE_LIMIT_MAX'),
      20,
    );
    this.windowMs = RateLimitGuard.parsePositiveInt(
      this.config.get<string>('RATE_LIMIT_WINDOW_MS'),
      60_000,
    );
    const enabledRaw = this.config.get<string>('RATE_LIMIT_ENABLED');
    this.enabled = enabledRaw !== 'false' && enabledRaw !== '0';
  }

  canActivate(context: ExecutionContext): boolean {
    if (!this.enabled) {
      return true;
    }

    const req = context.switchToHttp().getRequest<Request>();
    const ip = RateLimitGuard.clientIp(req);
    const now = Date.now();

    let entry = this.store.get(ip);
    if (!entry || now - entry.windowStart >= this.windowMs) {
      entry = { count: 0, windowStart: now };
      this.store.set(ip, entry);
    }

    entry.count += 1;
    if (entry.count > this.max) {
      const retryAfterSec = Math.max(
        1,
        Math.ceil((this.windowMs - (now - entry.windowStart)) / 1000),
      );
      throw new HttpException(
        `此 IP 在 ${Math.ceil(this.windowMs / 1000)} 秒内最多允许 ${this.max} 次请求，请约 ${retryAfterSec} 秒后再试`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (this.store.size > 2000 && Math.random() < 0.05) {
      this.pruneExpired(now);
    }

    return true;
  }

  private pruneExpired(now: number): void {
    for (const [key, e] of this.store) {
      if (now - e.windowStart >= this.windowMs) {
        this.store.delete(key);
      }
    }
  }

  private static parsePositiveInt(raw: string | undefined, fallback: number): number {
    if (raw === undefined || raw === '') {
      return fallback;
    }
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }

  private static clientIp(req: Request): string {
    return req.ip || req.socket.remoteAddress || 'unknown';
  }
}
