import { ProviderConnectionTestButton } from '@/components/chat/ProviderConnectionTestButton'
import { useProviderSettingsContext } from '@/components/chat/ProviderSettings/context'

export function TestConnectionSection() {
  const ctx = useProviderSettingsContext()
  if (ctx.isACP) return null

  return (
    <ProviderConnectionTestButton
      status={ctx.connectionTestStatus}
      reason={ctx.connectionTestReason}
      disabled={!ctx.canTestConnection}
      onTest={() => void ctx.testConnection()}
    />
  )
}
