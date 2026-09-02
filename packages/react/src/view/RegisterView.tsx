import { type FormEvent, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'

import { safeRedirect } from '#react/app/auth/redirect'
import { useI18n } from '#react/i18n'
import { authAPI, getAPIErrorMessage } from '#react/lib/client'
import { AuthAlert, AuthField, AuthShell, authInputClass } from '#react/view/auth/AuthShell'
import { OauthButtons } from '#react/view/auth/OauthButtons'

export default function RegisterView() {
  const { auth } = useI18n()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect')
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  function validate(): boolean {
    const next: Record<string, string> = {}
    if (!name.trim()) next.name = 'Name is required'
    if (username.trim().length < 3) next.username = 'Username must be at least 3 characters'
    if (!email.includes('@')) next.email = 'A valid email is required'
    if (password.length < 6) next.password = 'Password must be at least 6 characters'
    if (password !== confirm) next.confirm = 'Passwords do not match'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    setGeneralError('')
    if (!validate()) return
    setIsLoading(true)
    try {
      const result = await authAPI.register({
        name: name.trim(),
        username: username.trim(),
        email: email.trim(),
        password
      })
      const params = new URLSearchParams()
      params.set('email', result.email)
      const next = safeRedirect(redirect)
      if (next !== '/dashboard') params.set('redirect', next)
      void navigate(`/verify-email?${params.toString()}`)
    } catch (error) {
      setGeneralError(getAPIErrorMessage(error, 'Could not create the account'))
    } finally {
      setIsLoading(false)
    }
  }

  const loginHref = `/login${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`

  return (
    <div className="h-full" data-test-id="register-page">
      <AuthShell
        title={auth.createAccount || 'Create an account'}
        subtitle={auth.registerSubtitle || 'Register with email, then enter the verification code'}
      >
        {generalError ? <AuthAlert>{generalError}</AuthAlert> : null}
        <OauthButtons redirect={redirect} />
        <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <AuthField id="name" label={auth.name || 'Name'} error={errors.name}>
            <input
              id="name"
              value={name}
              type="text"
              autoComplete="name"
              className={authInputClass(Boolean(errors.name))}
              disabled={isLoading}
              data-test-id="register-name"
              onChange={(event) => setName(event.target.value)}
            />
          </AuthField>
          <AuthField id="username" label={auth.username || 'Username'} error={errors.username}>
            <input
              id="username"
              value={username}
              type="text"
              autoComplete="username"
              className={authInputClass(Boolean(errors.username))}
              disabled={isLoading}
              data-test-id="register-username"
              onChange={(event) => setUsername(event.target.value)}
            />
          </AuthField>
          <AuthField id="email" label={auth.email || 'Email'} error={errors.email}>
            <input
              id="email"
              value={email}
              type="email"
              autoComplete="email"
              className={authInputClass(Boolean(errors.email))}
              disabled={isLoading}
              data-test-id="register-email"
              onChange={(event) => setEmail(event.target.value)}
            />
          </AuthField>
          <AuthField id="password" label={auth.password || 'Password'} error={errors.password}>
            <input
              id="password"
              value={password}
              type="password"
              autoComplete="new-password"
              className={authInputClass(Boolean(errors.password))}
              disabled={isLoading}
              data-test-id="register-password"
              onChange={(event) => setPassword(event.target.value)}
            />
          </AuthField>
          <AuthField
            id="confirm"
            label={auth.confirmPassword || 'Confirm password'}
            error={errors.confirm}
          >
            <input
              id="confirm"
              value={confirm}
              type="password"
              autoComplete="new-password"
              className={authInputClass(Boolean(errors.confirm))}
              disabled={isLoading}
              data-test-id="register-confirm"
              onChange={(event) => setConfirm(event.target.value)}
            />
          </AuthField>
          <button
            type="submit"
            className="mt-6 w-full rounded bg-accent py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLoading}
            data-test-id="register-submit"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <LoaderCircle className="size-4 animate-spin" />
                {auth.creatingAccount || 'Creating account...'}
              </span>
            ) : (
              auth.signUp || 'Sign Up'
            )}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          {auth.hasAccount || 'Already have an account?'}{' '}
          <Link className="font-medium text-accent hover:underline" to={loginHref}>
            {auth.signIn || 'Sign In'}
          </Link>
        </p>
      </AuthShell>
    </div>
  )
}
