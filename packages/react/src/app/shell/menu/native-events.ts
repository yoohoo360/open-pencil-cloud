import { useEffect } from 'react'

import { isDesktopShell, listenDesktopMenuEvent } from '#react/app/desktop/bridge'

/** Listen for native menu ids (`menu-event`) while the React shell is mounted. */
export function useNativeMenuEvents(handler: (id: string) => void): void {
  useEffect(() => {
    // Runtime check — import-time `IS_TAURI` can be wrong if the core chunk
    // evaluated before the Electron preload stub landed.
    if (!isDesktopShell()) return
    return listenDesktopMenuEvent(handler)
  }, [handler])
}
