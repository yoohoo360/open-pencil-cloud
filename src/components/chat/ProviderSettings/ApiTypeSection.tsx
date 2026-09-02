import { useI18n } from '@open-pencil/react'
import { ProviderSettingsField } from '@/components/chat/ProviderSettings/ProviderSettingsField'
import { useProviderSettingsContext } from '@/components/chat/ProviderSettings/context'
import { useStore } from '@nanostores/react'

export function ApiTypeSection() {
  const ctx = useProviderSettingsContext()
  const { dialogs } = useI18n()
  const providerID = useStore(ctx.providerID)
  const customAPIType = useStore(ctx.customAPIType)

  if (ctx.isACP || providerID !== 'openai-compatible') return null

  return (
    <ProviderSettingsField label={dialogs.apiType}>
      <div
        data-test-id="provider-settings-api-type"
        className="flex rounded bg-canvas"
      >
        <button
          className={`flex-1 rounded px-2 py-1 text-[10px] ${customAPIType === 'completions' ? 'bg-hover text-surface' : 'text-muted'}`}
          onClick={() => ctx.setCustomAPIType('completions')}
        >
          {dialogs.completions}
        </button>
        <button
          className={`flex-1 rounded px-2 py-1 text-[10px] ${customAPIType === 'responses' ? 'bg-hover text-surface' : 'text-muted'}`}
          onClick={() => ctx.setCustomAPIType('responses')}
        >
          {dialogs.responses}
        </button>
      </div>
    </ProviderSettingsField>
  )
}
