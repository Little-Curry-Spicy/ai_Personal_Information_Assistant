import { createCodePlugin } from '@streamdown/code'
import { mermaid } from '@streamdown/mermaid'
import { ExternalLink, Link2, Copy, X } from 'lucide-react'
import { Streamdown, type ThemeInput } from 'streamdown'
import 'streamdown/styles.css'
import './StreamdownText.css'

const shikiTheme: [ThemeInput, ThemeInput] = ['github-light', 'github-dark']

const codePlugin = createCodePlugin({ themes: shikiTheme })

type LinkSafetyModalProps = {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  url: string
}

function LinkSafetyModal({ isOpen, onClose, onConfirm, url }: LinkSafetyModalProps) {
  if (!isOpen) return null

  return (
    <div className="chat-link-safety" role="dialog" aria-modal="true" aria-label="外链确认">
      <div className="chat-link-safety__card">
        <button type="button" className="chat-link-safety__close" onClick={onClose} aria-label="关闭">
          <X size={16} strokeWidth={2} aria-hidden />
        </button>
        <div className="chat-link-safety__title">
          <ExternalLink size={16} strokeWidth={2} aria-hidden />
          打开外部链接？
        </div>
        <p className="chat-link-safety__desc">你将访问外部网站，请确认链接来源可信。</p>
        <div className="chat-link-safety__url">
          <Link2 size={14} strokeWidth={2} aria-hidden />
          <span>{url}</span>
        </div>
        <div className="chat-link-safety__actions">
          <button
            type="button"
            className="chat-link-safety__btn chat-link-safety__btn--ghost"
            onClick={() => void navigator.clipboard?.writeText(url)}
          >
            <Copy size={14} strokeWidth={2} aria-hidden />
            复制链接
          </button>
          <button type="button" className="chat-link-safety__btn chat-link-safety__btn--primary" onClick={onConfirm}>
            <ExternalLink size={14} strokeWidth={2} aria-hidden />
            打开链接
          </button>
        </div>
      </div>
    </div>
  )
}

export type StreamdownTextProps = {
  children: string
  /** 助手最后一段文本在流式输出时为 true，用于 Streamdown 动画与未闭合 Markdown */
  isStreaming?: boolean
}

export function StreamdownText({
  children,
  isStreaming = false,
}: StreamdownTextProps) {
  return (
    <div className="chat-streamdown">
      <Streamdown
        mode="streaming"
        isAnimating={isStreaming}
        parseIncompleteMarkdown
        shikiTheme={shikiTheme}
        plugins={{ mermaid, code: codePlugin }}
        className="chat-streamdown__inner"
        linkSafety={{
          enabled: true,
          renderModal: (props) => <LinkSafetyModal {...props} />,
        }}
        translations={{
          openExternalLink: '打开外部链接？',
          externalLinkWarning: '你将访问外部网站，请确认链接来源可信。',
          copyLink: '复制链接',
          openLink: '打开链接',
          close: '关闭',
        }}
      >
        {children}
      </Streamdown>
    </div>
  )
}
