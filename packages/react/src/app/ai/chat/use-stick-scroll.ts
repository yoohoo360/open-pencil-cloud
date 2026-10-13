import { useCallback, useEffect, useRef } from 'react'

/** Distance from bottom that still counts as “following” the stream. */
export const CHAT_STICK_BOTTOM_PX = 48

/** Delay before auto-scrolling while new tokens / tools arrive. */
export const CHAT_AUTO_SCROLL_DEBOUNCE_MS = 1000

/**
 * Stick-to-bottom for chat: debounced auto-scroll (1s). Manual scroll up
 * cancels any pending auto-scroll and stops following until the user
 * returns to the bottom (or `resumeStick` on send).
 */
export function useChatStickScroll(followKey: unknown) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)
  const lastScrollTop = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancelScheduledScroll = useCallback(() => {
    if (timerRef.current == null) return
    clearTimeout(timerRef.current)
    timerRef.current = null
  }, [])

  const scrollToEnd = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [])

  const onScroll = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    const atBottom = distance <= CHAT_STICK_BOTTOM_PX
    const scrolledUp = el.scrollTop < lastScrollTop.current - 1
    lastScrollTop.current = el.scrollTop

    if (scrolledUp && !atBottom) {
      stickToBottom.current = false
      cancelScheduledScroll()
      return
    }
    if (atBottom) stickToBottom.current = true
  }, [cancelScheduledScroll])

  const resumeStick = useCallback(() => {
    stickToBottom.current = true
    cancelScheduledScroll()
    scrollToEnd()
  }, [cancelScheduledScroll, scrollToEnd])

  useEffect(() => {
    if (!stickToBottom.current) return
    cancelScheduledScroll()
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      if (!stickToBottom.current) return
      scrollToEnd()
    }, CHAT_AUTO_SCROLL_DEBOUNCE_MS)
    return cancelScheduledScroll
  }, [followKey, cancelScheduledScroll, scrollToEnd])

  return {
    scrollerRef,
    messagesEndRef,
    onScroll,
    resumeStick
  }
}
