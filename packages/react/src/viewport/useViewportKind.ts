import { useEffect, useState } from 'react'

const MOBILE_BREAKPOINT = 768

function getIsMobile() {
  if (typeof window === 'undefined') return false
  return window.innerWidth < MOBILE_BREAKPOINT
}

/**
 * Returns coarse viewport kind flags used by responsive editor UI.
 */
export function useViewportKind() {
  const [isMobile, setIsMobile] = useState(getIsMobile)

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    setIsMobile(mq.matches)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return {
    isMobile,
    isDesktop: !isMobile
  }
}
