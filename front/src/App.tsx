import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { AlertCircle, CircleStop, ExternalLink, Play, Quote, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChatComposer } from './components/chat/ChatComposer'
import { ChatMessages, type ChatStarterItem } from './components/chat/ChatMessages'
import { Sidebar, type ProjectCard } from './components/chat/Sidebar'
import { useKnowledgeIngest } from './hooks/useKnowledgeIngest'
import { useSelectionBubble } from './hooks/useSelectionBubble'

/**
 * 后端根地址。
 * - 生产（Docker + Nginx 反代）：不设 `VITE_API_BASE`，用同源相对路径 `/ai`、`/knowledge`。
 * - 本地直连后端：设 `VITE_API_BASE=http://localhost:3001`；仅跑 `vite dev` 时也可不设（走 `vite.config` 代理）。
 */
const API_BASE = import.meta.env.VITE_API_BASE?.trim() ?? ''
const APP_NAME = 'TSK信息助手'
const PERSONAL_SITE_URL = 'https://1996tsk.top/'

/** 未设置或显式为真时返回 true；`false` / `0` / `off` / `no` 为 false。 */
function parseEnvEnabled(raw: string | undefined): boolean {
  if (raw === undefined || raw === '') return true
  return !['0', 'false', 'no', 'off'].includes(raw.trim().toLowerCase())
}

const RESUME_INGEST_OVERWRITE_SELECTABLE = parseEnvEnabled(import.meta.env.VITE_RESUME_INGEST_OVERWRITE)
/** 侧栏「知识库更新」整块（简历上传 + GitHub 同步）是否展示 */
const SHOW_KNOWLEDGE_PANEL = parseEnvEnabled(import.meta.env.VITE_SHOW_KNOWLEDGE_PANEL)

const CHAT_WELCOME_GREETING =
  '你好 👋🏻！我是 TSK 信息助手，会回答关于你询问TSK的一切问题。可以先从下面选一个常见问题，或在下方输入框直接提问。'

const CHAT_STARTERS: ChatStarterItem[] = [
  {
    label: '简要介绍你的工作经历',
    prompt: '请简要介绍我的工作经历：按时间说明每段工作的公司、岗位、年限与主要成果。',
  },
  {
    label: '你熟悉哪些技术栈？',
    prompt: '根据资料总结我熟悉的技术栈与使用场景，按类别简要列出。',
  },
  {
    label: '介绍一下代表作品项目',
    prompt: '请介绍一个最能代表我能力水平的项目：背景、我的职责、技术难点与可量化结果。',
  },
  {
    label: 'GitHub 上主要做哪些方向？',
    prompt: '根据已同步的 GitHub 资料，说明我主要维护或参与的项目类型与技术方向。',
  },
]

/** 将用户输入包一层上下文，引导模型优先结合该仓库与知识库作答 */
function wrapMessageForProject(project: ProjectCard, body: string): string {
  return `【请围绕 GitHub 仓库 ${project.repo}（项目「${project.name}」）作答；请结合知识库中与该仓库、该项目相关的资料，若资料不足请说明】\n\n${body}`
}

const PROJECT_CARDS: ProjectCard[] = [
  {
    id: 'otc-flutter',
    name: 'OTC-Flutter',
    repo: 'Little-Curry-Spicy/OTC-Flutter',
    techStack: 'Flutter 3.7+ · Dio · SharedPreferences · Material；Android / iOS / Web / 桌面同一套代码',
    intro:
      'OTC365 场外（OTC/P2P）客户端：总资产与收益看板、广告市场与筛选、下单与订单流转、账户与基础设置等完整交易闭环。',
    tag: '金融科技 · 跨端 App',
  },
  {
    id: 'drift-bottle',
    name: 'drift-bottle',
    repo: 'Little-Curry-Spicy/drift-bottle',
    techStack:
      'pnpm Monorepo · Expo ~54 / RN / expo-router · NativeWind · NestJS · TypeORM · Next.js App Router · Supabase（PostgreSQL + RLS）· Clerk · i18next',
    intro:
      '以「漂流瓶」为隐喻的匿名心情应用：登录后扔瓶、在海洋里捞瓶、回复与收藏；可选对接 Nest API 与 Supabase，含品牌官网与统一响应/Swagger。',
    tag: '社交 · Monorepo 全栈',
  },
  {
    id: 'resume-matcher',
    name: 'resume-matcher',
    repo: 'Little-Curry-Spicy/resume-matcher',
    techStack: 'Vue 3 · Vite · TypeScript · NestJS；Docker Compose 一键部署',
    intro:
      '求职场景下简历与岗位描述（JD）对齐：上传简历、粘贴 JD，输出差距分析、面试题预测与带修订标记的润色稿，并支持本地草稿与 PDF 预览。',
    tag: 'AI 工具链 · 产品化',
  },
]

