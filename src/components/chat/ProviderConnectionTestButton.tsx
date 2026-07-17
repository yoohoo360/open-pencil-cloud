import IconLoaderTwo from '~icons/lucide/loader-2'
import IconPlugZap from '~icons/lucide/plug-zap'

import { useI18n } from '@open-pencil/react'
import type { ProviderConnectionTestFailureReason } from '@/app/ai/chat/connection-test'

interface ProviderConnectionTestButtonProps {
  status: 'idle' | 'testing' | 'success' | 'error'
  reason?: ProviderConnectionTestFailureReason | null
  disabled?: boolean
  onTest?: () => void
}

export function ProviderConnectionTestButton({
  status,
  reason,
  disabled = false,
  onTest
}: ProviderConnectionTestButtonProps) {
  const { dialogs } = useI18n()
  const isTesting = status === 'testing'

  function getResultMessage(): string | null {
    if (status === 'success') return dialogs.connectionTestSuccess
    if (status !== 'error') return null
    switch (reason) {
      case 'missing-api-key': return dialogs.connectionTestMissingAPIKey
      case 'missing-base-url': return dialogs.connectionTestMissingBaseURL
      case 'missing-model': return dialogs.connectionTestMissingModel
      case 'invalid-base-url': return dialogs.connectionTestInvalidBaseURL
      case 'auth': return dialogs.connectionTestAuthFailed
      case 'model-not-found': return dialogs.connectionTestModelNotFound
      case 'api-type': return dialogs.connectionTestAPITypeMismatch
      case 'browser-network': return dialogs.connectionTestBrowserNetworkFailed
      case 'network': return dialogs.connectionTestNetworkFailed
      default: return dialogs.connectionTestUnknownFailed
    }
  }

  const resultMessage = getResultMessage()

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
          {isTesting
            ? <IconLoaderTwo className="size-3 animate-spin" />
            : <IconPlugZap className="size-3" />
          }
          {isTesting ? dialogs.testingConnection : dialogs.testConnection}
        </span>
      </button>

      {resultMessage && (
        <p
          className={`text-[10px] leading-snug ${status === 'success' ? 'text-green-400' : 'text-red-400'}`}
          data-test-id="provider-test-connection-result"
        >
          {resultMessage}
        </p>
      )}
    </div>
  )
}
