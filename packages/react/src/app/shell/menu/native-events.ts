import { useEffect } from 'react'

import { IS_TAURI } from '@open-pencil/core/constants'

/** Listen for Tauri native menu ids (`menu-event`) while the React shell is mounted. */
export function useNativeMenuEvents(handler: (id: string) => void): void {
  useEffect(() => {
    if (!IS_TAURI) return

    let disposed = false
    let unlisten: (() => void) | undefined

    void import('@tauri-apps/api/event').then(({ listen }) =>
      listen<string>('menu-event', (event) => {
        handler(event.payload)
      }).then((fn) => {
        if (disposed) fn()
        else unlisten = fn
      })
    )

    return () => {
      disposed = true
      unlisten?.()
      unlisten = undefined
    }
  }, [handler])
}
