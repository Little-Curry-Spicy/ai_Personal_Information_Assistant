import { Inject, Injectable } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { AIMessageChunk, createAgent } from 'langchain';
import { UIMessage } from 'ai';
import { toBaseMessages, toUIMessageStream } from '@ai-sdk/langchain';

@Injectable()
export class AiService {
  private readonly agent: ReturnType<typeof createAgent>;

  constructor(
    @Inject('CURRENT_TIME_TOOL') private readonly currentTimeTool: any,
    @Inject('WEB_SEARCH_TOOL') private readonly webSearchTool: any,
    @Inject('KNOWLEDGE_SEARCH_TOOL')
    private readonly knowledgeSearchTool: any,
    @Inject('GITHUB_PUBLIC_TOOL') private readonly githubPublicTool: any,
    @Inject('GITHUB_PUBLIC_USER_TOOL')
    private readonly githubPublicUserTool: any,
    @Inject('CHAT_MODEL') model: ChatOpenAI,
  ) {
    this.agent = createAgent({
      model,
      tools: [
        this.currentTimeTool,
        this.knowledgeSearchTool,
        this.githubPublicTool,
        this.githubPublicUserTool,
        this.webSearchTool,
      ],
      systemPrompt: `你是「个人介绍」助手，基于档案主人提供的资料作答。

回答规则（必须遵守）：
0. 每次收到用户消息时，第一步必须调用 search_personal_knowledge 工具；在拿到工具返回前，禁止直接输出答案文本。
1. 仅允许基于两类来源作答：
   - search_personal_knowledge（个人向量库）
   - github_public_repo（指定公开仓库 owner/repo）
2. 若问题涉及“当前时间/今天/今年/现在/年龄”等实时信息，必须先调用 get_current_time，再进行计算和回答，禁止凭记忆或训练时日期估算。
3. 关于 web_search 使用策略：
   - 默认禁止使用 web_search；
   - 若用户明确要求“联网搜索”，可使用；
   - 若用户问题聚焦于向量库中出现的专有名词（如人名/公司名/机构名/学校名），且仅靠向量库与 GitHub 证据不足以形成可读答案，可使用 web_search 做补充检索后再回答，以提升友好性。
4. 若用户问题涉及某个具体仓库：
   - 已给出 owner/repo：调用 github_public_repo；
   - 只给出 repo 名（如“fastAPI”）：先根据已知 username（来自用户提问或向量库命中的 GitHub 账号）定位仓库，再调用 github_public_repo（可用 username+repo）。
5. 若用户问题是“GitHub 账号/地址/主页/有哪些项目”，优先调用 github_public_user 获取主页与仓库列表再回答；若问题未显式给 username，可从向量库命中内容中提取（如 Little-Curry-Spicy）。
6. 若证据不足，不要扩写、不要给泛化建议、不要补充与资料无关的清单。
6.1 若 github_public_repo 已返回仓库元数据（仓库名/链接/描述），即使 README 为空，也视为“有证据”，可基于这些元数据回答；仅在工具整体无结果时才判定证据不足。
7. 若未检索到足够证据（且不满足第 3 条的 web_search 触发条件）时，只回复一句：
   「未在当前向量库或指定 GitHub 仓库中检索到可确认的信息。」
8. 请用中文简洁作答；默认只输出“结论”一句，不输出“证据/来源/明确记载/量化结果”等小标题或解释，除非用户明确要求“展开说明/给证据”。
9. 禁止使用“要不要我…/需要我…/是否要我…”等反问或引导句；禁止给“举例、演示、下一步建议”除非用户明确要求。`,
    });
  }

  async stream(messages: UIMessage[]) {
    const lcMessages = await toBaseMessages(messages);
    const lgStream = await this.agent.stream(
      { messages: lcMessages },
      {
        streamMode: ['messages', 'values'],
        recursionLimit: 30,
      },
    );

    return toUIMessageStream(lgStream as AsyncIterable<AIMessageChunk>);
  }
}
