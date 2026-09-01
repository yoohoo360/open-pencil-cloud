import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'

import { safeRedirect } from '#react/app/auth/redirect'
import { readRememberedUsername, writeRememberedUsername } from '#react/app/auth/storage'
import { useI18n } from '#react/i18n'
import { authAPI, getAPIErrorMessage } from '#react/lib/client'
import { AuthAlert, AuthField, AuthShell, authInputClass } from '#react/view/auth/AuthShell'
import { OauthButtons } from '#react/view/auth/OauthButtons'

export default function LoginView() {
  const { auth } = useI18n()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const remembered = readRememberedUsername()
  const [username, setUsername] = useState(remembered)
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(Boolean(remembered))
  const [usernameError, setUsernameError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [generalError, setGeneralError] = useState('')
  const [needsVerification, setNeedsVerification] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const isDev = import.meta.env.DEV
  const isValid = username.trim().length > 0 && password.trim().length > 0
  const redirect = searchParams.get('redirect')

  useEffect(() => {
    const oauthError = searchParams.get('error')
    if (oauthError) setGeneralError(oauthError)
  }, [searchParams])

  function validate(): boolean {
    const nextUsernameError = username.trim() ? '' : 'Username or email is required'
    const nextPasswordError = password.trim() ? '' : 'Password is required'
    setUsernameError(nextUsernameError)
    setPasswordError(nextPasswordError)
    return !nextUsernameError && !nextPasswordError
  }

  async function handleLogin(event?: FormEvent): Promise<void> {
    event?.preventDefault()
    setGeneralError('')
    setNeedsVerification(false)
    if (!validate()) return
    setIsLoading(true)
    try {
      await authAPI.login({
        username_or_email: username,
        password
      })
      writeRememberedUsername(rememberMe ? username : '')
      void navigate(safeRedirect(redirect))
    } catch (error) {
      const message = getAPIErrorMessage(error, 'Login failed. Please try again.')
      setGeneralError(message)
      setNeedsVerification(/verify your email/i.test(message))
    } finally {
      setIsLoading(false)
    }
  }

  const verifyHref = username.includes('@')
    ? `/verify-email?email=${encodeURIComponent(username.trim())}&redirect=${encodeURIComponent(safeRedirect(redirect))}`
    : `/verify-email?redirect=${encodeURIComponent(safeRedirect(redirect))}`

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
        {generalError ? <AuthAlert>{generalError}</AuthAlert> : null}

        {needsVerification ? (
          <p className="mb-4 text-sm text-muted">
            <Link className="text-accent hover:underline" to={verifyHref}>
              {auth.enterVerificationCode || 'Enter verification code'}
            </Link>
          </p>
        ) : null}

        <OauthButtons redirect={redirect} />

        <form className="space-y-4" onSubmit={(event) => void handleLogin(event)}>
          <AuthField
            id="username_or_email"
            label={auth.usernameOrEmail || 'Username or Email'}
            error={usernameError}
          >
            <input
              id="username_or_email"
              value={username}
              type="text"
              autoComplete="username"
              className={authInputClass(Boolean(usernameError))}
              placeholder={auth.usernameOrEmailPlaceholder || 'Enter your username or email'}
              disabled={isLoading}
              data-test-id="login-username"
              onChange={(event) => setUsername(event.target.value)}
              onBlur={() => {
                setUsernameError(username.trim() ? '' : 'Username or email is required')
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

          {isDev ? (
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <button
                type="button"
                className="relative flex w-full cursor-pointer justify-center text-xs"
                onClick={() => {
                  setUsername('admin@jongwong.cn')
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
            to={`/register${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`}
          >
            {auth.signUp || 'Sign Up'}
          </Link>
        </p>
      </AuthShell>
    </div>
  )
}
