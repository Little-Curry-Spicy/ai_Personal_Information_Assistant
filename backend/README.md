<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository。

### 个人介绍 AI（RAG + 公开 GitHub）

- **向量库**：托管 [Qdrant Cloud](https://cloud.qdrant.io/)（应用在首次写入时会按 `EMBEDDING_DIMENSIONS` 自动创建 collection，或与控制台上已手动创建的同名 collection 对齐维度）。
- **入库**：`POST /knowledge/ingest/file`（multipart 字段 `file`，支持 txt / pdf / docx）；`POST /knowledge/ingest/github`（JSON：`{ "username": "octocat", "maxRepos": 15 }`，仅同步**公开**仓库）。
- **重新上传简历（覆盖旧版本）**：同名文件默认会先删除旧的 `kind=file` 向量再入库；可用 `POST /knowledge/ingest/file?replace=0` 关闭覆盖行为。
- **入库自动质检**：上述两个入库接口会在返回体里附带 `qualityReport`（可检索项通过/失败、证据片段）。
- **手动质检**：`POST /knowledge/quality-check`
  - 文件质检：`{ "profile":"file", "source":"Ben_resume.docx" }`
  - GitHub 质检：`{ "profile":"github", "username":"Little-Curry-Spicy" }`
- **对话**：`POST /ai/chat`（与原先一致），Agent 内置 `search_personal_knowledge`、`github_public_repo`（owner/repo）、`web_search`。

**环境变量（补充）**

| 变量 | 说明 |
|------|------|
| `QDRANT_URL` | Qdrant 集群 URL（控制台中的 Cluster URL，如 `https://xxxx.cloud.qdrant.io`） |
| `QDRANT_API_KEY` | Qdrant Cloud API Key（自建无鉴权实例可留空） |
| `QDRANT_COLLECTION` | 可选；Collection 名称，默认 `personal_intro` |
| `EMBEDDING_MODEL` | 嵌入模型名，默认 `text-embedding-v4`（阿里云百炼兼容 OpenAI 时常用） |
| `EMBEDDING_DIMENSIONS` | 向量维度，默认 `1024`（须与实际 embedding 输出维度一致；与 collection 向量维度一致） |
| `GITHUB_TOKEN` | 可选；提高 GitHub API 限流，仅用于读公开接口 |
| `GITHUB_USER_AGENT` | 可选；`User-Agent`，默认 `agui-backend` |

若你在控制台**手动**创建了 collection，请使用 **Cosine** 距离，向量维度等于 `EMBEDDING_DIMENSIONS`。

## Project setup

```bash
$ pnpm install
```

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ pnpm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
