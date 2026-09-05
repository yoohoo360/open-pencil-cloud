import { peekReturnTo, returnToHref } from './redirect'

export type OauthProvider = 'github' | 'google'

export function oauthStartUrl(provider: OauthProvider, redirect: string | null = peekReturnTo()): string {
  const params = new URLSearchParams()
  params.set('redirect', returnToHref(redirect))
  return `/api/auth/oauth/${provider}?${params.toString()}`
}

export function oauthLoginErrorMessage(code: string | null, unlinkedMessage: string): string | null {
  if (!code) return null
  if (code === 'oauth_unlinked' || code.toLowerCase().includes('oauth_unlinked')) {
    return unlinkedMessage
  }
  return code
}
