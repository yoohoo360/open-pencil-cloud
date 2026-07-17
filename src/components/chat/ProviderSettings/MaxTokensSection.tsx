import { useI18n } from '@open-pencil/react'
import { ProviderSettingsField } from '@/components/chat/ProviderSettings/ProviderSettingsField'
import { ProviderSettingsInput } from '@/components/chat/ProviderSettings/ProviderSettingsInput'
import { useProviderSettingsContext } from '@/components/chat/ProviderSettings/context'
import { useStore } from '@nanostores/react'

export function MaxTokensSection() {
  const ctx = useProviderSettingsContext()
  const { dialogs } = useI18n()
  const maxOutputTokens = useStore(ctx.maxOutputTokens)

  if (ctx.isACP) return null

  return (
    <ProviderSettingsField label={dialogs.maxOutputTokens}>
      <ProviderSettingsInput
        value={maxOutputTokens}
        type="number"
        data-test-id="provider-settings-max-tokens"
        min={1024}
        max={128000}
        step={1024}
        onChange={(v) => ctx.maxOutputTokens.set(Number(v))}
      />
    </ProviderSettingsField>
  )
}
