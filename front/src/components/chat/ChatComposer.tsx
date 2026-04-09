import { Bot, Quote, SendHorizonal, X } from 'lucide-react'
import type { FormEvent, KeyboardEvent, RefObject } from 'react'

type ChatComposerProps = {
  quotedText: string | null
  onRemoveQuotedText: () => void
  inputRef: RefObject<HTMLTextAreaElement | null>
  input: string
  onInputChange: (value: string) => void
  canSend: boolean
  inputDisabled: boolean
  onSubmitQuestion: () => Promise<void>
  busyActive: boolean
  paused: boolean
  status: 'submitted' | 'streaming' | 'ready' | 'error'
}

export function ChatComposer({
  quotedText,
  onRemoveQuotedText,
  inputRef,
  input,
  onInputChange,
  canSend,
  inputDisabled,
  onSubmitQuestion,
  busyActive,
  paused,
  status,
}: ChatComposerProps) {
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    void onSubmitQuestion()
  }

  function onInputKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (canSend) void onSubmitQuestion()
    }
  }

  const statusText = paused
    ? '已暂停，可继续输入'
    : status === 'ready'
      ? '就绪'
      : status === 'submitted' || status === 'streaming'
        ? 'thinking...'
        : '出错'
  const isThinking = !paused && (status === 'submitted' || status === 'streaming')

  return (
    <form className="mt-2" onSubmit={onSubmit}>
      {quotedText ? (
        <div
          className="mt-2 flex items-center gap-2 rounded-lg border border-[var(--accent-border)] bg-[var(--accent-bg)] px-3 py-2 text-xs text-[var(--text-h)]"
          role="note"
          aria-label="当前引用"
        >
          <span className="inline-flex items-center gap-1 font-medium">
            <Quote size={13} strokeWidth={2} aria-hidden />
            引用
          </span>
          <span className="min-w-0 flex-1 truncate">{quotedText}</span>
          <button
            type="button"
            className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-black/5"
            onClick={onRemoveQuotedText}
            aria-label="移除引用"
          >
            <X size={13} strokeWidth={2} aria-hidden />
          </button>
        </div>
      ) : null}

      <textarea
        ref={inputRef}
        className="mt-2 min-h-[96px] w-full resize-y rounded-xl border border-[var(--border-warm)] bg-[var(--bg)] px-4 py-3 text-base text-[var(--text-h)] outline-none transition focus:ring-2 focus:ring-inset focus:ring-[var(--focus-blue)] disabled:opacity-60"
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={onInputKeyDown}
        placeholder="输入消息，Enter 发送，Shift+Enter 换行"
        rows={3}
        disabled={inputDisabled}
        aria-label="消息输入"
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="inline-flex min-h-6 items-center gap-2 text-sm text-[var(--text)]">
          {busyActive && (
            <Bot className="animate-spin" size={14} strokeWidth={2} aria-hidden />
          )}
          {isThinking ? (
            <span className="thinking-inline gap-0.5">
              <span className="thinking-word">Thinking</span>
              <span className="thinking-dot">.</span>
              <span className="thinking-dot thinking-dot--2">.</span>
              <span className="thinking-dot thinking-dot--3">.</span>
            </span>
          ) : (
            statusText
          )}
        </span>
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--terracotta)] px-5 py-2.5 text-sm font-medium text-[var(--ivory)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canSend}
        >
          <SendHorizonal size={16} strokeWidth={2} aria-hidden />
          发送
        </button>
      </div>
    </form>
  )
}
