const DEFAULT_REDIRECT_PATH = '/dashboard'

export function safeRedirect(value: string | null): string {
  if (!value) return DEFAULT_REDIRECT_PATH
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/login')) {
    return DEFAULT_REDIRECT_PATH
  }
  return value
}

export function loginPathWithRedirect(pathname: string, search = ''): string {
  const redirect = encodeURIComponent(`${pathname}${search}`)
  return `/login?redirect=${redirect}`
}
