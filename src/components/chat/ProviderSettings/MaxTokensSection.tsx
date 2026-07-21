import { memo } from 'react'

import { useI18n } from '@open-pencil/react'
import ProviderSettingsField from '@/components/chat/ProviderSettings/ProviderSettingsField'
import ProviderSettingsInput from '@/components/chat/ProviderSettings/ProviderSettingsInput'
import { useProviderSettingsContext } from '@/components/chat/ProviderSettings/context'

export const MaxTokensSection = memo(function MaxTokensSection() {
  const ctx = useProviderSettingsContext()
  const { dialogs } = useI18n()

  if (ctx.isACP) return null

  return (
    <ProviderSettingsField label={dialogs.maxOutputTokens}>
      <ProviderSettingsInput
        value={ctx.maxOutputTokens}
        onValueChange={(value) => ctx.setMaxOutputTokens(Number(value))}
        type="number"
        min={1024}
        max={128000}
        step={1024}
      />
    </ProviderSettingsField>
  )
})

MaxTokensSection.displayName = 'MaxTokensSection'
export default MaxTokensSection
