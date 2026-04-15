import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { FriendApiKeyGuard } from '../common/guards/friend-api-key.guard';
import { KnowledgeIngestService } from './knowledge-ingest.service';
import { KnowledgeQualityService } from './knowledge-quality.service';

const upload = memoryStorage();

@Controller('knowledge')
@UseGuards(FriendApiKeyGuard)
export class KnowledgeController {
  constructor(
    private readonly ingest: KnowledgeIngestService,
    private readonly quality: KnowledgeQualityService,
  ) {}

  /**
   * 上传 txt / pdf / docx，切块写入 Qdrant。
   * curl -F 'file=@./resume.pdf' http://localhost:3001/knowledge/ingest/file
   */
  @Post('ingest/file')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: upload,
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  async ingestFile(
    @UploadedFile() file?: Express.Multer.File,
    @Query('replace') replace?: string,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('请使用 multipart 字段名 file 上传文件');
    }
    const replaceExisting = replace !== '0' && replace !== 'false';
    return this.ingest.ingestFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      { replaceExisting },
    );
  }

  /** 拉取 GitHub 用户公开仓库 README 等文本并入库。 */
  @Post('ingest/github')
  async ingestGithub(@Body() body: { username?: string; maxRepos?: number }) {
    const username = body?.username?.trim();
    if (!username) {
      throw new BadRequestException('需要 JSON 字段 username');
    }
    const maxRepos = Math.min(Math.max(Number(body?.maxRepos) || 15, 1), 50);
    return this.ingest.ingestGithubUser(username, maxRepos);
  }

  /**
   * 手动触发入库质检。
   * file 示例:  { "profile":"file", "source":"Ben_resume.docx" }
   * github 示例:{ "profile":"github", "username":"Little-Curry-Spicy" }
   */
  @Post('quality-check')
  async qualityCheck(
    @Body() body: { profile?: 'file' | 'github'; source?: string; username?: string },
  ) {
    if (body?.profile === 'file') {
      const source = body?.source?.trim();
      if (!source) throw new BadRequestException('file 质检需要字段 source');
      return this.quality.checkFileIngest(source);
    }
    if (body?.profile === 'github') {
      const username = body?.username?.trim();
      if (!username) throw new BadRequestException('github 质检需要字段 username');
      return this.quality.checkGithubIngest(username);
    }
    throw new BadRequestException('profile 仅支持 file 或 github');
  }
}
