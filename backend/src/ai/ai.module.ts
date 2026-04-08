import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { tool } from '@langchain/core/tools';
import z from 'zod';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { KnowledgeRetrievalService } from '../knowledge/knowledge-retrieval.service';
import { GithubPublicService } from '../knowledge/github-public.service';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';
import { FriendApiKeyGuard } from '../common/guards/friend-api-key.guard';

@Module({
  imports: [KnowledgeModule],
  controllers: [AiController],
  providers: [
    ClerkAuthGuard,
    FriendApiKeyGuard,
    AiService,
    {
      provide: 'CHAT_MODEL',
      useFactory: (configService: ConfigService) => {
        return new ChatOpenAI({
          model: configService.get('MODEL_NAME'),
          apiKey: configService.get('OPENAI_API_KEY'),
          configuration: {
            baseURL: configService.get('OPENAI_BASE_URL'),
          },
        });
      },
      inject: [ConfigService],
    },
    {
      provide: 'WEB_SEARCH_TOOL',
      useFactory: (configService: ConfigService) => {
        const webSearchArgsSchema = z.object({
          query: z
            .string()
            .min(1)
            .describe('搜索关键词，例如：北京今天的天气'),
          count: z
            .number()
            .int()
            .min(1)
            .max(20)
            .optional()
            .describe('返回的搜索结果数量，默认 10 条'),
        });

        return tool(
          async ({ query, count }: { query: string; count?: number }) => {
            const apiKey = configService.get<string>('BOCHA_API_KEY');
            const url = 'https://api.bochaai.com/v1/web-search';
            const body = {
              query,
              freshness: 'noLimit',
              summary: true,
              count: count ?? 10,
            };

            const response = await fetch(url, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(body),
            });

            if (!response.ok) {
              const errorText = await response.text();
              return `搜索 API 请求失败，状态码: ${response.status}, 错误信息: ${errorText}`;
            }

            let json: any;
            try {
              json = await response.json();
            } catch (e) {
              return `搜索 API 请求失败，原因是：搜索结果解析失败 ${(e as Error).message}`;
            }

            try {
              if (json.code !== 200 || !json.data) {
                return `搜索 API 请求失败，原因是: ${json.msg ?? '未知错误'}`;
              }

              const webpages = json.data.webPages?.value ?? [];
              if (!webpages.length) {
                return '未找到相关结果。';
              }

              const formatted = webpages
                .map(
                  (page: any, idx: number) =>
                    `引用: ${idx + 1}
    标题: ${page.name}
    URL: ${page.url}
    摘要: ${page.summary}
    网站名称: ${page.siteName}
    网站图标: ${page.siteIcon}
    发布时间: ${page.dateLastCrawled}`,
                )
                .join('\n\n');

              return formatted;
            } catch (e) {
              return `搜索 API 请求失败，原因是：搜索结果解析失败 ${(e as Error).message}`;
            }
          },
          {
            name: 'web_search',
            description:
              '使用 Bocha Web Search API 搜索互联网网页。输入为搜索关键词（可选 count 指定结果数量），返回包含标题、URL、摘要、网站名称、图标和时间等信息的结果列表。',
            schema: webSearchArgsSchema,
          },
        );
      },
      inject: [ConfigService],
    },
    {
      provide: 'KNOWLEDGE_SEARCH_TOOL',
      useFactory: (retrieval: KnowledgeRetrievalService) => {
        const schema = z.object({
          query: z
            .string()
            .min(1)
            .describe(
              '用于语义检索的问句或关键词，对应个人已上传/已同步的知识库',
            ),
          topK: z
            .number()
            .int()
            .min(1)
            .max(20)
            .optional()
            .describe('返回的文本片段数量，默认 12（略大有利于跨语言时仍命中简历）'),
        });
        return tool(
          async ({ query, topK }: { query: string; topK?: number }) => {
            if (!retrieval.isReady()) {
              return '个人知识库未配置或未启用（缺少 Qdrant 环境变量）。请服务端配置 QDRANT_URL（及云端所需的 QDRANT_API_KEY），通过 /knowledge/ingest/* 入库后再试。';
            }
            try {
              return await retrieval.searchAsContext(query, topK ?? 12);
            } catch (e) {
              return `检索知识库失败：${(e as Error).message}`;
            }
          },
          {
            name: 'search_personal_knowledge',
            description:
              '在个人知识库（Qdrant 向量库）中做语义检索。涵盖已上传的 txt/pdf/docx 以及已同步的 GitHub 公开仓库说明。回答个人经历、项目列表、技能等问题时应优先调用。',
            schema,
          },
        );
      },
      inject: [KnowledgeRetrievalService],
    },
    {
      provide: 'GITHUB_PUBLIC_TOOL',
      useFactory: (github: GithubPublicService) => {
        const schema = z.object({
          ownerRepo: z
            .string()
            .min(1)
            .optional()
            .describe(
              'GitHub 公开仓库全名，格式 owner/repo，例如 vercel/next.js。若未知可不传',
            ),
          username: z
            .string()
            .min(1)
            .optional()
            .describe('GitHub 用户名，例如 Little-Curry-Spicy（可与 repo 搭配）'),
          repo: z
            .string()
            .min(1)
            .optional()
            .describe('仓库名，例如 fastAPI（可与 username 搭配）'),
        });
        return tool(
          async ({
            ownerRepo,
            username,
            repo,
          }: {
            ownerRepo?: string;
            username?: string;
            repo?: string;
          }) => {
            let name = ownerRepo?.trim() ?? '';
            if (!name) {
              const u = username?.trim() ?? '';
              const r = repo?.trim() ?? '';
              if (!u || !r) {
                return '请提供 owner/repo，或同时提供 username + repo。';
              }
              // 支持“只给仓库名”的场景：先列用户仓库后做不区分大小写匹配
              const repos = await github.listPublicRepos(u, 100);
              const matched = repos.find((it) => {
                const full = it.full_name.toLowerCase();
                return full === `${u}/${r}`.toLowerCase() || full.endsWith(`/${r.toLowerCase()}`);
              });
              if (!matched) {
                return `在用户 ${u} 的公开仓库中未找到：${r}`;
              }
              name = matched.full_name;
            }

            if (!name.includes('/')) {
              return '仓库名必须为 owner/repo 格式，或传 username + repo。';
            }
            try {
              const doc = await github.getRepoDocument(name);
              if (!doc) {
                return `未找到公开仓库或无权访问：${name}（本工具仅支持公开仓库）。`;
              }
              const meta = [
                `仓库: ${doc.full_name}`,
                doc.description ? `描述: ${doc.description}` : '',
                `链接: ${doc.html_url}`,
              ]
                .filter(Boolean)
                .join('\n');
              const body = doc.readme?.trim()
                ? `\n\n--- README ---\n\n${doc.readme}`
                : '\n\n（该仓库无 README 或无法读取原始 README。）';
              return `${meta}${body}`;
            } catch (e) {
              return `GitHub 公开 API 调用失败：${(e as Error).message}`;
            }
          },
          {
            name: 'github_public_repo',
            description:
              '从 GitHub 公开 API 拉取指定 owner/repo 的仓库元数据与 README 原文。用于回答某个具体公开仓库的技术细节、项目说明；若知识库已同步该仓库可不再调用。',
            schema,
          },
        );
      },
      inject: [GithubPublicService],
    },
    {
      provide: 'GITHUB_PUBLIC_USER_TOOL',
      useFactory: (github: GithubPublicService) => {
        const schema = z.object({
          username: z
            .string()
            .min(1)
            .describe('GitHub 用户名，例如 Little-Curry-Spicy'),
          maxRepos: z
            .number()
            .int()
            .min(1)
            .max(10)
            .optional()
            .describe('返回公开仓库数量，默认 5'),
        });
        return tool(
          async ({ username, maxRepos }: { username: string; maxRepos?: number }) => {
            const u = username.trim();
            if (!u) return 'username 不能为空。';
            try {
              const repos = await github.listPublicRepos(u, maxRepos ?? 5);
              if (!repos.length) {
                return `未找到该用户的公开仓库：${u}`;
              }
              const lines = repos.map(
                (r, i) =>
                  `${i + 1}. ${r.full_name}${r.description ? ` - ${r.description}` : ''}\n   ${r.html_url}`,
              );
              return [
                `GitHub 用户: ${u}`,
                `主页: https://github.com/${u}`,
                '',
                '公开仓库:',
                ...lines,
              ].join('\n');
            } catch (e) {
              return `GitHub 用户信息查询失败：${(e as Error).message}`;
            }
          },
          {
            name: 'github_public_user',
            description:
              '根据 GitHub 用户名返回公开主页地址与公开仓库列表。用于回答“我的 GitHub 地址/账号/项目”类问题。',
            schema,
          },
        );
      },
      inject: [GithubPublicService],
    },
  ],
})
export class AiModule { }
