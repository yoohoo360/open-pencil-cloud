import { app, BrowserWindow, ipcMain } from 'electron'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { openDirectory } from './ipc/dialog'
import { listSystemFonts, loadSystemFont } from './ipc/fonts'
import { fsMkdir, fsReadDir, fsReadFile, fsRemove, fsWriteFile } from './ipc/fs'
import { mcpHealth, mcpLookup, mcpStart } from './ipc/mcp'
import { applyResolvedFrontendUrl } from './frontend-url'
import { attachEditableContextMenu, installNativeMenu } from './menu'

let mainWindow: BrowserWindow | null = null

function packageRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), '..')
}

async function handleInvoke(command: string, args: unknown): Promise<unknown> {
  switch (command) {
    case 'mcp_lookup':
      return mcpLookup()
    case 'mcp_health': {
      const authToken =
        args && typeof args === 'object' && 'authToken' in args
          ? ((args as { authToken?: string | null }).authToken ?? null)
          : null
      return mcpHealth(authToken)
    }
    case 'mcp_start': {
      const env =
        args && typeof args === 'object' && 'env' in args
          ? ((args as { env?: Record<string, string> }).env ?? {})
          : {}
      mcpStart(env)
      return null
    }
    case 'list_system_fonts':
      return listSystemFonts()
    case 'load_system_font': {
      const family =
        args && typeof args === 'object' && 'family' in args
          ? String((args as { family: string }).family)
          : ''
      const style =
        args && typeof args === 'object' && 'style' in args
          ? String((args as { style?: string }).style ?? 'Regular')
          : 'Regular'
      return loadSystemFont(family, style)
    }
    case 'fs_readFile': {
      const path =
        args && typeof args === 'object' && 'path' in args
          ? String((args as { path: string }).path)
          : ''
      return fsReadFile(path)
    }
    case 'fs_readDir': {
      const path =
        args && typeof args === 'object' && 'path' in args
          ? String((args as { path: string }).path)
          : ''
      return fsReadDir(path)
    }
    case 'fs_mkdir': {
      const path =
        args && typeof args === 'object' && 'path' in args
          ? String((args as { path: string }).path)
          : ''
      fsMkdir(path)
      return null
    }
    case 'fs_writeFile': {
      const path =
        args && typeof args === 'object' && 'path' in args
          ? String((args as { path: string }).path)
          : ''
      const contents =
        args && typeof args === 'object' && 'contents' in args
          ? (args as { contents: Uint8Array | number[] }).contents
          : []
      fsWriteFile(path, contents)
      return null
    }
    case 'fs_remove': {
      const path =
        args && typeof args === 'object' && 'path' in args
          ? String((args as { path: string }).path)
          : ''
      const recursive =
        args && typeof args === 'object' && 'recursive' in args
          ? Boolean((args as { recursive?: boolean }).recursive)
          : false
      fsRemove(path, { recursive })
      return null
    }
    case 'dialog_openDirectory': {
      const title =
        args && typeof args === 'object' && 'title' in args
          ? String((args as { title?: string }).title ?? '')
          : undefined
      return openDirectory(mainWindow, title || undefined)
    }
    default:
      throw new Error(`Unknown desktop command: ${command}`)
  }
}

function createWindow(): void {
  const preload = join(packageRoot(), 'dist/preload.cjs')
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    title: 'OpenPencil',
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })
  attachEditableContextMenu(mainWindow)
  void applyResolvedFrontendUrl(mainWindow)
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  ipcMain.handle('desktop:invoke', async (_event, payload: { command: string; args?: unknown }) => {
    return handleInvoke(payload.command, payload.args)
  })
  ipcMain.handle('desktop:home-dir', async () => homedir())

  installNativeMenu(() => mainWindow)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
    else mainWindow?.show()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
