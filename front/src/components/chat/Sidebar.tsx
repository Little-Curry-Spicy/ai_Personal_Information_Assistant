import {
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  DatabaseZap,
  FileUp,
  GitBranch,
  Github,
} from 'lucide-react'

export type ProjectCard = {
  id: string
  name: string
  repo: string
  /** 主要技术与工程选型 */
  techStack: string
  /** 项目做什么、解决什么问题 */
  intro: string
  /** 一句话分类/检索用标签（如场景、形态） */
  tag: string
}

type SidebarProps = {
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
  projectCards: ProjectCard[]
  activeProjectId: string | null
  /** 点击同一项目再次取消选中 */
  onToggleProject: (projectId: string) => void
  uploadBusy: boolean
  selectedResumeName: string | null
  onUploadResume: (file?: File | null, replaceExisting?: boolean) => Promise<void>
  /** false时由环境变量关闭覆盖能力，不展示覆盖/追加开关 */
  resumeOverwriteSelectable: boolean
  replaceExistingKnowledge: boolean
  onReplaceExistingKnowledgeChange: (value: boolean) => void
  onSetSelectedResumeName: (name: string | null) => void
  githubUser: string
  onGithubUserChange: (value: string) => void
  githubBusy: boolean
  onSyncGithub: () => Promise<void>
  ingestMessage: string | null
  /** false 时不渲染「知识库更新」整卡（上传简历、GitHub 同步等） */
  showKnowledgePanel: boolean
}

