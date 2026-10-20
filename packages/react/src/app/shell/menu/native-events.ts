import { useEffect } from 'react'

import { IS_TAURI } from '@open-pencil/core/constants'

import { listenDesktopMenuEvent } from '#react/app/desktop/bridge'

/** Listen for native menu ids (`menu-event`) while the React shell is mounted. */
export function useNativeMenuEvents(handler: (id: string) => void): void {
  useEffect(() => {
    if (!IS_TAURI) return
    return listenDesktopMenuEvent(handler)
  }, [handler])
}
