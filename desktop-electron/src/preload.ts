import { contextBridge, ipcRenderer } from 'electron'

export type OpenPencilDesktop = {
  invoke: (command: string, args?: unknown) => Promise<unknown>
  onMenuEvent: (handler: (id: string) => void) => () => void
  homeDir: () => Promise<string>
}

function desktopInvoke(command: string, args?: unknown): Promise<unknown> {
  return ipcRenderer.invoke('desktop:invoke', { command, args })
}

const api: OpenPencilDesktop = {
  invoke: desktopInvoke,
  onMenuEvent(handler) {
    const listener = (_event: Electron.IpcRendererEvent, id: string) => {
      handler(id)
    }
    ipcRenderer.on('menu-event', listener)
    return () => {
      ipcRenderer.removeListener('menu-event', listener)
    }
  },
  homeDir() {
    return ipcRenderer.invoke('desktop:home-dir') as Promise<string>
  }
}

// Stub so `IS_TAURI` (`'__TAURI_INTERNALS__' in window`) is true in Electron too.
// `invoke` forwards to main-process IPC (same command names as Tauri, e.g. `build_fig_file`).
// Prefer `openPencilDesktop` from app code; `@tauri-apps/api` still works via this stub.
contextBridge.exposeInMainWorld('__TAURI_INTERNALS__', {
  openPencilElectron: true,
  invoke(command: string, args?: unknown) {
    return desktopInvoke(command, args)
  }
})
contextBridge.exposeInMainWorld('openPencilDesktop', api)
