import { memo } from 'react'

import { useI18n } from '@open-pencil/react'
import ProviderSettingsKeyField from '@/components/chat/ProviderSettings/ProviderSettingsKeyField'
import { useProviderSettingsContext } from '@/components/chat/ProviderSettings/context'

export const ApiKeySection = memo(function ApiKeySection() {
  const ctx = useProviderSettingsContext()
  const { dialogs } = useI18n()

  if (ctx.isACP) return null

  return (
    <ProviderSettingsKeyField
      label={dialogs.apiKey}
      value={ctx.keyInput}
      onValueChange={ctx.setKeyInput}
      saved={!!ctx.apiKey}
      kind="api"
      placeholder={ctx.hasExistingKey ? dialogs.keySavedReplace : ctx.providerDef.keyPlaceholder}
      keyUrl={ctx.providerDef.keyURL}
      keyUrlLabel={dialogs.getAPIKeyGeneric}
      onClear={ctx.clearKey}
      onChangeCommit={ctx.save}
    />
  )
})

ApiKeySection.displayName = 'ApiKeySection'
export default ApiKeySection
