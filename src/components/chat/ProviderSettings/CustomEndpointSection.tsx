import { memo, useCallback, useState } from 'react'

import { useI18n } from '@open-pencil/react'
import { listProviderModels } from '@/app/ai/chat/provider-models'
import AppComboboxInput from '@/components/ui/AppComboboxInput'
import ProviderSettingsField from '@/components/chat/ProviderSettings/ProviderSettingsField'
import ProviderSettingsInput from '@/components/chat/ProviderSettings/ProviderSettingsInput'
import { useProviderSettingsContext } from '@/components/chat/ProviderSettings/context'

export const CustomEndpointSection = memo(function CustomEndpointSection() {
  const ctx = useProviderSettingsContext()
  const { dialogs } = useI18n()
  const [suggestedModels, setSuggestedModels] = useState<Array<{ id: string; name: string }>>([])
  const showModelSuggestions = ctx.providerID === 'openrouter'

  const loadModelSuggestions = useCallback(async () => {
    if (!showModelSuggestions || suggestedModels.length) return
    setSuggestedModels(await listProviderModels(ctx.providerID))
  }, [ctx.providerID, showModelSuggestions, suggestedModels.length])

  if (ctx.isACP) return null

  return (
    <>
      {ctx.providerDef.supportsCustomBaseURL ? (
        <ProviderSettingsField label={dialogs.baseURL}>
          <ProviderSettingsInput
            value={ctx.baseURLInput}
            onValueChange={ctx.setBaseURLInput}
            placeholder="http://localhost:11434/v1"
            onChangeCommit={ctx.save}
          />
        </ProviderSettingsField>
      ) : null}

      {ctx.providerDef.supportsCustomModel ? (
        <ProviderSettingsField label={dialogs.modelID}>
          {showModelSuggestions ? (
            <AppComboboxInput
              value={ctx.customModelInput}
              onValueChange={(value) => {
                ctx.setCustomModelInput(value)
                ctx.save()
              }}
              options={suggestedModels.map((model) => ({ value: model.id, label: model.name }))}
              placeholder="e.g. meta-llama/llama-3.3-70b-instruct"
              onFocus={loadModelSuggestions}
            />
          ) : (
            <ProviderSettingsInput
              value={ctx.customModelInput}
              onValueChange={ctx.setCustomModelInput}
              placeholder="e.g. llama-3.3-70b"
              onChangeCommit={ctx.save}
            />
          )}
        </ProviderSettingsField>
      ) : null}
    </>
  )
})

CustomEndpointSection.displayName = 'CustomEndpointSection'
export default CustomEndpointSection
