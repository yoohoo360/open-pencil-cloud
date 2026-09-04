import { safeRedirect } from './redirect'

export type OauthProvider = 'github' | 'google'

export function oauthStartUrl(provider: OauthProvider, redirect: string | null): string {
  const path = safeRedirect(redirect)
  const params = new URLSearchParams()
  params.set('redirect', path)
  return `/api/auth/oauth/${provider}?${params.toString()}`
}
