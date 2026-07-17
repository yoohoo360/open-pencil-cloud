import { useState } from 'react'
import { useI18n } from '@open-pencil/react'
import { AppComboboxInput } from '@/components/ui/AppComboboxInput'
import { ProviderSettingsField } from '@/components/chat/ProviderSettings/ProviderSettingsField'
import { ProviderSettingsInput } from '@/components/chat/ProviderSettings/ProviderSettingsInput'
import { useProviderSettingsContext } from '@/components/chat/ProviderSettings/context'
import { useStore } from '@nanostores/react'
import { listProviderModels } from '@/app/ai/chat/provider-models'

export function CustomEndpointSection() {
  const ctx = useProviderSettingsContext()
  const { dialogs } = useI18n()
  const [suggestedModels, setSuggestedModels] = useState<Array<{ id: string; name: string }>>([])
  const providerID = useStore(ctx.providerID)
  const providerDef = useStore(ctx.providerDef) as { supportsCustomBaseURL?: boolean; supportsCustomModel?: boolean }

  if (ctx.isACP) return null

  const showModelSuggestions = providerID === 'openrouter'

  async function loadModelSuggestions() {
    if (!showModelSuggestions || suggestedModels.length) return
    setSuggestedModels(await listProviderModels(providerID))
  }

  return (
    <>
      {providerDef.supportsCustomBaseURL && (
        <ProviderSettingsField label={dialogs.baseURL}>
          <ProviderSettingsInput
            value={ctx.baseURLInput}
            data-test-id="provider-settings-base-url"
            placeholder="http://localhost:11434/v1"
            onChange={(v) => { ctx.setBaseURLInput(String(v)); ctx.save() }}
          />
        </ProviderSettingsField>
      )}

      {providerDef.supportsCustomModel && (
        <ProviderSettingsField label={dialogs.modelID}>
          {showModelSuggestions ? (
            <AppComboboxInput
              value={ctx.customModelInput}
              data-test-id="provider-settings-custom-model"
              options={suggestedModels.map((model) => ({ value: model.id, label: model.name }))}
              placeholder="e.g. meta-llama/llama-3.3-70b-instruct"
              onFocus={loadModelSuggestions}
              onChange={(v) => { ctx.setCustomModelInput(v); ctx.save() }}
            />
          ) : (
            <ProviderSettingsInput
              value={ctx.customModelInput}
              data-test-id="provider-settings-custom-model"
              placeholder="e.g. llama-3.3-70b"
              onChange={(v) => { ctx.setCustomModelInput(String(v)); ctx.save() }}
            />
          )}
        </ProviderSettingsField>
      )}
    </>
  )
}
