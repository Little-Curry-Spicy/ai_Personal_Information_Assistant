import type { UIMessage } from 'ai'
import { Bot, MessageCircleMore, UserRound } from 'lucide-react'
import type { RefObject } from 'react'
import { MessagePart } from '../ToolPanels'

type ChatMessagesProps = {
  messages: UIMessage[]
  lastAssistantId?: string
  busyActive: boolean
  paused: boolean
  messagesRef: RefObject<HTMLDivElement | null>
}

export function ChatMessages({
  messages,
  lastAssistantId,
  busyActive,
  paused,
  messagesRef,
}: ChatMessagesProps) {
  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-xl border border-[var(--border-warm)] bg-[var(--bg)] p-4"
      role="log"
      aria-live="polite"
      ref={messagesRef}
    >
      {messages.length === 0 && (
        <p className="pointer-events-none absolute inset-x-0 top-[88%] flex -translate-y-1/2 flex-wrap items-center justify-center gap-2 px-4 text-center text-sm text-[var(--text)]">
          <MessageCircleMore className="shrink-0 text-[var(--terracotta)]" size={18} strokeWidth={2} aria-hidden />
          仅可询问关于我的工作、项目与基本个人信息；输入问题开始对话
        </p>
      )}

      {messages.map((message) => {
        const textParts = message.parts
          .map((part, index) => ({ part, index }))
          .filter(({ part }) => part.type === 'text')
        const lastTextPartIdx = textParts[textParts.length - 1]?.index
        const isUser = message.role === 'user'
        const showThinkingBubble =
          !isUser &&
          textParts.length === 0 &&
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
              className={`max-w-[78%] rounded-xl border p-3 shadow-sm ${
                isUser
                  ? 'border-[var(--accent-border)] bg-[var(--accent-bg)]'
                  : 'border-[var(--border-warm)] bg-[var(--ivory)]'
              }`}
            >
              <div className="flex min-w-0 flex-col gap-2">
                {textParts.map(({ part, index }) => (
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
    </div>
  )
}
