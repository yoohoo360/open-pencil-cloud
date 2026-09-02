import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'

import { safeRedirect } from '#react/app/auth/redirect'
import { useI18n } from '#react/i18n'
import { authAPI, getAPIErrorMessage } from '#react/lib/client'
import { AuthAlert, AuthShell } from '#react/view/auth/AuthShell'

export default function OauthCallbackView() {
  const { auth } = useI18n()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState('')

  useEffect(() => {
    const ticket = searchParams.get('ticket')
    const redirect = safeRedirect(searchParams.get('redirect'))
    if (!ticket) {
      void navigate(`/login?error=${encodeURIComponent('Sign-in expired. Try again.')}`)
      return
    }
    let cancelled = false
    void authAPI
      .exchangeOauth(ticket)
      .then(() => {
        if (!cancelled) void navigate(redirect)
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(getAPIErrorMessage(cause, 'Sign in failed'))
        }
      })
    return () => {
      cancelled = true
    }
  }, [navigate, searchParams])

  return (
    <div className="h-full" data-test-id="oauth-callback-page">
      <AuthShell
        title={auth.signingIn || 'Signing in'}
        subtitle={auth.oauthWait || 'Finishing sign in…'}
      >
        {error ? (
          <AuthAlert>{error}</AuthAlert>
        ) : (
          <div className="flex justify-center text-muted">
            <LoaderCircle className="size-6 animate-spin" />
          </div>
        )}
      </AuthShell>
    </div>
  )
}
