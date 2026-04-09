import { useAuth } from '@clerk/clerk-react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { AlertCircle, CircleStop, Play, Quote, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ClerkUserBar } from './components/ClerkUserBar'
import { ChatComposer } from './components/chat/ChatComposer'
import { ChatMessages } from './components/chat/ChatMessages'
import { Sidebar, type ProjectCard } from './components/chat/Sidebar'
import { isClerkAuthEnabled } from './config/clerk'
import { useKnowledgeIngest } from './hooks/useKnowledgeIngest'
import { useSelectionBubble } from './hooks/useSelectionBubble'

/**
 * 后端根地址。
 * - 生产（Docker + Nginx 反代）：不设 `VITE_API_BASE`，用同源相对路径 `/ai`、`/knowledge`。
 * - 本地直连后端：设 `VITE_API_BASE=http://localhost:3001`；仅跑 `vite dev` 时也可不设（走 `vite.config` 代理）。
 */
const API_BASE = import.meta.env.VITE_API_BASE?.trim() ?? ''
const APP_NAME = 'TSK信息助手'

const PROJECT_CARDS: ProjectCard[] = [
  {
    id: 'xclear',
    name: 'XClear-admin',
    repo: 'Little-Curry-Spicy/XClear-admin',
    highlight: '后台管理系统工程化实践',
  },
  {
    id: 'movie',
    name: 'movie-nest',
    repo: 'Little-Curry-Spicy/movie-nest',
    highlight: 'NestJS 后端服务与模块化架构',
  },
  {
    id: 'ai',
    name: 'ai-demo',
    repo: 'Little-Curry-Spicy/ai-demo',
    highlight: 'RAG / MCP / 向量检索实战',
  },
]

export default function App() {
  if (isClerkAuthEnabled()) {
    return <AppWithClerkAuth />
  }
  return <ChatApp />
}

/** 仅在已挂载 ClerkProvider 且前端启用 Clerk 时使用 */
function AppWithClerkAuth() {
  const { getToken } = useAuth()
  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const t = await getToken()
    if (!t) return {}
    return { Authorization: `Bearer ${t}` }
  }, [getToken])
  return <ChatApp getAuthHeaders={getAuthHeaders} />
}

type ChatAppProps = {
  getAuthHeaders?: () => Promise<Record<string, string>>
}

function ChatApp(props: ChatAppProps = {}) {
  const { getAuthHeaders } = props
  const chatUrl = `${API_BASE}/ai/chat`
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const messagesRef = useRef<HTMLDivElement>(null)

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: chatUrl,
        fetch: async (input, init) => {
          const headers = new Headers(init?.headers)
          const extra = await getAuthHeaders?.()
          if (extra) {
            for (const [k, v] of Object.entries(extra)) {
              if (v) headers.set(k, v)
            }
          }
          return fetch(input, { ...init, headers })
        },
      }),
    [chatUrl, getAuthHeaders],
  )

  const { messages, sendMessage, status, stop, error, clearError } = useChat<UIMessage>({
    transport,
  })
  const [input, setInput] = useState('')
  const [quotedText, setQuotedText] = useState<string | null>(null)
  const [paused, setPaused] = useState(false)
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [replaceExistingKnowledge, setReplaceExistingKnowledge] = useState(true)

  const busy = status === 'submitted' || status === 'streaming'
  const busyActive = busy && !paused
  const canSend = (status === 'ready' || paused) && input.trim().length > 0
  const inputDisabled = !paused && status !== 'ready'
  const lastAssistant = messages.filter((m) => m.role === 'assistant').at(-1)
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
  } = useKnowledgeIngest(API_BASE, { getAuthHeaders })

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

  async function askProjectQuestion(project: ProjectCard, dimension: 'role' | 'difficulty' | 'metrics') {
    if (!(status === 'ready' || paused)) return
    const promptMap = {
      role: `针对项目 ${project.repo}，请按“结论->证据->量化结果”回答：这个项目我的角色和职责是什么？`,
      difficulty: `针对项目 ${project.repo}，请按“结论->证据->量化结果”回答：这个项目最大的技术难点是什么，我是怎么解决的？`,
      metrics: `针对项目 ${project.repo}，请按“结论->证据->量化结果”回答：这个项目有哪些可量化结果（性能、效率、交付周期、成本）？`,
    } as const
    setPaused(false)
    setInput('')
    setQuotedText(null)
    await sendMessage({ text: promptMap[dimension] })
  }

  async function submitQuestion() {
    if (!canSend) return
    const plainInput = input
    const quotedPrefix = quotedText ? `引用：\n「${quotedText}」\n\n` : ''
    // 交互上应“点发送立即清空”，避免网络慢时用户误判未提交
    setPaused(false)
    setInput('')
    setQuotedText(null)
    await sendMessage({ text: `${quotedPrefix}${plainInput}` })
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
          <ClerkUserBar />
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
          onToggleProject={(projectId) =>
            setActiveProjectId((current) => (current === projectId ? null : projectId))
          }
          onAskProjectQuestion={(project, dimension) => {
            void askProjectQuestion(project, dimension)
          }}
          busyActive={busyActive}
          uploadBusy={uploadBusy}
          selectedResumeName={selectedResumeName}
          onUploadResume={uploadResume}
          replaceExistingKnowledge={replaceExistingKnowledge}
          onReplaceExistingKnowledgeChange={setReplaceExistingKnowledge}
          onSetSelectedResumeName={setSelectedResumeName}
          githubUser={githubUser}
          onGithubUserChange={setGithubUser}
          githubBusy={githubBusy}
          onSyncGithub={syncGithub}
          ingestMessage={ingestMessage}
        />

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ChatMessages
            messages={messages}
            lastAssistantId={lastAssistant?.id}
            busyActive={busyActive}
            paused={paused}
            messagesRef={messagesRef}
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
