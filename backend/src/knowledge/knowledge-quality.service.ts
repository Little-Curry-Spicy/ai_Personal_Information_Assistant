import { Injectable } from '@nestjs/common';
import { KnowledgeRetrievalService, type RetrievedChunk } from './knowledge-retrieval.service';

export type QualityCheckItem = {
  id: string;
  label: string;
  query: string;
  passed: boolean;
  evidence?: {
    source?: string;
    kind?: string;
    score?: number;
    preview: string;
  };
};

export type QualityReport = {
  profile: 'file' | 'github';
  source: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
  checks: QualityCheckItem[];
};

type Rule = {
  id: string;
  label: string;
  query: string;
  filter: (row: RetrievedChunk) => boolean;
};

@Injectable()
export class KnowledgeQualityService {
  constructor(private readonly retrieval: KnowledgeRetrievalService) {}

  private normalize(text: string): string {
    return text.trim().replace(/\s+/g, ' ');
  }

  private toEvidence(row?: RetrievedChunk): QualityCheckItem['evidence'] | undefined {
    if (!row?.text?.trim()) return undefined;
    return {
      source: row.source,
      kind: row.kind,
      score: row.score,
      preview: this.normalize(row.text).slice(0, 180),
    };
  }

  private fileRules(source: string): Rule[] {
    const expected = source.trim().toLowerCase();
    const fromSameSource = (row: RetrievedChunk) =>
      (row.kind === 'file' ||
        !!row.source?.toLowerCase().includes('.doc') ||
        !!row.source?.toLowerCase().includes('.pdf')) &&
      (!expected || row.source?.trim().toLowerCase() === expected);
    return [
      {
        id: 'file_name',
        label: '可检索到姓名',
        query: '我的姓名/名字是什么',
        filter: fromSameSource,
      },
      {
        id: 'file_experience_years',
        label: '可检索到工作年限',
        query: '我有几年开发经验',
        filter: fromSameSource,
      },
      {
        id: 'file_first_job',
        label: '可检索到第一份工作信息',
        query: '我第一份工作是哪里，工作了多久',
        filter: fromSameSource,
      },
      {
        id: 'file_github_username',
        label: '可检索到 GitHub 账号线索',
        query: '我的 GitHub 用户名是什么',
        filter: fromSameSource,
      },
    ];
  }

  private githubRules(username: string): Rule[] {
    const user = username.trim().toLowerCase();
    const fromGithub = (row: RetrievedChunk) =>
      row.kind === 'github' &&
      (!!row.source?.trim() && (!user || row.source.toLowerCase().startsWith(`${user}/`)));
    return [
      {
        id: 'github_homepage',
        label: '可检索到 GitHub 主页',
        query: `我的 GitHub 主页是什么 ${username}`,
        filter: fromGithub,
      },
      {
        id: 'github_projects',
        label: '可检索到仓库列表',
        query: `我的 GitHub 有哪些项目 ${username}`,
        filter: fromGithub,
      },
      {
        id: 'github_specific_repo',
        label: '可检索到指定仓库（fastAPI）',
        query: `介绍一下我的 git 项目 fastAPI ${username}`,
        filter: fromGithub,
      },
    ];
  }

  private async runRules(profile: 'file' | 'github', source: string, rules: Rule[]): Promise<QualityReport> {
    const checks: QualityCheckItem[] = [];
    for (const rule of rules) {
      const rows = await this.retrieval.search(rule.query, 12);
      const hit = rows.find(rule.filter);
      checks.push({
        id: rule.id,
        label: rule.label,
        query: rule.query,
        passed: !!hit,
        evidence: this.toEvidence(hit),
      });
    }
    const passed = checks.filter((c) => c.passed).length;
    return {
      profile,
      source,
      summary: {
        total: checks.length,
        passed,
        failed: checks.length - passed,
      },
      checks,
    };
  }

  async checkFileIngest(source: string): Promise<QualityReport> {
    return this.runRules('file', source, this.fileRules(source));
  }

  async checkGithubIngest(username: string): Promise<QualityReport> {
    return this.runRules('github', username, this.githubRules(username));
  }
}

