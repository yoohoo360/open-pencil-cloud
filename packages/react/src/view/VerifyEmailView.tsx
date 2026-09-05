import { type FormEvent, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'

import { consumeReturnTo } from '#react/app/auth/redirect'
import { useI18n } from '#react/i18n'
import { authAPI, getAPIErrorMessage } from '#react/lib/client'
import { AuthAlert, AuthField, AuthShell, authInputClass } from '#react/view/auth/AuthShell'

export default function VerifyEmailView() {
  const { auth } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState(searchParams.get('email') ?? '')
  const [code, setCode] = useState('')
  const [generalError, setGeneralError] = useState('')
  const [info, setInfo] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    setGeneralError('')
    setInfo('')
    if (!email.includes('@') || code.trim().length !== 6) {
      setGeneralError(auth.invalidCode || 'Enter your email and the 6-digit code')
      return
    }
    setIsLoading(true)
    try {
      await authAPI.verifyEmail({ email: email.trim(), code: code.trim() })
      void navigate(consumeReturnTo(location.state))
    } catch (error) {
      setGeneralError(getAPIErrorMessage(error, 'Verification failed'))
    } finally {
      setIsLoading(false)
    }
  }

  async function handleResend(): Promise<void> {
    setGeneralError('')
    setInfo('')
    if (!email.includes('@')) {
      setGeneralError(auth.emailRequired || 'Enter your email first')
      return
    }
    setIsResending(true)
    try {
      await authAPI.resendVerification(email.trim())
      setInfo(auth.codeSent || 'If this account needs verification, a new code was sent')
    } catch (error) {
      setGeneralError(getAPIErrorMessage(error, 'Could not resend the code'))
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="h-full" data-test-id="verify-email-page">
      <AuthShell
        title={auth.verifyEmail || 'Verify your email'}
        subtitle={auth.verifySubtitle || 'Enter the 6-digit code we sent you'}
      >
        {generalError ? <AuthAlert>{generalError}</AuthAlert> : null}
        {info ? <p className="mb-4 text-sm text-muted">{info}</p> : null}
        <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <AuthField id="email" label={auth.email || 'Email'}>
            <input
              id="email"
              value={email}
              type="email"
              autoComplete="email"
              className={authInputClass(false)}
              disabled={isLoading}
              data-test-id="verify-email"
              onChange={(event) => setEmail(event.target.value)}
            />
          </AuthField>
          <AuthField id="code" label={auth.verificationCode || 'Verification code'}>
            <input
              id="code"
              value={code}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              className={authInputClass(false)}
              disabled={isLoading}
              data-test-id="verify-code"
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            />
          </AuthField>
          <button
            type="submit"
            className="mt-2 w-full rounded bg-accent py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLoading}
            data-test-id="verify-submit"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <LoaderCircle className="size-4 animate-spin" />
                {auth.verifying || 'Verifying...'}
              </span>
            ) : (
              auth.verifyAndSignIn || 'Verify and sign in'
            )}
          </button>
        </form>
        <button
          type="button"
          className="mt-3 w-full text-sm text-accent hover:underline disabled:opacity-50"
          disabled={isResending}
          onClick={() => void handleResend()}
        >
          {auth.resendCode || 'Resend code'}
        </button>
        <p className="mt-6 text-center text-sm text-muted">
          <Link className="font-medium text-accent hover:underline" to="/login" state={location.state}>
            {auth.backToSignIn || 'Back to sign in'}
          </Link>
        </p>
      </AuthShell>
    </div>
  )
}
