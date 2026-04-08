import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';

export type QdrantSearchHit = {
  score: number;
  payload: Record<string, unknown> | undefined;
};

type QdrantScrollPoint = {
  id?: string | number;
  payload?: Record<string, unknown>;
};

@Injectable()
export class QdrantService {
  private client: QdrantClient | null = null;
  private collectionReady: Promise<void> | null = null;

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    const url = this.config.get<string>('QDRANT_URL')?.trim();
    return !!url;
  }

  getCollectionName(): string {
    return (
      this.config.get<string>('QDRANT_COLLECTION')?.trim() ||
      'personal_intro'
    );
  }

  private embeddingDimensions(): number {
    const raw = this.config.get<string>('EMBEDDING_DIMENSIONS');
    const n = raw ? parseInt(raw, 10) : 1024;
    return Number.isFinite(n) && n > 0 ? n : 1024;
  }

  /** 懒加载客户端；云端请在控制台开启 API Key 并配置 QDRANT_API_KEY。 */
  getClient(): QdrantClient {
    if (this.client) return this.client;
    const url = this.config.get<string>('QDRANT_URL')?.trim();
    if (!url) {
      throw new Error(
        '未配置 Qdrant：请设置环境变量 QDRANT_URL（托管集群 URL，见 Qdrant Cloud 控制台）。',
      );
    }
    const apiKey = this.config.get<string>('QDRANT_API_KEY')?.trim();
    this.client = new QdrantClient({
      url,
      ...(apiKey ? { apiKey } : {}),
    });
    return this.client;
  }

  /**
   * 确保 Collection 存在（与 EMBEDDING_DIMENSIONS 一致的余弦空间）。
   * 并发首次调用时若已存在则忽略创建冲突。
   */
  async ensureCollection(): Promise<void> {
    if (!this.collectionReady) {
      this.collectionReady = this.doEnsureCollection();
    }
    try {
      await this.collectionReady;
    } catch {
      this.collectionReady = null;
      throw new Error('Failed to ensure collection');
    }
  }

  private async doEnsureCollection(): Promise<void> {
    const c = this.getClient();
    const name = this.getCollectionName();
    const { collections } = await c.getCollections();
    if (collections.some((col) => col.name === name)) return;
    try {
      await c.createCollection(name, {
        vectors: {
          size: this.embeddingDimensions(),
          distance: 'Cosine',
        },
      });
    } catch (e) {
      const msg = (e as Error).message ?? '';
      if (!msg.includes('already exists') && !msg.includes('409')) throw e;
    }
  }

  async upsertPoints(
    points: Array<{
      id: string;
      vector: number[];
      payload: Record<string, string>;
    }>,
  ): Promise<void> {
    if (!points.length) return;
    await this.ensureCollection();
    const c = this.getClient();
    const name = this.getCollectionName();
    await c.upsert(name, {
      wait: true,
      points: points.map((p) => ({
        id: p.id,
        vector: p.vector,
        payload: p.payload,
      })),
    });
  }

  async search(vector: number[], limit: number): Promise<QdrantSearchHit[]> {
    await this.ensureCollection();
    const c = this.getClient();
    const name = this.getCollectionName();
    const res = await c.search(name, {
      vector,
      limit,
      with_payload: true,
    });
    return (res ?? []).map((r) => ({
      score: r.score ?? 0,
      payload: r.payload as Record<string, unknown> | undefined,
    }));
  }

  async scrollByKind(kind: string, limit: number): Promise<QdrantSearchHit[]> {
    await this.ensureCollection();
    const c = this.getClient();
    const name = this.getCollectionName();
    const res = await c.scroll(name, {
      // 部分托管版本对 scroll+filter 语法兼容性较差，这里先拉一批后端内存过滤，保证稳定性。
      limit: Math.max(limit * 10, 80),
      with_payload: true,
      with_vector: false,
    });
    const points = (res as { points?: Array<{ payload?: Record<string, unknown> }> })?.points ?? [];
    return points
      .filter((p) => {
        const payload = p.payload;
        return typeof payload?.kind === 'string' && payload.kind === kind;
      })
      .slice(0, limit)
      .map((p) => ({
      score: 0,
      payload: p.payload,
      }));
  }

  async deleteBySource(source: string, kind?: string): Promise<number> {
    const target = source.trim();
    if (!target) return 0;
    await this.ensureCollection();
    const c = this.getClient();
    const name = this.getCollectionName();
    const res = await c.scroll(name, {
      limit: 5000,
      with_payload: true,
      with_vector: false,
    });
    const points = (res as { points?: QdrantScrollPoint[] })?.points ?? [];
    const ids = points
      .filter((p) => {
        const payload = p.payload;
        if (!payload || typeof payload.source !== 'string') return false;
        if (payload.source !== target) return false;
        if (!kind) return true;
        return typeof payload.kind === 'string' && payload.kind === kind;
      })
      .map((p) => p.id)
      .filter((id): id is string | number => id !== undefined && id !== null);
    if (!ids.length) return 0;
    await c.delete(name, {
      wait: true,
      points: ids,
    });
    return ids.length;
  }
}
