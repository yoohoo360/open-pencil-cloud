function electronBridge(): NonNullable<Window['openPencilDesktop']> {
  const bridge = window.openPencilDesktop
  if (!bridge) throw new Error('Electron desktop bridge is unavailable')
  return bridge
}

/** Electron preload — IPC via `openPencilDesktop` (not `@tauri-apps/*`). */
export function isElectronShell(): boolean {
  return typeof window !== 'undefined' && Boolean(window.openPencilDesktop)
}

/** Real Tauri inject — Electron stubs `__TAURI_INTERNALS__`, so exclude Electron bridge. */
export function isNativeTauriShell(): boolean {
  return (
    typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window && !isElectronShell()
  )
}

/** Electron or Tauri — prefer over import-time `IS_TAURI` (preload may race module init). */
export function isDesktopShell(): boolean {
  if (typeof window === 'undefined') return false
  return Boolean(window.openPencilDesktop) || '__TAURI_INTERNALS__' in window
}

/**
 * Invoke a desktop command. Electron uses `openPencilDesktop`; Tauri uses `@tauri-apps/api`.
 * Command names match the Tauri `invoke` surface where possible (`mcp_*`, fonts).
 */
export async function desktopInvoke<T>(command: string, args?: unknown): Promise<T> {
  if (isElectronShell()) {
    return (await electronBridge().invoke(command, args)) as T
  }
  if (isNativeTauriShell()) {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke<T>(command, args as Record<string, unknown> | undefined)
  }
  throw new Error('Not running in a desktop shell')
}

export function listenDesktopMenuEvent(handler: (id: string) => void): () => void {
  if (isElectronShell()) {
    return electronBridge().onMenuEvent(handler)
  }
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
}

export async function desktopHomeDir(): Promise<string> {
  if (isElectronShell()) {
    const home = await electronBridge().homeDir()
    if (!home) throw new Error('Could not resolve the home directory')
    return home
  }
  const { homeDir } = await import('@tauri-apps/api/path')
  const home = await homeDir()
  if (!home) throw new Error('Could not resolve the home directory')
  return home
}
