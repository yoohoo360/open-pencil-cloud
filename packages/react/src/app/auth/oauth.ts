import { API_BASE_URL, type OauthProviders } from '#react/lib/client'

import { safeRedirect } from './redirect'

export type OauthProvider = 'github' | 'google'

export type { OauthProviders }

export function oauthStartUrl(provider: OauthProvider, redirect: string | null): string {
  const path = safeRedirect(redirect)
  const params = new URLSearchParams()
  params.set('redirect', path)
  return `${API_BASE_URL}/api/auth/oauth/${provider}?${params.toString()}`
}
