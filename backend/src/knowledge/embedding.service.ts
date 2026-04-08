import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAIEmbeddings } from '@langchain/openai';

@Injectable()
export class EmbeddingService {
  private readonly embedder: OpenAIEmbeddings;

  constructor(private readonly config: ConfigService) {
    const dimensionsRaw = this.config.get<string>('EMBEDDING_DIMENSIONS');
    const dimensions = dimensionsRaw ? parseInt(dimensionsRaw, 10) : 1024;
    this.embedder = new OpenAIEmbeddings({
      model: this.config.get<string>('EMBEDDING_MODEL') ?? 'text-embedding-v4',
      dimensions: Number.isFinite(dimensions) ? dimensions : 1024,
      /**
       * 通义/DashScope 等兼容 OpenAI 形态的 Embedding API 常限制单次 batch ≤ 10，
       * 否则会报：batch size is invalid, it should not be larger than 10
       */
      batchSize: (() => {
        const raw = this.config.get<string>('EMBEDDING_BATCH_SIZE')?.trim();
        const parsed = raw ? parseInt(raw, 10) : 10;
        return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 2048) : 10;
      })(),
      apiKey: this.config.get<string>('OPENAI_API_KEY'),
      configuration: {
        baseURL: this.config.get<string>('OPENAI_BASE_URL'),
      },
    });
  }

  embedDocuments(texts: string[]): Promise<number[][]> {
    return this.embedder.embedDocuments(texts);
  }

  embedQuery(text: string): Promise<number[]> {
    return this.embedder.embedQuery(text);
  }
}
