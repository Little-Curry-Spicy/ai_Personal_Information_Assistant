import { useEffect, useRef, useState, type RefObject } from 'react'

export type SelectionBubble = {
  text: string
  x: number
  y: number
}

/**
 * 在消息区内选中文本后，延迟显示“引用提问”浮层。
 */
export function useSelectionBubble(messagesRef: RefObject<HTMLDivElement | null>) {
  const bubbleTimerRef = useRef<number | null>(null)
  const [selectionBubble, setSelectionBubble] = useState<SelectionBubble | null>(null)

  useEffect(() => {
    function clearBubbleTimer() {
      if (bubbleTimerRef.current !== null) {
        window.clearTimeout(bubbleTimerRef.current)
        bubbleTimerRef.current = null
      }
    }

    function hideBubble() {
      clearBubbleTimer()
      setSelectionBubble(null)
    }

    function updateFromSelection() {
      clearBubbleTimer()
      const sel = window.getSelection?.()
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
        hideBubble()
        return
      }

      const text = sel.toString().trim()
      if (!text) {
        hideBubble()
        return
      }

      const anchorNode = sel.anchorNode
      if (!anchorNode) {
        hideBubble()
        return
      }

      const anchorEl =
        anchorNode.nodeType === Node.ELEMENT_NODE
          ? (anchorNode as Element)
          : anchorNode.parentElement
      if (!anchorEl) {
        hideBubble()
        return
      }

      const inMessages = messagesRef.current?.contains(anchorEl) ?? false
      if (!inMessages) {
        hideBubble()
        return
      }

      const range = sel.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      if (!rect || (!rect.width && !rect.height)) {
        hideBubble()
        return
      }

      bubbleTimerRef.current = window.setTimeout(() => {
        setSelectionBubble({
          text,
          x: rect.left + rect.width / 2,
          y: rect.top - 8,
        })
      }, 1000)
    }

    document.addEventListener('selectionchange', updateFromSelection)
    window.addEventListener('scroll', hideBubble, true)
    window.addEventListener('resize', hideBubble)
    return () => {
      clearBubbleTimer()
      document.removeEventListener('selectionchange', updateFromSelection)
      window.removeEventListener('scroll', hideBubble, true)
      window.removeEventListener('resize', hideBubble)
    }
  }, [messagesRef])

  return {
    selectionBubble,
    clearSelectionBubble: () => setSelectionBubble(null),
  }
}
