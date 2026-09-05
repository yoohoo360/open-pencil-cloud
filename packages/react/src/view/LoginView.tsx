import { oauthLoginErrorMessage } from '#react/app/auth/oauth'
import { consumeReturnTo } from '#react/app/auth/redirect'
import { readRememberedUsername, writeRememberedUsername } from '#react/app/auth/storage'
import { useI18n } from '#react/i18n'
import { authAPI, getAPIErrorMessage } from '#react/lib/client'
import { AuthAlert, AuthField, AuthShell, authInputClass } from '#react/view/auth/AuthShell'
import { OauthButtons } from '#react/view/auth/OauthButtons'
import { LoaderCircle } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'

export default function LoginView() {
  const { auth } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const remembered = readRememberedUsername()
  const [email, setEmail] = useState(remembered)
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(Boolean(remembered))
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [generalError, setGeneralError] = useState('')
  const [needsVerification, setNeedsVerification] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const isDev = import.meta.env.DEV
  const isValid = email.includes('@') && password.trim().length > 0

  useEffect(() => {
    const oauthError = searchParams.get('error')
    const message = oauthLoginErrorMessage(
      oauthError,
      auth.oauthUnlinked ||
        'This account is not linked yet. Register first, then click GitHub or Google again to link it.'
    )
    if (!message) return
    setGeneralError(message)
  }, [auth.oauthUnlinked, searchParams])

  function validate(): boolean {
    const nextEmailError = email.includes('@') ? '' : auth.emailRequired || 'Enter your email first'
    const nextPasswordError = password.trim() ? '' : auth.password || 'Password is required'
    setEmailError(nextEmailError)
    setPasswordError(nextPasswordError)
    return !nextEmailError && !nextPasswordError
  }

  async function handleLogin(event?: FormEvent): Promise<void> {
    event?.preventDefault()
    setGeneralError('')
    setNeedsVerification(false)
    if (!validate()) return
    setIsLoading(true)
    try {
      await authAPI.login({
        username_or_email: email.trim(),
        password
      })
      writeRememberedUsername(rememberMe ? email.trim() : '')
      void navigate(consumeReturnTo(location.state))
    } catch (error) {
      const message = getAPIErrorMessage(error, 'Login failed. Please try again.')
      setGeneralError(message)
      setNeedsVerification(/verify your email/i.test(message))
    } finally {
      setIsLoading(false)
    }
  }

  const verifyHref = `/verify-email?email=${encodeURIComponent(email.trim())}`

  return (
    <div
      className="h-full"
      data-test-id="login-page"
      onKeyDown={(event) => {
        if (event.key === 'Enter' && !isLoading) void handleLogin()
      }}
    >
      <AuthShell
        title={auth.appName || 'Welcome Back'}
        subtitle={auth.loginSubtitle || 'Sign in to your account'}
      >
        {generalError ? (
          <AuthAlert>
            <p>{generalError}</p>
          </AuthAlert>
        ) : null}

        {needsVerification ? (
          <p className="mb-4 text-sm text-muted">
            <Link className="text-accent hover:underline" to={verifyHref} state={location.state}>
              {auth.enterVerificationCode || 'Enter verification code'}
            </Link>
          </p>
        ) : null}

        <form className="space-y-4" onSubmit={(event) => void handleLogin(event)}>
          <AuthField id="email" label={auth.email || 'Email'} error={emailError}>
            <input
              id="email"
              value={email}
              type="email"
              autoComplete="email"
              className={authInputClass(Boolean(emailError))}
              placeholder={auth.usernameOrEmailPlaceholder || 'Enter your email'}
              disabled={isLoading}
              data-test-id="login-email"
              onChange={(event) => setEmail(event.target.value)}
              onBlur={() => {
                setEmailError(
                  email.includes('@') ? '' : auth.emailRequired || 'Enter your email first'
                )
              }}
            />
          </AuthField>

          <AuthField id="password" label={auth.password || 'Password'} error={passwordError}>
            <input
              id="password"
              value={password}
              type="password"
              autoComplete="current-password"
              className={authInputClass(Boolean(passwordError))}
              placeholder={auth.passwordPlaceholder || 'Enter your password'}
              disabled={isLoading}
              data-test-id="login-password"
              onChange={(event) => setPassword(event.target.value)}
              onBlur={() => {
                setPasswordError(password.trim() ? '' : 'Password is required')
              }}
            />
          </AuthField>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted transition-colors hover:text-surface">
            <input
              checked={rememberMe}
              type="checkbox"
              className="h-4 w-4 rounded border-border bg-input text-accent focus:ring-accent focus:ring-offset-0 disabled:opacity-50"
              disabled={isLoading}
              onChange={(event) => setRememberMe(event.target.checked)}
            />
            {auth.rememberMe || 'Remember me'}
          </label>

          <OauthButtons />

          {isDev ? (
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <button
                type="button"
                className="relative flex w-full cursor-pointer justify-center text-xs"
                onClick={() => {
                  setEmail('admin@jongwong.cn')
                  setPassword('123456')
                }}
              >
                <span className="bg-panel px-2 text-muted">Test Account</span>
              </button>
            </div>
          ) : null}

          <button
            type="submit"
            className="mt-6 w-full rounded bg-accent py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90 focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-panel focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!isValid || isLoading}
            data-test-id="login-submit"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <LoaderCircle className="size-4 animate-spin" />
                {auth.loggingIn || 'Logging in...'}
              </span>
            ) : (
              auth.signIn || 'Sign In'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          {auth.noAccount || "Don't have an account?"}{' '}
          <Link
            className="font-medium text-accent hover:underline"
            to="/register"
            state={location.state}
          >
            {auth.signUp || 'Sign Up'}
          </Link>
        </p>
      </AuthShell>
    </div>
  )
}
