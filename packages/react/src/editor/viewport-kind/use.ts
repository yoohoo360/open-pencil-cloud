import { useBreakpoints } from '#react/shared/dom/hooks'

/**
 * Returns coarse viewport kind flags used by responsive editor UI.
 */
export function useViewportKind() {
  const breakpoints = useBreakpoints({ mobile: 768 })
  const isMobile = breakpoints.smaller('mobile')
  const isDesktop = !isMobile

  return {
    isMobile,
    isDesktop
  }
}
