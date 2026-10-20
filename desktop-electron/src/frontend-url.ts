import { app, dialog, type BrowserWindow } from 'electron'
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'

import {
  FRONTEND_URL_BY_ENV,
  resolveAppEnv,
  type AppEnv
} from './app-env'

export const PRESET_LOCAL = FRONTEND_URL_BY_ENV.local
export const PRESET_DEV = FRONTEND_URL_BY_ENV.dev
export const PRESET_PROD = FRONTEND_URL_BY_ENV.prod

const OVERRIDE_FILE = 'frontend-url.txt'

/** Default URL for this binary's channel (local / dev / prod). */
export function defaultFrontendUrl(): string {
  const explicit = process.env.OPENPENCIL_FRONTEND_URL?.trim()
  if (explicit) return explicit
  return resolveAppEnv().frontendUrl
}

/** Frontend menu: non-prod channels only (matches Tauri / React). */
export function allowsFrontendUrlOverride(): boolean {
  return resolveAppEnv().appEnv !== 'prod'
}

export function buildChannelLabel(): string {
  return resolveAppEnv().appEnv
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

async function clearHtmlJsCaches(window: BrowserWindow, origin: string): Promise<void> {
  const session = window.webContents.session
  try {
    await session.clearCache()
    await session.clearCodeCaches({ urls: [] })
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
}

export type LoadFrontendOptions = {
  /** Clear HTML/JS caches and force a no-cache navigation (Frontend menu switches). */
  bustCache?: boolean
}

export async function loadFrontendUrl(
  window: BrowserWindow,
  url: string,
  options: LoadFrontendOptions = {}
): Promise<void> {
  const target = validateFrontendUrl(url)
  const origin = new URL(target).origin
  if (options.bustCache) await clearHtmlJsCaches(window, origin)

  const loadOptions = options.bustCache
    ? { extraHeaders: 'Cache-Control: no-cache\nPragma: no-cache\n' }
    : undefined

  try {
    await window.loadURL(target, loadOptions)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    dialog.showErrorBox('Frontend failed to load', `${target}\n\n${message}`)
    throw error
  }

  if (options.bustCache) {
    await new Promise<void>((resolve) => {
      const done = () => {
        window.webContents.off('did-finish-load', done)
        window.webContents.off('did-fail-load', done)
        resolve()
      }
      window.webContents.once('did-finish-load', done)
      window.webContents.once('did-fail-load', done)
    })
    window.webContents.reloadIgnoringCache()
  }
}

export async function applyResolvedFrontendUrl(window: BrowserWindow): Promise<void> {
  await loadFrontendUrl(window, resolvedFrontendUrl(), { bustCache: false })
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
    const output = spawnSync('powershell', ['-NoProfile', '-Command', script], {
      encoding: 'utf8'
    })
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

function presetForEnv(env: AppEnv): string {
  return FRONTEND_URL_BY_ENV[env]
}

/**
 * Handle Frontend menu ids. Returns true when the event was consumed.
 * Clears HTML/JS cache and reloads after a successful switch.
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
        await loadFrontendUrl(window, resolvedFrontendUrl(), { bustCache: true })
        return true
      case 'frontend-url-local':
        persistOverride(presetForEnv('local'))
        await loadFrontendUrl(window, resolvedFrontendUrl(), { bustCache: true })
        return true
      case 'frontend-url-dev':
        persistOverride(presetForEnv('dev'))
        await loadFrontendUrl(window, resolvedFrontendUrl(), { bustCache: true })
        return true
      case 'frontend-url-prod':
        persistOverride(presetForEnv('prod'))
        await loadFrontendUrl(window, resolvedFrontendUrl(), { bustCache: true })
        return true
      case 'frontend-url-custom': {
        const next = promptCustomUrl(resolvedFrontendUrl())
        if (!next) return true
        persistOverride(next)
        await loadFrontendUrl(window, resolvedFrontendUrl(), { bustCache: true })
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
