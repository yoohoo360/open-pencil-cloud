import IconLucideLoader2 from '~icons/lucide/loader-2'
import IconLucidePlugZap from '~icons/lucide/plug-zap'
import { memo, useMemo } from 'react'
import { tv } from 'tailwind-variants'

import { useI18n } from '@open-pencil/react'
import type { ProviderConnectionTestFailureReason } from '@/app/ai/chat/connection-test'
import statusTheme from '@/theme/status'

export type ProviderConnectionTestButtonProps = {
  status: 'idle' | 'testing' | 'success' | 'error'
  reason?: ProviderConnectionTestFailureReason | null
  disabled?: boolean
  onTest: () => void
}

export const ProviderConnectionTestButton = memo(function ProviderConnectionTestButton({
  status,
  reason,
  disabled = false,
  onTest
}: ProviderConnectionTestButtonProps) {
  const { dialogs } = useI18n()

  const resultMessage = useMemo(() => {
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
  }, [dialogs, reason, status])

  const isTesting = status === 'testing'
  const resultTone = status === 'success' ? 'success' : 'error'
  const statusStyles = useMemo(() => tv(statusTheme)({ tone: resultTone }), [resultTone])

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
            <IconLucideLoader2 className="size-3 animate-spin" />
          ) : (
            <IconLucidePlugZap className="size-3" />
          )}
          {isTesting ? dialogs.testingConnection : dialogs.testConnection}
        </span>
      </button>
      {resultMessage ? (
        <p
          data-tone={resultTone}
          className={statusStyles.text()}
          data-test-id="provider-test-connection-result"
        >
          {resultMessage}
        </p>
      ) : null}
    </div>
  )
})

ProviderConnectionTestButton.displayName = 'ProviderConnectionTestButton'
export default ProviderConnectionTestButton
