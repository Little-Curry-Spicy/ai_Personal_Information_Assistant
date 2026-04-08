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
        <p className="pointer-events-none absolute inset-x-0 top-[76%] flex -translate-y-1/2 items-center justify-center gap-2 px-4 text-sm text-[var(--text)]">
          <MessageCircleMore className="text-[var(--terracotta)]" size={18} strokeWidth={2} aria-hidden />
          输入问题开始对话
        </p>
      )}

      {messages.map((message) => {
        const textPartIndices = message.parts
          .map((p, i) => (p.type === 'text' ? i : -1))
          .filter((i) => i >= 0)
        const lastTextPartIdx = textPartIndices[textPartIndices.length - 1]
        const isUser = message.role === 'user'

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
