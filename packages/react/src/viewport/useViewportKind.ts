import { useEffect, useState } from 'react'

const MOBILE_BREAKPOINT = 768

/**
 * Returns coarse viewport kind flags used by responsive editor UI.
 */
export function useViewportKind() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false
  )

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => setIsMobile(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return {
    isMobile,
    isDesktop: !isMobile
  }
}
