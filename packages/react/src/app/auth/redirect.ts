import config from '../../config'

const DEFAULT_REDIRECT_PATH = '/dashboard'
const RETURN_TO_KEY = 'open-pencil:return-to'

export type ReturnToLocation = {
  pathname: string
  search?: string
  hash?: string
}

export type AuthLocationState = {
  from?: ReturnToLocation
}

function canUseSessionStorage(): boolean {
  return typeof window !== 'undefined' && Boolean(window.sessionStorage)
}

function apiOrigin(): string {
  return config.API_BASE_URL.replace(/\/$/, '')
}

function currentOrigin(): string {
  if (typeof window === 'undefined') return ''
  const origin = window.location.origin
  if (origin && origin === apiOrigin()) return ''
  return origin
}

function toPath(location: ReturnToLocation): string {
  return `${location.pathname}${location.search ?? ''}${location.hash ?? ''}`
}

function pathFromAbsoluteUrl(value: string): string | null {
  try {
    const origin = currentOrigin()
    const url = new URL(value, origin || 'http://local.invalid')
    if (origin && url.origin !== origin) return null
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return null
  }
}

export function safeRedirect(value: string | null): string {
  if (!value) return DEFAULT_REDIRECT_PATH
  const path =
    value.startsWith('http://') || value.startsWith('https://') || value.startsWith('//')
      ? pathFromAbsoluteUrl(value)
      : value
  if (!path || !path.startsWith('/') || path.startsWith('//') || path.startsWith('/login')) {
    return DEFAULT_REDIRECT_PATH
  }
  return path
}

export function returnToHref(value: string | null = peekReturnTo()): string {
  const origin = currentOrigin()
  const path = safeRedirect(value)
  return origin ? `${origin}${path}` : path
}

export function returnToFromState(state: unknown): string | null {
  if (!state || typeof state !== 'object' || !('from' in state)) return null
  const from = (state as AuthLocationState).from
  if (!from || typeof from.pathname !== 'string') return null
  return toPath(from)
}

export function rememberReturnTo(pathname: string, search = ''): void {
  if (!canUseSessionStorage()) return
  window.sessionStorage.setItem(RETURN_TO_KEY, returnToHref(`${pathname}${search}`))
}

export function peekReturnTo(): string | null {
  if (!canUseSessionStorage()) return null
  return window.sessionStorage.getItem(RETURN_TO_KEY)
}

export function clearReturnTo(): void {
  if (!canUseSessionStorage()) return
  window.sessionStorage.removeItem(RETURN_TO_KEY)
}

export function consumeReturnTo(state: unknown = null): string {
  const next = safeRedirect(returnToFromState(state) ?? peekReturnTo())
  clearReturnTo()
  return next
}

export function loginPathWithRedirect(pathname: string, search = ''): string {
  rememberReturnTo(pathname, search)
  return '/login'
}

export function finishReturnTo(pathname: string, search = ''): string | null {
  const pending = peekReturnTo()
  if (!pending) return null
  const next = safeRedirect(pending)
  if (next === `${pathname}${search}`) {
    clearReturnTo()
    return null
  }
  clearReturnTo()
  return next
}
