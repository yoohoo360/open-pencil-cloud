import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { openDirectory } from './ipc/dialog'
import { buildFigFile } from './ipc/fig'
import { listSystemFonts, loadSystemFont } from './ipc/fonts'
import { fsMkdir, fsReadDir, fsReadFile, fsRemove, fsWriteFile } from './ipc/fs'
import { mcpHealth, mcpLookup, mcpStart, mcpStop } from './ipc/mcp'
import { applyUserDataPathForEnv, resolveAppEnv } from './app-env'
import { applyResolvedFrontendUrl, buildChannelLabel } from './frontend-url'
import { attachEditableContextMenu, installNativeMenu } from './menu'

// Before ready: isolate userData per local/dev/prod so overrides do not mix.
applyUserDataPathForEnv()

let mainWindow: BrowserWindow | null = null

function packageRoot(): string {
  // Packaged: app.asar root. Dev: desktop-electron/.
  if (app.isPackaged) return app.getAppPath()
  return join(dirname(fileURLToPath(import.meta.url)), '..')
}

async function handleInvoke(command: string, args: unknown): Promise<unknown> {
  switch (command) {
    case 'mcp_lookup':
      return mcpLookup()
    case 'mcp_health':
      return mcpHealth()
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
    case 'build_fig_file':
      return buildFigFile(args)
    default:
      throw new Error(`Unknown desktop command: ${command}`)
  }
}

function createWindow(): void {
  const preload = join(packageRoot(), 'dist/preload.cjs')
  const channel = buildChannelLabel()
  const { frontendUrl } = resolveAppEnv()
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    title: channel === 'prod' ? 'OpenPencil' : `OpenPencil [${channel}]`,
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })
  // Some hosts treat the Electron UA differently; use a normal Chrome UA for HTTP frontends.
  const chromeUa = mainWindow.webContents
    .getUserAgent()
    .replace(/Electron\/[\d.]+ /, '')
    .replace(/ open-pencil\/[\d.]+/i, '')
  mainWindow.webContents.setUserAgent(chromeUa)

  mainWindow.webContents.on('did-fail-load', (_event, code, description, validatedURL, isMainFrame) => {
    if (!isMainFrame || code === -3) return // -3 = aborted
    console.error('[desktop-electron] did-fail-load', { code, description, validatedURL })
    dialog.showErrorBox(
      'Frontend failed to load',
      `Build channel: ${channel}\nDefault: ${frontendUrl}\nTried: ${validatedURL}\n\n${description} (${code})\n\nNon-prod: Help → Environment → Local / Dev / Prod.\nOr set OPENPENCIL_APP_ENV / OPENPENCIL_FRONTEND_URL.`
    )
  })

  console.log(`[desktop-electron] channel=${channel} defaultFrontend=${frontendUrl}`)
  attachEditableContextMenu(mainWindow)
  void applyResolvedFrontendUrl(mainWindow)
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

async function ensureMcpCompanion(): Promise<void> {
  if ((await mcpHealth()).ok) return

  const { frontendUrl } = resolveAppEnv()
  mcpStart({
    PORT: '7600',
    OPENPENCIL_MCP_AUTH_TOKEN: '',
    OPENPENCIL_MCP_CORS_ORIGIN: new URL(frontendUrl).origin,
    OPENPENCIL_MCP_TCP: '1',
    OPENPENCIL_MCP_ROOT: homedir(),
    OPENPENCIL_MCP_SCOPE: 'document',
    OPENPENCIL_MCP_EVAL: '1'
  })
}

app.whenReady().then(() => {
  ipcMain.handle('desktop:invoke', async (_event, payload: { command: string; args?: unknown }) => {
    return handleInvoke(payload.command, payload.args)
  })
  ipcMain.handle('desktop:home-dir', async () => homedir())

  installNativeMenu(() => mainWindow)
  createWindow()
  void ensureMcpCompanion().catch((reason) => {
    console.error('[desktop-electron] failed to start MCP companion', reason)
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
    else mainWindow?.show()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  mcpStop()
})
