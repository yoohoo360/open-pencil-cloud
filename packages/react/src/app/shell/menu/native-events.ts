import { useEffect, useRef } from 'react'

import { isDesktopShell, listenDesktopMenuEvent } from '#react/app/desktop/bridge'

/**
 * Renderer-side fan-out so AppMenu + EditorWorkspace can both opt in without
 * double-subscribing the Electron preload channel (which would double-fire).
 */
const handlers = new Set<(id: string) => void>()
let bridgeUnlisten: (() => void) | null = null

function ensureBridge(): void {
  if (bridgeUnlisten || !isDesktopShell()) return
  bridgeUnlisten = listenDesktopMenuEvent((id) => {
    for (const handler of handlers) {
      try {
        handler(id)
      } catch (error) {
        console.error('[AppMenu] native menu handler failed', id, error)
      }
    }
  })
}

/**
 * Listen for native menu ids (`menu-event`) while the React shell is mounted.
 * Uses a ref so the latest handler runs even if the listen effect does not rebind.
 */
export function useNativeMenuEvents(handler: (id: string) => void, enabled = true): void {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    if (!enabled) return

    const wrap = (id: string) => {
      handlerRef.current(id)
    }

    function bind(): boolean {
      if (!isDesktopShell()) return false
      handlers.add(wrap)
      ensureBridge()
      return true
    }

    bind()
    // Preload normally wins the race; retry briefly if the bridge appears late.
    const timers = [0, 50, 200, 1000].map((ms) => window.setTimeout(() => bind(), ms))

    return () => {
      for (const timer of timers) window.clearTimeout(timer)
      handlers.delete(wrap)
    }
  }, [enabled])
}
