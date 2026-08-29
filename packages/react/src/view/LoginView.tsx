import { type FormEvent, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LoaderCircle, Pencil } from 'lucide-react'

import { safeRedirect } from '#react/app/auth/redirect'
import { readRememberedUsername, writeRememberedUsername } from '#react/app/auth/storage'
import { useI18n } from '#react/i18n'
import { authAPI, getAPIErrorMessage } from '#react/lib/client'

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
  const [isLoading, setIsLoading] = useState(false)
  const isDev = import.meta.env.DEV
  const isValid = username.trim().length > 0 && password.trim().length > 0

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
    if (!validate()) return
    setIsLoading(true)
    try {
      await authAPI.login({
        username_or_email: username,
        password
      })
      writeRememberedUsername(rememberMe ? username : '')
      void navigate(safeRedirect(searchParams.get('redirect')))
    } catch (error) {
      setGeneralError(getAPIErrorMessage(error, 'Login failed. Please try again.'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="flex h-full items-center justify-center overflow-y-auto bg-canvas px-4"
      data-test-id="login-page"
      onKeyDown={(event) => {
        if (event.key === 'Enter' && !isLoading) void handleLogin()
      }}
    >
      <div className="w-full max-w-md rounded-lg border border-border bg-panel p-8 shadow-lg">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
            <Pencil className="size-8 text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-surface">{auth.appName || 'Welcome Back'}</h1>
          <p className="mt-2 text-sm text-muted">{auth.loginSubtitle || 'Sign in to your account'}</p>
        </div>

        {generalError ? (
          <div className="mb-4 rounded bg-danger/10 px-4 py-2 text-sm text-danger" role="alert">
            {generalError}
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={(event) => void handleLogin(event)}>
          <div>
            <label htmlFor="username_or_email" className="block text-sm font-medium text-surface">
              {auth.usernameOrEmail || 'Username or Email'}
            </label>
            <input
              id="username_or_email"
              value={username}
              type="text"
              autoComplete="username"
              className={`mt-1.5 block w-full rounded border bg-input px-3 py-2 text-sm text-surface placeholder:text-muted focus:outline-none focus:ring-1 disabled:opacity-50 ${
                usernameError
                  ? 'border-danger focus:border-danger focus:ring-danger'
                  : 'border-border focus:border-accent focus:ring-accent'
              }`}
              placeholder={auth.usernameOrEmailPlaceholder || 'Enter your username or email'}
              disabled={isLoading}
              data-test-id="login-username"
              onChange={(event) => setUsername(event.target.value)}
              onBlur={() => {
                setUsernameError(username.trim() ? '' : 'Username or email is required')
              }}
            />
            {usernameError ? <p className="mt-1 text-xs text-danger">{usernameError}</p> : null}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-surface">
              {auth.password || 'Password'}
            </label>
            <input
              id="password"
              value={password}
              type="password"
              autoComplete="current-password"
              className={`mt-1.5 block w-full rounded border bg-input px-3 py-2 text-sm text-surface placeholder:text-muted focus:outline-none focus:ring-1 disabled:opacity-50 ${
                passwordError
                  ? 'border-danger focus:border-danger focus:ring-danger'
                  : 'border-border focus:border-accent focus:ring-accent'
              }`}
              placeholder={auth.passwordPlaceholder || 'Enter your password'}
              disabled={isLoading}
              data-test-id="login-password"
              onChange={(event) => setPassword(event.target.value)}
              onBlur={() => {
                setPasswordError(password.trim() ? '' : 'Password is required')
              }}
            />
            {passwordError ? <p className="mt-1 text-xs text-danger">{passwordError}</p> : null}
          </div>

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
      </div>
    </div>
  )
}
