import { useI18n } from '@open-pencil/react'
import { ProviderSettingsKeyField } from '@/components/chat/ProviderSettings/ProviderSettingsKeyField'
import { useProviderSettingsContext } from '@/components/chat/ProviderSettings/context'

export function ApiKeySection() {
  const ctx = useProviderSettingsContext()
  const { dialogs } = useI18n()

  if (ctx.isACP) return null

  return (
    <ProviderSettingsKeyField
      label={dialogs.apiKey}
      value={ctx.keyInput}
      saved={!!ctx.apiKey.get()}
      kind="api"
      placeholder={ctx.hasExistingKey ? dialogs.keySavedReplace : (ctx.providerDef.get() as { keyPlaceholder?: string }).keyPlaceholder ?? ''}
      keyUrl={(ctx.providerDef.get() as { keyURL?: string }).keyURL}
      keyUrlLabel={dialogs.getAPIKeyGeneric}
      onChange={ctx.setKeyInput}
      onClear={ctx.clearKey}
    />
  )
}
