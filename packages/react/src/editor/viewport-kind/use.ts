import { useSyncExternalStore } from 'react'

import { IS_BROWSER } from '@open-pencil/core/constants'

const MOBILE_QUERY = '(max-width: 767px)'

function subscribe(onStoreChange: () => void) {
  if (!IS_BROWSER) return () => {}
  const media = window.matchMedia(MOBILE_QUERY)
  media.addEventListener('change', onStoreChange)
  return () => media.removeEventListener('change', onStoreChange)
}

function getSnapshot() {
  return IS_BROWSER && window.matchMedia(MOBILE_QUERY).matches
}

/**
 * Returns coarse viewport kind flags used by responsive editor UI.
 */
export function useViewportKind() {
  const isMobile = useSyncExternalStore(subscribe, getSnapshot, () => false)
  return {
    isMobile,
    isDesktop: !isMobile
  }
}
