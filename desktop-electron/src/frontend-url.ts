import { app, dialog, type BrowserWindow } from 'electron'
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'

export const PRESET_LOCAL = 'http://localhost:8000'
export const PRESET_DEV = 'https://pencil.dev.yoohoo.cn'
const PRESET_PROD = 'https://pencil.yoohoo.cn'
const OVERRIDE_FILE = 'frontend-url.txt'

/** Match desktop-react `frontend.rs` / packages/react config tables. */
export function defaultFrontendUrl(): string {
  const fromEnv = process.env.OPENPENCIL_FRONTEND_URL?.trim()
  if (fromEnv) return fromEnv
  const appEnv = process.env.OPENPENCIL_APP_ENV?.trim()
  if (!appEnv && app.isPackaged) return PRESET_PROD
  switch (appEnv) {
    case 'prod':
      return PRESET_PROD
    case 'dev':
    case 'test':
      return PRESET_DEV
    default:
      return PRESET_LOCAL
  }
}

/**
 * Non-prod / unpackaged only — same idea as Tauri `allows_frontend_url_override`.
 * Packaged installers hide the Frontend menu unless APP_ENV is explicitly non-prod.
 */
export function allowsFrontendUrlOverride(): boolean {
  if (app.isPackaged) {
    const appEnv = process.env.OPENPENCIL_APP_ENV?.trim()
    return appEnv === 'dev' || appEnv === 'test'
  }
  return process.env.OPENPENCIL_APP_ENV?.trim() !== 'prod'
}

export function validateFrontendUrl(raw: string): string {
  const trimmed = raw.trim()
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    throw new Error('Frontend URL is invalid')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Frontend URL must use http or https')
  }
  if (!url.host) throw new Error('Frontend URL must include a host')
  return url.toString()
}

function overridePath(): string {
  return join(app.getPath('userData'), OVERRIDE_FILE)
}

function readOverride(): string | null {
  const path = overridePath()
  if (!existsSync(path)) return null
  try {
    const trimmed = readFileSync(path, 'utf8').trim()
    if (!trimmed) return null
    validateFrontendUrl(trimmed)
    return trimmed
  } catch {
    return null
  }
}

export function resolvedFrontendUrl(): string {
  if (allowsFrontendUrlOverride()) {
    const override = readOverride()
    if (override) return validateFrontendUrl(override)
  }
  return validateFrontendUrl(defaultFrontendUrl())
}

function persistOverride(url: string): void {
  const path = overridePath()
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${validateFrontendUrl(url)}\n`, 'utf8')
}

function clearOverride(): void {
  const path = overridePath()
  if (existsSync(path)) unlinkSync(path)
}

/**
 * Drop HTML/JS network + code caches for the target origin, then navigate with
 * a no-cache document request (does not wipe localStorage / IndexedDB).
 */
export async function loadFrontendUrl(window: BrowserWindow, url: string): Promise<void> {
  const target = validateFrontendUrl(url)
  const origin = new URL(target).origin
  const session = window.webContents.session
  try {
    // HTTP disk/memory cache (HTML, JS, CSS, …).
    await session.clearCache()
    // V8 generated code cache for scripts (empty list = all entries).
    await session.clearCodeCaches({ urls: [] })
    // Cache Storage + Service Workers that may pin old HTML/JS shells.
    await session.clearData({
      origins: [origin],
      dataTypes: ['cache', 'serviceWorkers']
    })
    await session.clearStorageData({
      origin,
      storages: ['cachestorage', 'serviceworkers']
    })
  } catch (error) {
    console.warn('[desktop-electron] clear HTML/JS cache failed', error)
  }
  await window.loadURL(target, {
    extraHeaders: 'Cache-Control: no-cache\nPragma: no-cache\n'
  })
  window.webContents.reloadIgnoringCache()
}

export async function applyResolvedFrontendUrl(window: BrowserWindow): Promise<void> {
  await loadFrontendUrl(window, resolvedFrontendUrl())
}

function showError(message: string): void {
  dialog.showErrorBox('Frontend URL', message)
}

function promptCustomUrl(current: string): string | null {
  if (process.platform === 'darwin') {
    const script = `try
  set answer to text returned of (display dialog "Frontend URL:" default answer ${JSON.stringify(current)} with title "OpenPencil")
  return answer
on error
  return ""
end try`
    const output = spawnSync('osascript', ['-e', script], { encoding: 'utf8' })
    if (output.status !== 0) return null
    const text = output.stdout.trim()
    return text || null
  }
  if (process.platform === 'win32') {
    const script = `Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.Interaction]::InputBox('Frontend URL:','OpenPencil',${JSON.stringify(current)})`
    const output = spawnSync(
      'powershell',
      ['-NoProfile', '-Command', script],
      { encoding: 'utf8' }
    )
    if (output.status !== 0) return null
    const text = output.stdout.trim()
    return text || null
  }
  const output = spawnSync(
    'zenity',
    ['--entry', '--title=OpenPencil', '--text=Frontend URL:', `--entry-text=${current}`],
    { encoding: 'utf8' }
  )
  if (output.status !== 0) return null
  const text = output.stdout.trim()
  return text || null
}

/**
 * Handle Frontend menu ids. Returns true when the event was consumed.
 * Clears HTML/HTTP cache and reloads after a successful switch.
 */
export async function handleFrontendMenuEvent(
  window: BrowserWindow | null,
  eventId: string
): Promise<boolean> {
  if (!allowsFrontendUrlOverride()) return false
  if (!window) return true

  try {
    switch (eventId) {
      case 'frontend-url-default':
        clearOverride()
        await applyResolvedFrontendUrl(window)
        return true
      case 'frontend-url-local':
        persistOverride(PRESET_LOCAL)
        await applyResolvedFrontendUrl(window)
        return true
      case 'frontend-url-dev':
        persistOverride(PRESET_DEV)
        await applyResolvedFrontendUrl(window)
        return true
      case 'frontend-url-custom': {
        const next = promptCustomUrl(resolvedFrontendUrl())
        if (!next) return true
        persistOverride(next)
        await applyResolvedFrontendUrl(window)
        return true
      }
      default:
        return false
    }
  } catch (error) {
    showError(error instanceof Error ? error.message : String(error))
    return true
  }
}
