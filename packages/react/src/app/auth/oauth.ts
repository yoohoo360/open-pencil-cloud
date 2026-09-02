import { getHttpClientBaseUrl, type OauthProviders } from '#react/lib/client'

import { safeRedirect } from './redirect'

export type OauthProvider = 'github' | 'google'

export type { OauthProviders }

export function oauthStartUrl(provider: OauthProvider, redirect: string | null): string {
  const path = safeRedirect(redirect)
  const params = new URLSearchParams()
  params.set('redirect', path)
  return `${getHttpClientBaseUrl()}/api/auth/oauth/${provider}?${params.toString()}`
}