export function Sidebar({
  sidebarCollapsed,
  onToggleSidebar,
  projectCards,
  activeProjectId,
  onToggleProject,
  uploadBusy,
  selectedResumeName,
  onUploadResume,
  resumeOverwriteSelectable,
  replaceExistingKnowledge,
  onReplaceExistingKnowledgeChange,
  onSetSelectedResumeName,
  githubUser,
  onGithubUserChange,
  githubBusy,
  onSyncGithub,
  ingestMessage,
  showKnowledgePanel,
}: SidebarProps) {
  return (
    <aside
      className={`min-h-0 overflow-y-auto transition-all duration-200 ${sidebarCollapsed ? 'w-14 flex-none' : 'w-80 flex-none pr-1'}`}
    >
      <button
        type="button"
        className={`inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border-warm)] bg-[var(--warm-sand)] text-[var(--charcoal-warm)] transition hover:-translate-y-0.5 ${sidebarCollapsed ? 'rotate-180' : ''}`}
        onClick={onToggleSidebar}
        aria-label={sidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'}
        title={sidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'}
      >
        {sidebarCollapsed ? (
          <ChevronRight size={14} strokeWidth={2} aria-hidden />
        ) : (
          <ChevronLeft size={14} strokeWidth={2} aria-hidden />
        )}
      </button>

      {!sidebarCollapsed ? (
        <>
          <section
            className="mt-3 rounded-xl border border-[var(--border-warm)] bg-[var(--bg)] p-3"
            aria-label="代表项目"
          >
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-h)]">
              <BriefcaseBusiness size={16} strokeWidth={2} aria-hidden />
              代表项目
            </div>
            <p className="mt-1.5 text-[11px] leading-snug text-[var(--text)]">
              点击卡片后，在下方输入框提问将围绕该项目与对应 GitHub 资料回答。
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2.5">
              {projectCards.map((project) => {
                const active = activeProjectId === project.id
                return (
                  <article
                    key={project.id}
                    className={`cursor-pointer rounded-lg border p-3 transition outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-blue)] ${
                      active
                        ? 'border-[var(--accent)] bg-[var(--accent-bg)] ring-1 ring-[var(--accent-border)]'
                        : 'border-[var(--border-warm)] bg-[var(--ivory)] hover:border-[var(--accent-border)]'
                    }`}
                    role="button"
                    tabIndex={0}
                    aria-pressed={active}
                    aria-label={`${project.name}，点击后提问将关联此项目`}
                    onClick={() => onToggleProject(project.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onToggleProject(project.id)
                      }
                    }}
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-semibold text-[var(--text-h)]">{project.name}</span>
                      <a
                        href={`https://github.com/${project.repo}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-[var(--terracotta)] underline-offset-2 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <Github size={14} strokeWidth={2} className="shrink-0 opacity-90" aria-hidden />
                        {project.repo}
                      </a>
                    </div>
                    <dl className="mt-2.5 space-y-2 text-xs text-[var(--text)]">
                      <div>
                        <dt className="font-medium text-[var(--text-h)]">技术栈</dt>
                        <dd className="mt-0.5 leading-relaxed">{project.techStack}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-[var(--text-h)]">项目介绍</dt>
                        <dd className="mt-0.5 leading-relaxed">{project.intro}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-[var(--text-h)]">关键词</dt>
                        <dd className="mt-0.5">
                          <span className="inline-block rounded-full border border-[var(--border-warm)] bg-[var(--bg)] px-2 py-0.5 text-[11px] text-[var(--text-h)]">
                            {project.tag}
                          </span>
                        </dd>
                      </div>
                    </dl>
                  </article>
                )
              })}
            </div>
          </section>

          {showKnowledgePanel ? (
            <section
              className="mt-3 rounded-xl border border-[var(--border-warm)] bg-[var(--bg)] p-3"
              aria-label="知识库上传与同步"
            >
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-h)]">
                <DatabaseZap size={16} strokeWidth={2} aria-hidden />
                知识库更新（支持重新上传简历覆盖旧版本）
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {resumeOverwriteSelectable ? (
                  <label className="inline-flex items-center gap-2 rounded-md border border-[var(--border-warm)] bg-[var(--ivory)] px-3 py-2 text-xs text-[var(--text)]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[var(--terracotta)]"
                      checked={replaceExistingKnowledge}
                      onChange={(e) => onReplaceExistingKnowledgeChange(e.target.checked)}
                      disabled={uploadBusy}
                    />
                    <span>
                      {replaceExistingKnowledge ? '覆盖模式（会删除同名旧分块）' : '追加模式（保留旧分块）'}
                    </span>
                  </label>
                ) : (
                  <p className="rounded-md border border-[var(--border-warm)] bg-[var(--ivory)] px-3 py-2 text-xs text-[var(--text)]">
                    当前环境已关闭覆盖入库，上传简历将始终以追加模式写入（不删除同名旧分块）。
                  </p>
                )}
                <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-[var(--border-warm)] bg-[var(--ivory)] px-3 py-2 text-sm text-[var(--text-h)] hover:bg-[var(--warm-sand)]">
                  <FileUp size={14} strokeWidth={2} aria-hidden />
                  {uploadBusy ? '上传中…' : '上传/重传简历'}
                  <input
                    className="hidden"
                    type="file"
                    accept=".txt,.pdf,.doc,.docx"
                    disabled={uploadBusy}
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null
                      onSetSelectedResumeName(file?.name ?? null)
                      void onUploadResume(file, replaceExistingKnowledge)
                      e.currentTarget.value = ''
                    }}
                  />
                </label>
                {selectedResumeName ? (
                  <p className="text-xs text-[var(--text)]">已选择：{selectedResumeName}</p>
                ) : null}
                <input
                  className="h-9 rounded-md border border-[var(--border-warm)] bg-[var(--bg)] px-3 text-sm text-[var(--text-h)] outline-none focus:ring-2 focus:ring-[var(--focus-blue)]"
                  value={githubUser}
                  onChange={(e) => onGithubUserChange(e.target.value)}
                  placeholder="GitHub 用户名"
                  disabled={githubBusy}
                />
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--border-warm)] bg-[var(--ivory)] px-3 py-2 text-sm text-[var(--text-h)] hover:bg-[var(--warm-sand)] disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => void onSyncGithub()}
                  disabled={githubBusy}
                >
                  <GitBranch size={14} strokeWidth={2} aria-hidden />
                  {githubBusy ? '同步中…' : '同步 GitHub'}
                </button>
              </div>
              {ingestMessage ? <p className="mt-2 text-xs text-[var(--text)]">{ingestMessage}</p> : null}
            </section>
          ) : null}
        </>
      ) : null}
    </aside>
  )
}
