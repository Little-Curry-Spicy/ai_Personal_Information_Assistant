import { Injectable } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';
import { type QdrantSearchHit, QdrantService } from './qdrant.service';

export type RetrievedChunk = {
  score?: number;
  text: string;
  source?: string;
  kind?: string;
};

@Injectable()
export class KnowledgeRetrievalService {
  constructor(
    private readonly qdrant: QdrantService,
    private readonly embedding: EmbeddingService,
  ) {}

  /**
   * 合并两次向量检索结果并去重：原问句 + 扩展关键词。
   * 缓解「中文口语问法」与「英文简历正文」跨语言相似度偏低、真相关切片被挤出 topK 的问题。
   */
  private mergeHits(hits: QdrantSearchHit[], topK: number): QdrantSearchHit[] {
    const seen = new Set<string>();
    const out: QdrantSearchHit[] = [];
    const sorted = [...hits].sort((a, b) => b.score - a.score);
    for (const h of sorted) {
      const meta = h.payload;
      const text = typeof meta?.text === 'string' ? meta.text : '';
      const key = text ? text.slice(0, 200) : `empty:${h.score}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(h);
      if (out.length >= topK) break;
    }
    return out;
  }

  private expandQueryForResume(query: string): string {
    return `${query}\nname full name 姓名 名字 简历 resume CV profile contact introduction`;
  }

  private isProfileQuery(query: string): boolean {
    const q = query.toLowerCase();
    return /我|我的|姓名|名字|年龄|简历|经历|联系方式|邮箱|工作|任职|公司|多久|时长|第一份/.test(
      q,
    );
  }

  private looksLikeResumeSource(source?: string): boolean {
    if (!source) return false;
    const s = source.toLowerCase();
    return (
      s.endsWith('.pdf') ||
      s.endsWith('.docx') ||
      s.endsWith('.txt') ||
      s.includes('resume') ||
      s.includes('cv') ||
      s.includes('简历')
    );
  }

  isReady(): boolean {
    return this.qdrant.isConfigured();
  }

  async search(query: string, topK: number): Promise<RetrievedChunk[]> {
    if (!this.qdrant.isConfigured()) return [];
    const q = query.trim();
    if (!q) return [];
    const perFetch = Math.min(80, Math.max(topK * 5, 24));
    const [v1, v2] = await Promise.all([
      this.embedding.embedQuery(q),
      this.embedding.embedQuery(this.expandQueryForResume(q)),
    ]);
    const [hits1, hits2] = await Promise.all([
      this.qdrant.search(v1, perFetch),
      this.qdrant.search(v2, perFetch),
    ]);
    const merged = this.mergeHits([...hits1, ...hits2], Math.max(topK * 4, 24));
    const hits = this.isProfileQuery(q)
      ? await (async () => {
          const resumeFirst = merged.filter((h) => {
            const meta = h.payload;
            const kind = typeof meta?.kind === 'string' ? meta.kind : '';
            const source =
              typeof meta?.source === 'string' ? meta.source : undefined;
            return kind === 'file' || this.looksLikeResumeSource(source);
          });
          if (resumeFirst.length) return resumeFirst.slice(0, topK);
          // 兜底：若语义 topK 被 GitHub 内容淹没，直接补拉 file 类型片段（通常是已上传简历）。
          return (await this.qdrant.scrollByKind('file', Math.max(topK, 8))).slice(
            0,
            topK,
          );
        })()
      : merged.slice(0, topK);
    return hits.map((h) => {
      const meta = h.payload;
      const text = typeof meta?.text === 'string' ? meta.text : '';
      const source = typeof meta?.source === 'string' ? meta.source : undefined;
      const kind = typeof meta?.kind === 'string' ? meta.kind : undefined;
      return {
        score: h.score,
        text,
        source,
        kind,
      };
    });
  }

  /** 供 Agent 工具使用的纯文本叙述。 */
  async searchAsContext(query: string, topK: number): Promise<string> {
    const rows = await this.search(query, topK);
    if (!rows.length) {
      return '（未在当前向量库中检索到相关片段。）';
    }
    return rows
      .map((r, i) => {
        const cite = r.source
          ? `[片段${i + 1} 来源:${r.source}${r.kind ? ` 类型:${r.kind}` : ''}]`
          : `[片段${i + 1}]`;
        return `${cite}\n${r.text}`;
      })
      .join('\n\n---\n\n');
  }
}