export default function App() {
  const chatUrl = `${API_BASE}/ai/chat`
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const messagesRef = useRef<HTMLDivElement>(null)

  const transport = useMemo(() => new DefaultChatTransport({ api: chatUrl }), [chatUrl])

  const { messages, sendMessage, status, stop, error, clearError } = useChat<UIMessage>({
    transport,
  })
  const [input, setInput] = useState('')
  const [quotedText, setQuotedText] = useState<string | null>(null)
  const [paused, setPaused] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  /** 侧栏选中的代表项目：后续在输入框发送的问题会附带该项目上下文 */
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [replaceExistingKnowledge, setReplaceExistingKnowledge] = useState(
    RESUME_INGEST_OVERWRITE_SELECTABLE,
  )
  /** 点击发送后立刻为 true，避免等 useChat 进入 makeRequest 才出现 Thinking */
  const [connectPending, setConnectPending] = useState(false)

  const busy = status === 'submitted' || status === 'streaming' || connectPending
  const busyActive = busy && !paused
  const canSend = (status === 'ready' || paused) && input.trim().length > 0
  const inputDisabled = !paused && status !== 'ready'
  const lastAssistant = messages.filter((m) => m.role === 'assistant').at(-1)
  const lastMessage = messages.at(-1)
  const awaitingAssistantBubble =
    busyActive && !paused && lastMessage?.role === 'user'

  useEffect(() => {
    if (status === 'submitted' || status === 'streaming' || status === 'error') {
      setConnectPending(false)
    }
  }, [status])
  const { selectionBubble, clearSelectionBubble } = useSelectionBubble(messagesRef)
  const {
    uploadBusy,
    githubBusy,
    githubUser,
    setGithubUser,
    ingestMessage,
    selectedResumeName,
    setSelectedResumeName,
    uploadResume,
    syncGithub,
  } = useKnowledgeIngest(API_BASE)

  const activeProject = useMemo(
    () => PROJECT_CARDS.find((p) => p.id === activeProjectId) ?? null,
    [activeProjectId],
  )

  function onStop() {
    if (busy) {
      stop()
    }
    setPaused(true)
  }

  function onResume() {
    setPaused(false)
    window.requestAnimationFrame(() => {
      inputRef.current?.focus()
    })
  }

  function quoteSelectedText(raw: string) {
    const clipped = raw.length > 480 ? `${raw.slice(0, 480)}...` : raw
    setQuotedText(clipped)
    clearSelectionBubble()
    window.getSelection?.()?.removeAllRanges()
    window.requestAnimationFrame(() => {
      inputRef.current?.focus()
    })
  }

  async function askStarterQuestion(prompt: string) {
    if (busy) return
    if (!(status === 'ready' || paused)) return
    setConnectPending(true)
    setPaused(false)
    setInput('')
    setQuotedText(null)
    await sendMessage({ text: prompt })
  }

  async function submitQuestion() {
    if (!canSend) return
    setConnectPending(true)
    const plainInput = input
    const quotedPrefix = quotedText ? `引用：\n「${quotedText}」\n\n` : ''
    const core = `${quotedPrefix}${plainInput}`
    const text = activeProject ? wrapMessageForProject(activeProject, core) : core
    // 交互上应“点发送立即清空”，避免网络慢时用户误判未提交
    setPaused(false)
    setInput('')
    setQuotedText(null)
    await sendMessage({ text })
  }

  // 流式输出时自动跟随到底部，确保始终看到最新答案
  useEffect(() => {
    const el = messagesRef.current
    if (!el) return
    el.scrollTo({
      top: el.scrollHeight,
      behavior: busyActive ? 'smooth' : 'auto',
    })
  }, [messages, busyActive])

  // 每次回答完成（状态回到 ready）后，自动把焦点放回输入框。
  useEffect(() => {
    if (status !== 'ready') return
    if (paused) return
    window.requestAnimationFrame(() => {
      inputRef.current?.focus()
    })
  }, [status, paused])

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3 text-left">
      <header className="sticky top-0 z-20 flex items-center justify-between rounded-xl border border-[var(--border-warm)] bg-[var(--bg)] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Sparkles className="text-[var(--terracotta)]" size={20} strokeWidth={2} aria-hidden />
          <div>
            <h1 className="m-0 text-4xl font-medium leading-none tracking-tight text-[var(--text-h)]">{APP_NAME}</h1>
          </div>
        </div>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
          <a
            href={PERSONAL_SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-warm)] bg-[var(--ivory)] px-3 py-2 text-sm font-medium text-[var(--text-h)] transition hover:-translate-y-0.5 hover:bg-[var(--warm-sand)]"
          >
            <ExternalLink size={16} strokeWidth={2} aria-hidden />
            个人网站
          </a>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-warm)] bg-[var(--warm-sand)] px-3 py-2 text-sm text-[var(--charcoal-warm)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={paused ? onResume : onStop}
            disabled={!busy && !paused}
          >
            {paused ? (
              <Play size={16} strokeWidth={2} aria-hidden />
            ) : (
              <CircleStop size={16} strokeWidth={2} aria-hidden />
            )}
            {paused ? '恢复' : '停止'}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 gap-3">
        <Sidebar
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
          projectCards={PROJECT_CARDS}
          activeProjectId={activeProjectId}
          onToggleProject={(projectId) => {
            setActiveProjectId((cur) => (cur === projectId ? null : projectId))
            window.requestAnimationFrame(() => inputRef.current?.focus())
          }}
          uploadBusy={uploadBusy}
          selectedResumeName={selectedResumeName}
          onUploadResume={(file, replace) =>
            uploadResume(
              file,
              RESUME_INGEST_OVERWRITE_SELECTABLE ? (replace ?? false) : false,
            )
          }
          resumeOverwriteSelectable={RESUME_INGEST_OVERWRITE_SELECTABLE}
          replaceExistingKnowledge={replaceExistingKnowledge}
          onReplaceExistingKnowledgeChange={setReplaceExistingKnowledge}
          onSetSelectedResumeName={setSelectedResumeName}
          githubUser={githubUser}
          onGithubUserChange={setGithubUser}
          githubBusy={githubBusy}
          onSyncGithub={syncGithub}
          ingestMessage={ingestMessage}
          showKnowledgePanel={SHOW_KNOWLEDGE_PANEL}
        />

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ChatMessages
            messages={messages}
            lastAssistantId={lastAssistant?.id}
            awaitingAssistantBubble={awaitingAssistantBubble}
            busyActive={busyActive}
            paused={paused}
            messagesRef={messagesRef}
            welcomeGreeting={CHAT_WELCOME_GREETING}
            starterQuestions={CHAT_STARTERS}
            onStarterQuestion={(prompt) => {
              void askStarterQuestion(prompt)
            }}
            startersDisabled={busy}
          />
          {selectionBubble ? (
            <button
              type="button"
              className="fixed z-30 inline-flex -translate-x-1/2 -translate-y-full items-center gap-1 rounded-md border border-[var(--accent-border)] bg-[var(--bg)] px-2 py-1 text-xs text-[var(--text-h)] shadow"
              style={{ left: selectionBubble.x, top: selectionBubble.y }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => quoteSelectedText(selectionBubble.text)}
            >
              <Quote size={13} strokeWidth={2} aria-hidden />
              引用提问
            </button>
          ) : null}

          {error && (
            <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
              <div className="flex min-w-0 items-start gap-2">
                <AlertCircle size={16} strokeWidth={2} aria-hidden />
                <span>{error.message}</span>
              </div>
              <button
                type="button"
                className="rounded-md border border-red-200 px-2 py-1 text-xs hover:bg-red-100"
                onClick={() => clearError()}
              >
                关闭
              </button>
            </div>
          )}

          <ChatComposer
            quotedText={quotedText}
            onRemoveQuotedText={() => setQuotedText(null)}
            projectContext={
              activeProject ? { name: activeProject.name, repo: activeProject.repo } : null
            }
            onClearProjectContext={() => setActiveProjectId(null)}
            inputRef={inputRef}
            input={input}
            onInputChange={setInput}
            canSend={canSend}
            inputDisabled={inputDisabled}
            onSubmitQuestion={submitQuestion}
            busyActive={busyActive}
            paused={paused}
            status={status}
          />
        </main>
      </div>
    </div>
  )
}
