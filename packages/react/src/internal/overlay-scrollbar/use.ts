import { useCallback, useRef } from 'react'

const SCROLLING_HIDE_MS = 700

export function useOverlayScrollbar<T extends HTMLElement>() {
  const cleanupRef = useRef<(() => void) | null>(null)

  return useCallback((node: T | null) => {
    cleanupRef.current?.()
    cleanupRef.current = null
    if (!node) return
    let timer = 0
    function onScroll() {
      node.dataset.scrolling = ''
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        delete node.dataset.scrolling
      }, SCROLLING_HIDE_MS)
    }
    node.addEventListener('scroll', onScroll, { passive: true })
    cleanupRef.current = () => {
      node.removeEventListener('scroll', onScroll)
      window.clearTimeout(timer)
    }
  }, [])
}
