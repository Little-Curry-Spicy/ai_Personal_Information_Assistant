import type { UIMessage } from 'ai'
import { Bot, UserRound } from 'lucide-react'
import type { RefObject } from 'react'
import { MessagePart } from '../ToolPanels'

export type ChatStarterItem = {
  /** 按钮上展示的短文案 */
  label: string
  /** 实际发给模型的完整问题 */
  prompt: string
}

type ChatMessagesProps = {
  messages: UIMessage[]
  lastAssistantId?: string
  /** 已发出用户消息，助手消息尚未写入列表（建连/等流式首包）时展示 */
  awaitingAssistantBubble?: boolean
  busyActive: boolean
  paused: boolean
  messagesRef: RefObject<HTMLDivElement | null>
  /** 无消息时展示的欢迎语（助手口吻，静态展示） */
  welcomeGreeting?: string
  starterQuestions?: ChatStarterItem[]
  onStarterQuestion?: (prompt: string) => void
  startersDisabled?: boolean
}

export function ChatMessages({
  messages,
  lastAssistantId,
  awaitingAssistantBubble = false,
  busyActive,
  paused,
  messagesRef,
  welcomeGreeting,
  starterQuestions = [],
  onStarterQuestion,
  startersDisabled = false,
}: ChatMessagesProps) {
  const showWelcome = messages.length === 0 && welcomeGreeting

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-xl border border-[var(--border-warm)] bg-[var(--bg)] p-4"
      role="log"
      aria-live="polite"
      ref={messagesRef}
    >
      {showWelcome ? (
        <section aria-label="开场引导" className="flex shrink-0 flex-col gap-4">
          <article className="flex items-start gap-2 justify-start">
            <span
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--border-warm)] bg-[var(--ivory)] text-[var(--text)]"
              aria-hidden
            >
              <Bot size={14} strokeWidth={2} />
            </span>
            <div className="max-w-[min(100%,36rem)] rounded-xl border border-[var(--border-warm)] bg-[var(--ivory)] p-3 shadow-sm">
              <p className="m-0 text-sm leading-relaxed text-[var(--text-h)]">{welcomeGreeting}</p>
            </div>
          </article>

          {starterQuestions.length > 0 && onStarterQuestion ? (
            <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-[var(--border-warm)] bg-[var(--tool-panel-bg-2)] p-3 sm:ml-9 sm:p-4">
              <p className="m-0 text-xs font-medium uppercase tracking-wide text-[var(--text)]">
                可以试试问
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {starterQuestions.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    disabled={startersDisabled}
                    onClick={() => onStarterQuestion(item.prompt)}
                    className="min-h-11 rounded-xl border border-[var(--border-warm)] bg-[var(--bg)] px-3 py-2.5 text-left text-sm leading-snug text-[var(--text-h)] shadow-sm transition hover:border-[var(--terracotta)] hover:bg-[var(--ivory)] disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-[var(--social-bg)]"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {messages.map((message) => {
        let lastTextPartIdx = -1
        message.parts.forEach((p, i) => {
          if (p.type === 'text') lastTextPartIdx = i
        })
        const isUser = message.role === 'user'
        // 流式协议里 tool 会先于正文写入 parts；只渲染 text 会看不到工具过程，这里按顺序渲染全部 parts。
        const showThinkingBubble =
          !isUser &&
          message.parts.length === 0 &&
          message.id === lastAssistantId &&
          busyActive &&
          !paused

        return (
          <article
            key={message.id}
            className={`flex items-center gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
          >
            {!isUser && (
              <span
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--border-warm)] bg-[var(--ivory)] text-[var(--text)]"
                aria-label="助手"
                title="助手"
              >
                <Bot size={14} strokeWidth={2} aria-hidden />
              </span>
            )}

            <div
              className={`rounded-xl border p-3 shadow-sm ${
                isUser ? 'max-w-[78%] border-[var(--accent-border)] bg-[var(--accent-bg)]'
                  : 'max-w-[min(100%,40rem)] border-[var(--border-warm)] bg-[var(--ivory)]'
              }`}
            >
              <div className="flex min-w-0 flex-col gap-2">
                {message.parts.map((part, index) => (
                  <MessagePart
                    key={`${message.id}-p-${index}`}
                    part={part}
                    textStreamActive={
                      part.type === 'text' &&
                      message.role === 'assistant' &&
                      message.id === lastAssistantId &&
                      index === lastTextPartIdx &&
                      busyActive
                    }
                    paused={paused}
                  />
                ))}
                {showThinkingBubble && (
                  <p className="thinking-inline gap-0.5 text-sm text-[var(--text)]">
                    <span className="thinking-word">Thinking</span>
                    <span className="thinking-dot">.</span>
                    <span className="thinking-dot thinking-dot--2">.</span>
                    <span className="thinking-dot thinking-dot--3">.</span>
                  </p>
                )}
              </div>
            </div>

            {isUser && (
              <span
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--accent-border)] bg-[var(--accent-bg)] text-[var(--text)]"
                aria-label="你"
                title="你"
              >
                <UserRound size={14} strokeWidth={2} aria-hidden />
              </span>
            )}
          </article>
        )
      })}

      {awaitingAssistantBubble && (
        <article className="flex items-center gap-2 justify-start">
          <span
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--border-warm)] bg-[var(--ivory)] text-[var(--text)]"
            aria-label="助手"
            title="助手"
          >
            <Bot size={14} strokeWidth={2} aria-hidden />
          </span>
          <div className="max-w-[78%] rounded-xl border border-[var(--border-warm)] bg-[var(--ivory)] p-3 shadow-sm">
            <p className="thinking-inline m-0 gap-0.5 text-sm text-[var(--text)]">
              <span className="thinking-word">Thinking</span>
              <span className="thinking-dot">.</span>
              <span className="thinking-dot thinking-dot--2">.</span>
              <span className="thinking-dot thinking-dot--3">.</span>
            </p>
          </div>
        </article>
      )}
    </div>
  )
}
