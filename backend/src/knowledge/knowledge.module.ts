import { Module } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';
import { GithubPublicService } from './github-public.service';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeIngestService } from './knowledge-ingest.service';
import { KnowledgeQualityService } from './knowledge-quality.service';
import { KnowledgeRetrievalService } from './knowledge-retrieval.service';
import { QdrantService } from './qdrant.service';
import { FriendApiKeyGuard } from '../common/guards/friend-api-key.guard';

@Module({
  controllers: [KnowledgeController],
  providers: [
    FriendApiKeyGuard,
    QdrantService,
    EmbeddingService,
    GithubPublicService,
    KnowledgeIngestService,
    KnowledgeQualityService,
    KnowledgeRetrievalService,
  ],
  exports: [
    KnowledgeRetrievalService,
    GithubPublicService,
    QdrantService,
    EmbeddingService,
  ],
})
export class KnowledgeModule {}
