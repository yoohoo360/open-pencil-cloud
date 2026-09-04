import { oauthStartUrl, type OauthProvider } from '#react/app/auth/oauth'
import { Tip } from '#react/components/ui/Tip'
import { useI18n } from '#react/i18n'
import { Github } from 'lucide-react'

const PROVIDERS: Array<{
  id: OauthProvider
  labelKey: 'continueWithGithub' | 'continueWithGoogle'
  fallback: string
}> = [
  { id: 'github', labelKey: 'continueWithGithub', fallback: 'Continue with GitHub' },
  { id: 'google', labelKey: 'continueWithGoogle', fallback: 'Continue with Google' }
]

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5c-.3 1.5-1.1 2.8-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.5 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1C3.4 21.4 7.4 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.4 14.4c-.2-.7-.4-1.4-.4-2.4s.1-1.7.4-2.4V6.5H1.4C.5 8.3 0 10.1 0 12s.5 3.7 1.4 5.5l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c1.7 0 3.3.6 4.5 1.7l3.4-3.4C17.9 1.2 15.2 0 12 0 7.4 0 3.4 2.6 1.4 6.5l4 3.1C6.3 6.8 8.9 4.8 12 4.8Z"
      />
    </svg>
  )
}

function ProviderIcon({ id }: { id: OauthProvider }) {
  if (id === 'google') return <GoogleMark />
  return <Github className="size-5" />
}

export function OauthButtons({ redirect }: { redirect: string | null }) {
  const { auth } = useI18n()

  return (
    <div className="flex items-center justify-center gap-3 pt-1">
      {PROVIDERS.map((provider) => {
        const label = auth[provider.labelKey] || provider.fallback
        return (
          <Tip key={provider.id} label={label}>
            <a
              href={oauthStartUrl(provider.id, redirect)}
              className="flex size-10 items-center justify-center rounded-full border border-border bg-input text-surface transition-colors hover:bg-canvas"
              aria-label={label}
              data-test-id={`oauth-${provider.id}`}
            >
              <ProviderIcon id={provider.id} />
            </a>
          </Tip>
        )
      })}
    </div>
  )
}
