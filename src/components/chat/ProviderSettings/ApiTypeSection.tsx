import { memo, useMemo } from 'react'

import { useI18n } from '@open-pencil/react'
import ProviderSettingsField from '@/components/chat/ProviderSettings/ProviderSettingsField'
import SegmentedControl from '@/components/ui/SegmentedControl'
import { useProviderSettingsContext } from '@/components/chat/ProviderSettings/context'

export const ApiTypeSection = memo(function ApiTypeSection() {
  const ctx = useProviderSettingsContext()
  const { dialogs } = useI18n()
  const options = useMemo(
    () => [
      { value: 'completions', label: dialogs.completions },
      { value: 'responses', label: dialogs.responses }
    ],
    [dialogs.completions, dialogs.responses]
  )

  if (ctx.isACP || ctx.providerID !== 'openai-compatible') return null

  return (
    <ProviderSettingsField label={dialogs.apiType}>
      <SegmentedControl
        value={ctx.customAPIType}
        onValueChange={ctx.setCustomAPIType}
        options={options}
        ui={{ root: 'rounded bg-canvas' }}
      />
    </ProviderSettingsField>
  )
})

ApiTypeSection.displayName = 'ApiTypeSection'
export default ApiTypeSection
