import config from '#react/config'

/** Normalize a configured sandbox host; empty string means unset / invalid. */
export function normalizeMakeSandboxServerURL(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '')
  if (!trimmed) return ''
  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return ''
    const path = url.pathname.replace(/\/+$/, '')
    return `${url.origin}${path === '/' ? '' : path}`
  } catch {
    return ''
  }
}

/** Sandbox preview host from `packages/react/src/config` (APP_ENV). */
export function makeSandboxServerURL(): string {
  return normalizeMakeSandboxServerURL(config.MAKE_SANDBOX_SERVER_URL ?? '')
}

/** Make UI is shown only when `MAKE_SANDBOX_SERVER_URL` is set in app config. */
export function isMakeSandboxConfigured(): boolean {
  return makeSandboxServerURL().length > 0
}
