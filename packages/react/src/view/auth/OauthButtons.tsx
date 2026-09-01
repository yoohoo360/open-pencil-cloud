import { useEffect, useState } from 'react'

import { oauthStartUrl, type OauthProviders } from '#react/app/auth/oauth'
import { useI18n } from '#react/i18n'
import { authAPI } from '#react/lib/client'

export function OauthButtons({ redirect }: { redirect: string | null }) {
  const { auth } = useI18n()
  const [providers, setProviders] = useState<OauthProviders>({ github: false, google: false })

  useEffect(() => {
    let cancelled = false
    void authAPI.oauthProviders().then((next) => {
      if (!cancelled) setProviders(next)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!providers.github && !providers.google) return null

  return (
    <div className="mb-6 space-y-2">
      {providers.github ? (
        <a
          href={oauthStartUrl('github', redirect)}
          className="flex w-full items-center justify-center rounded border border-border bg-input py-2.5 text-sm font-medium text-surface transition-colors hover:bg-canvas"
          data-test-id="oauth-github"
        >
          {auth.continueWithGithub || 'Continue with GitHub'}
        </a>
      ) : null}
      {providers.google ? (
        <a
          href={oauthStartUrl('google', redirect)}
          className="flex w-full items-center justify-center rounded border border-border bg-input py-2.5 text-sm font-medium text-surface transition-colors hover:bg-canvas"
          data-test-id="oauth-google"
        >
          {auth.continueWithGoogle || 'Continue with Google'}
        </a>
      ) : null}
      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-panel px-2 text-xs text-muted">{auth.orEmail || 'or email'}</span>
        </div>
      </div>
    </div>
  )
}
