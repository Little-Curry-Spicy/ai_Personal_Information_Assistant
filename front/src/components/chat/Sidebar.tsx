import {
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  DatabaseZap,
  FileUp,
  GitBranch,
} from 'lucide-react'

export type ProjectCard = {
  id: string
  name: string
  repo: string
  highlight: string
}

type SidebarProps = {
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
  projectCards: ProjectCard[]
  activeProjectId: string | null
  onToggleProject: (projectId: string) => void
  onAskProjectQuestion: (project: ProjectCard, dimension: 'role' | 'difficulty' | 'metrics') => void
  busyActive: boolean
  uploadBusy: boolean
  selectedResumeName: string | null
  onUploadResume: (file?: File | null, replaceExisting?: boolean) => Promise<void>
  replaceExistingKnowledge: boolean
  onReplaceExistingKnowledgeChange: (value: boolean) => void
  onSetSelectedResumeName: (name: string | null) => void
  githubUser: string
  onGithubUserChange: (value: string) => void
  githubBusy: boolean
  onSyncGithub: () => Promise<void>
  ingestMessage: string | null
}

export function Sidebar({
  sidebarCollapsed,
  onToggleSidebar,
  projectCards,
  activeProjectId,
  onToggleProject,
  onAskProjectQuestion,
  busyActive,
  uploadBusy,
  selectedResumeName,
  onUploadResume,
  replaceExistingKnowledge,
  onReplaceExistingKnowledgeChange,
  onSetSelectedResumeName,
  githubUser,
  onGithubUserChange,
  githubBusy,
  onSyncGithub,
  ingestMessage,
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
            aria-label="代表项目快捷提问"
          >
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-h)]">
              <BriefcaseBusiness size={16} strokeWidth={2} aria-hidden />
              代表项目
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2.5">
              {projectCards.map((project) => {
                const active = activeProjectId === project.id
                return (
                  <article
                    key={project.id}
                    className={`cursor-pointer rounded-lg border p-3 transition ${
                      active
                        ? 'border-[var(--accent)] bg-[var(--accent-bg)]'
                        : 'border-[var(--border-warm)] bg-[var(--ivory)] hover:border-[var(--accent-border)]'
                    }`}
                    onClick={() => onToggleProject(project.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onToggleProject(project.id)
                      }
                    }}
                    aria-expanded={active}
                    aria-label={`${project.name} 项目卡片`}
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-semibold text-[var(--text-h)]">{project.name}</span>
                      <span className="text-xs text-[var(--text)]">{project.repo}</span>
                    </div>
                    <p className="mt-2 text-xs text-[var(--text)]">{project.highlight}</p>
                    {active ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-md border border-[var(--border-warm)] bg-[var(--bg)] px-2.5 py-1.5 text-xs text-[var(--text-h)] hover:bg-[var(--warm-sand)] disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={(e) => {
                            e.stopPropagation()
                            onAskProjectQuestion(project, 'role')
                          }}
                          disabled={busyActive}
                        >
                          角色是什么
                        </button>
                        <button
                          type="button"
                          className="rounded-md border border-[var(--border-warm)] bg-[var(--bg)] px-2.5 py-1.5 text-xs text-[var(--text-h)] hover:bg-[var(--warm-sand)] disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={(e) => {
                            e.stopPropagation()
                            onAskProjectQuestion(project, 'difficulty')
                          }}
                          disabled={busyActive}
                        >
                          最大难点是什么
                        </button>
                        <button
                          type="button"
                          className="rounded-md border border-[var(--border-warm)] bg-[var(--bg)] px-2.5 py-1.5 text-xs text-[var(--text-h)] hover:bg-[var(--warm-sand)] disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={(e) => {
                            e.stopPropagation()
                            onAskProjectQuestion(project, 'metrics')
                          }}
                          disabled={busyActive}
                        >
                          结果指标是什么
                        </button>
                      </div>
                    ) : null}
                  </article>
                )
              })}
            </div>
          </section>

          <section
            className="mt-3 rounded-xl border border-[var(--border-warm)] bg-[var(--bg)] p-3"
            aria-label="知识库上传与同步"
          >
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-h)]">
              <DatabaseZap size={16} strokeWidth={2} aria-hidden />
              知识库更新（支持重新上传简历覆盖旧版本）
            </div>
            <div className="mt-3 flex flex-col gap-2">
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
        </>
      ) : null}
    </aside>
  )
}
