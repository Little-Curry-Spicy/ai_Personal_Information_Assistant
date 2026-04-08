import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import { chunkText } from './chunk-text.util';
import { EmbeddingService } from './embedding.service';
import { GithubPublicService } from './github-public.service';
import { KnowledgeQualityService, type QualityReport } from './knowledge-quality.service';
import { QdrantService } from './qdrant.service';

const CHUNK_CHARS = 1200;
const CHUNK_OVERLAP = 200;
/** Qdrant payload 不宜过大，单段正文截断上限。 */
const MAX_CHUNK_STORE = 3500;

export type IngestResult = {
  chunksIndexed: number;
  source: string;
  replacedExisting?: boolean;
  deletedChunks?: number;
  qualityReport?: QualityReport;
};

@Injectable()
export class KnowledgeIngestService {
  constructor(
    private readonly qdrant: QdrantService,
    private readonly embedding: EmbeddingService,
    private readonly github: GithubPublicService,
    private readonly quality: KnowledgeQualityService,
  ) {}

  private async upsertChunks(
    chunks: string[],
    baseMetadata: Record<string, string>,
  ): Promise<number> {
    if (!chunks.length) return 0;
    const prepared = chunks.map((raw) => {
      const text =
        raw.length > MAX_CHUNK_STORE ? raw.slice(0, MAX_CHUNK_STORE) : raw;
      return { text, payload: { ...baseMetadata, text } };
    });
    const vectors = await this.embedding.embedDocuments(
      prepared.map((p) => p.text),
    );
    const batchSize = 64;
    for (let i = 0; i < prepared.length; i += batchSize) {
      const slice = prepared.slice(i, i + batchSize);
      const sliceVec = vectors.slice(i, i + batchSize);
      await this.qdrant.upsertPoints(
        slice.map((p, j) => ({
          id: randomUUID(),
          vector: sliceVec[j]!,
          payload: p.payload,
        })),
      );
    }
    return chunks.length;
  }

  private async extractFromBuffer(
    buffer: Buffer,
    mimetype: string,
    originalName: string,
  ): Promise<string> {
    if (mimetype === 'text/plain' || originalName.endsWith('.txt')) {
      return buffer.toString('utf-8');
    }
    if (
      mimetype === 'application/pdf' ||
      originalName.toLowerCase().endsWith('.pdf')
    ) {
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      try {
        const result = await parser.getText();
        return result.text ?? '';
      } finally {
        await parser.destroy();
      }
    }
    if (
      mimetype ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      originalName.toLowerCase().endsWith('.docx')
    ) {
      const { value } = await mammoth.extractRawText({ buffer });
      return value ?? '';
    }
    throw new BadRequestException(
      `不支持的文件类型：${mimetype}（支持 txt、pdf、docx）`,
    );
  }

  async ingestFile(
    buffer: Buffer,
    originalName: string,
    mimetype: string,
    options?: { replaceExisting?: boolean },
  ): Promise<IngestResult> {
    if (!this.qdrant.isConfigured()) {
      throw new BadRequestException('未配置 Qdrant（QDRANT_URL），无法入库。');
    }
    const body = await this.extractFromBuffer(buffer, mimetype, originalName);
    if (!body.trim()) {
      throw new BadRequestException('未能从文件中提取出文本内容。');
    }
    const replaceExisting = options?.replaceExisting ?? true;
    let deletedChunks = 0;
    if (replaceExisting) {
      deletedChunks = await this.qdrant.deleteBySource(originalName, 'file');
    }
    const chunks = chunkText(body, CHUNK_CHARS, CHUNK_OVERLAP);
    const n = await this.upsertChunks(chunks, {
      source: originalName,
      kind: 'file',
    });
    const qualityReport = await this.quality.checkFileIngest(originalName);
    return {
      chunksIndexed: n,
      source: originalName,
      replacedExisting: replaceExisting,
      deletedChunks,
      qualityReport,
    };
  }

  async ingestGithubUser(
    username: string,
    maxRepos = 15,
  ): Promise<IngestResult> {
    if (!this.qdrant.isConfigured()) {
      throw new BadRequestException('未配置 Qdrant（QDRANT_URL），无法入库。');
    }
    const repos = await this.github.listPublicRepos(username, maxRepos);
    if (!repos.length) {
      const qualityReport = await this.quality.checkGithubIngest(username);
      return { chunksIndexed: 0, source: `github:${username}`, qualityReport };
    }
    let total = 0;
    for (const r of repos) {
      const [owner, repo] = r.full_name.split('/');
      let readme = '';
      try {
        readme = (await this.github.getReadmeText(owner, repo)) ?? '';
      } catch {
        readme = '';
      }
      const header = [
        `仓库: ${r.full_name}`,
        r.description ? `描述: ${r.description}` : '',
        r.language ? `主要语言: ${r.language}` : '',
        r.topics?.length ? `标签: ${r.topics.join(', ')}` : '',
        `链接: ${r.html_url}`,
      ]
        .filter(Boolean)
        .join('\n');
      const doc = `${header}\n\n--- README ---\n\n${readme}`.trim();
      const chunks = chunkText(doc, CHUNK_CHARS, CHUNK_OVERLAP);
      const n = await this.upsertChunks(chunks, {
        source: r.full_name,
        kind: 'github',
      });
      total += n;
    }
    const qualityReport = await this.quality.checkGithubIngest(username);
    return { chunksIndexed: total, source: `github:${username}`, qualityReport };
  }
}
