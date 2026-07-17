import { useSyncExternalStore } from 'react'
import { IS_BROWSER } from '@open-pencil/core/constants'
import { computed } from '#react/internal/reactive'

const MOBILE_BREAKPOINT = 768

function getIsMobile() {
  if (!IS_BROWSER) return false
  return window.innerWidth < MOBILE_BREAKPOINT
}

function subscribeToResize(onChange: () => void) {
  if (!IS_BROWSER) return () => undefined
  window.addEventListener('resize', onChange)
  return () => window.removeEventListener('resize', onChange)
}

/**
 * Returns coarse viewport kind flags used by responsive editor UI.
 */
export function useViewportKind() {
  const isMobileValue = useSyncExternalStore(subscribeToResize, getIsMobile, () => false)
  const isMobile = { value: isMobileValue }
  const isDesktop = computed(() => !isMobile.value)

  return {
    isMobile,
    isDesktop
  }
}
