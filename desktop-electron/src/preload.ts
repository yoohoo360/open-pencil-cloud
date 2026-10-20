import { contextBridge, ipcRenderer } from 'electron'

export type OpenPencilDesktop = {
  invoke: (command: string, args?: unknown) => Promise<unknown>
  onMenuEvent: (handler: (id: string) => void) => () => void
  homeDir: () => Promise<string>
}

const api: OpenPencilDesktop = {
  invoke(command, args) {
    return ipcRenderer.invoke('desktop:invoke', { command, args })
  },
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
// Not a real Tauri runtime — IPC goes through `openPencilDesktop`.
contextBridge.exposeInMainWorld('__TAURI_INTERNALS__', { openPencilElectron: true })
contextBridge.exposeInMainWorld('openPencilDesktop', api)
