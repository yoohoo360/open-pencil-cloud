import { memo } from 'react'

import ProviderSelect from '@/components/chat/ProviderSelect/ProviderSelect'

export const ProviderSelectField = memo(function ProviderSelectField() {
  return (
    <ProviderSelect
      ui={{
        trigger:
          'w-full justify-between rounded border border-border bg-input px-2.5 py-1.5 text-xs text-surface',
        item: 'rounded px-2 py-1.5 text-[11px]'
      }}
    />
  )
})

ProviderSelectField.displayName = 'ProviderSelectField'
export default ProviderSelectField
