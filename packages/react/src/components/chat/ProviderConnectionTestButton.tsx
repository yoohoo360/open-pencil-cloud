import { Loader2, PlugZap } from 'lucide-react'
import { tv } from 'tailwind-variants'

import type { ProviderConnectionTestFailureReason } from '#react/app/ai/chat/connection-test'
import { useI18n } from '#react/i18n'
import statusTheme from '#react/theme/status'

export type ProviderConnectionTestStatus = 'idle' | 'testing' | 'success' | 'error'

function resultMessage(
  status: ProviderConnectionTestStatus,
  reason: ProviderConnectionTestFailureReason | null,
  dialogs: ReturnType<typeof useI18n>['dialogs']
): string | null {
  if (status === 'success') return dialogs.connectionTestSuccess
  if (status !== 'error') return null
  switch (reason) {
    case 'missing-api-key':
      return dialogs.connectionTestMissingAPIKey
    case 'missing-base-url':
      return dialogs.connectionTestMissingBaseURL
    case 'missing-model':
      return dialogs.connectionTestMissingModel
    case 'invalid-base-url':
      return dialogs.connectionTestInvalidBaseURL
    case 'auth':
      return dialogs.connectionTestAuthFailed
    case 'insufficient-credit':
      return dialogs.connectionTestInsufficientCredit
    case 'model-not-found':
      return dialogs.connectionTestModelNotFound
    case 'api-type':
      return dialogs.connectionTestAPITypeMismatch
    case 'browser-network':
      return dialogs.connectionTestBrowserNetworkFailed
    case 'network':
      return dialogs.connectionTestNetworkFailed
    default:
      return dialogs.connectionTestUnknownFailed
  }
}

export function ProviderConnectionTestButton({
  status,
  reason = null,
  disabled = false,
  onTest
}: {
  status: ProviderConnectionTestStatus
  reason?: ProviderConnectionTestFailureReason | null
  disabled?: boolean
  onTest: () => void
}) {
  const { dialogs } = useI18n()
  const isTesting = status === 'testing'
  const message = resultMessage(status, reason, dialogs)
  const resultTone = status === 'success' ? 'success' : 'error'
  const statusStyles = tv(statusTheme)({ tone: resultTone })

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        data-test-id="provider-test-connection"
        className="rounded border border-panel bg-panel px-2 py-1 text-[11px] font-medium text-surface hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isTesting || disabled}
        onClick={onTest}
      >
        <span className="inline-flex items-center justify-center gap-1.5">
          {isTesting ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <PlugZap className="size-3" />
          )}
          {isTesting ? dialogs.testingConnection : dialogs.testConnection}
        </span>
      </button>
      {message ? (
        <p
          data-tone={resultTone}
          data-test-id="provider-test-connection-result"
          className={statusStyles.text()}
        >
          {message}
        </p>
      ) : null}
    </div>
  )
}
