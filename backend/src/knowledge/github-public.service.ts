import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** 仅调用 GitHub 公开 API，不访问私有仓库。 */
@Injectable()
export class GithubPublicService {
  private readonly userAgent: string;
  private readonly authHeader: string | undefined;

  constructor(private readonly config: ConfigService) {
    this.userAgent =
      this.config.get<string>('GITHUB_USER_AGENT') ?? 'agui-backend';
    const token = this.config.get<string>('GITHUB_TOKEN')?.trim();
    this.authHeader = token ? `Bearer ${token}` : undefined;
  }

  private async githubFetch(path: string, accept?: string): Promise<Response> {
    const url = path.startsWith('http')
      ? path
      : `https://api.github.com${path}`;
    const headers: Record<string, string> = {
      Accept: accept ?? 'application/vnd.github+json',
      'User-Agent': this.userAgent,
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (this.authHeader) headers.Authorization = this.authHeader;

    const res = await fetch(url, { headers });
    return res;
  }

  /**
   * 列出用户公开仓库（含 fork），按更新时间排序。
   */
  async listPublicRepos(
    username: string,
    maxRepos: number,
  ): Promise<
    Array<{
      full_name: string;
      description: string | null;
      html_url: string;
      topics: string[];
      language: string | null;
      pushed_at: string | null;
    }>
  > {
    const trimmed = username.trim();
    if (!trimmed) return [];
    const perPage = Math.min(maxRepos, 100);
    const res = await this.githubFetch(
      `/users/${encodeURIComponent(trimmed)}/repos?type=owner&sort=updated&per_page=${perPage}`,
    );
    if (res.status === 404) {
      return [];
    }
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`GitHub 列出仓库失败 HTTP ${res.status}: ${body}`);
    }
    const data = (await res.json()) as Array<{
      full_name: string;
      description: string | null;
      html_url: string;
      topics?: string[];
      language: string | null;
      pushed_at: string | null;
      private: boolean;
    }>;
    return data
      .filter((r) => !r.private)
      .slice(0, maxRepos)
      .map((r) => ({
        full_name: r.full_name,
        description: r.description,
        html_url: r.html_url,
        topics: r.topics ?? [],
        language: r.language,
        pushed_at: r.pushed_at,
      }));
  }

  /** 获取仓库默认分支 README 的纯文本（公开仓库）。 */
  async getReadmeText(owner: string, repo: string): Promise<string | null> {
    const res = await this.githubFetch(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/readme`,
      'application/vnd.github.raw',
    );
    if (res.status === 404) return null;
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`GitHub 读取 README 失败 HTTP ${res.status}: ${body}`);
    }
    return res.text();
  }

  /** 单仓库元数据 + README，用于入库或工具实时拉取。 */
  async getRepoDocument(fullName: string): Promise<{
    full_name: string;
    description: string | null;
    html_url: string;
    readme: string | null;
  } | null> {
    const parts = fullName.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    const [owner, repo] = parts;
    const res = await this.githubFetch(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    );
    if (res.status === 404) return null;
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`GitHub 仓库信息失败 HTTP ${res.status}: ${body}`);
    }
    const meta = (await res.json()) as {
      full_name: string;
      description: string | null;
      html_url: string;
      private: boolean;
    };
    if (meta.private) return null;
    const readme = await this.getReadmeText(owner, repo);
    return {
      full_name: meta.full_name,
      description: meta.description,
      html_url: meta.html_url,
      readme,
    };
  }
}
