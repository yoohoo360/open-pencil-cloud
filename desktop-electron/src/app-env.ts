import { app } from 'electron'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Same channels as `packages/react/src/config` (`local` / `dev` / `prod`). */
export type AppEnv = 'local' | 'dev' | 'prod'

export const FRONTEND_URL_BY_ENV = {
  local: 'http://localhost:8000',
  dev: 'https://pencil.dev.yoohoo.cn',
  prod: 'https://pencil.yoohoo.cn'
} as const satisfies Record<AppEnv, string>

export type BakedAppEnv = {
  /** Channel this binary was built for. */
  appEnv: AppEnv
  /** Default frontend origin for that channel. */
  frontendUrl: string
}

function packageRoot(): string {
  if (app.isPackaged) return app.getAppPath()
  return join(dirname(fileURLToPath(import.meta.url)), '..')
}

function normalizeAppEnv(raw: string | undefined | null): AppEnv | null {
  const value = raw?.trim().toLowerCase()
  if (!value) return null
  if (value === 'local') return 'local'
  if (value === 'dev' || value === 'test') return 'dev'
  if (value === 'prod' || value === 'production') return 'prod'
  return null
}

function readBakedEnv(): BakedAppEnv | null {
  const path = join(packageRoot(), 'dist/app-env.json')
  // Packaged asar layout: app-env.json sits next to main.js under dist/
  const candidates = [
    path,
    join(packageRoot(), 'app-env.json'),
    join(dirname(fileURLToPath(import.meta.url)), 'app-env.json')
  ]
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue
    try {
      const parsed = JSON.parse(readFileSync(candidate, 'utf8')) as Partial<BakedAppEnv>
      const appEnv = normalizeAppEnv(parsed.appEnv)
      if (!appEnv) continue
      const frontendUrl =
        typeof parsed.frontendUrl === 'string' && parsed.frontendUrl.trim()
          ? parsed.frontendUrl.trim()
          : FRONTEND_URL_BY_ENV[appEnv]
      return { appEnv, frontendUrl }
    } catch {
      // try next
    }
  }
  return null
}

let cached: BakedAppEnv | null = null

/**
 * Resolve the shell channel:
 * 1. `OPENPENCIL_APP_ENV` (runtime override for CI / launchctl)
 * 2. baked `dist/app-env.json` from `bun run build:*`
 * 3. packaged → `prod`, unpackaged → `local`
 */
export function resolveAppEnv(): BakedAppEnv {
  if (cached) return cached

  const fromEnv = normalizeAppEnv(process.env.OPENPENCIL_APP_ENV)
  if (fromEnv) {
    const frontendUrl =
      process.env.OPENPENCIL_FRONTEND_URL?.trim() || FRONTEND_URL_BY_ENV[fromEnv]
    cached = { appEnv: fromEnv, frontendUrl }
    return cached
  }

  const baked = readBakedEnv()
  if (baked) {
    if (process.env.OPENPENCIL_FRONTEND_URL?.trim()) {
      cached = { ...baked, frontendUrl: process.env.OPENPENCIL_FRONTEND_URL.trim() }
      return cached
    }
    cached = baked
    return cached
  }

  const appEnv: AppEnv = app.isPackaged ? 'prod' : 'local'
  cached = {
    appEnv,
    frontendUrl: process.env.OPENPENCIL_FRONTEND_URL?.trim() || FRONTEND_URL_BY_ENV[appEnv]
  }
  return cached
}

/** Isolate preferences / frontend-url override per channel. */
export function applyUserDataPathForEnv(): void {
  const { appEnv } = resolveAppEnv()
  const base = app.getPath('appData')
  app.setPath('userData', join(base, `OpenPencil-electron-${appEnv}`))
}
