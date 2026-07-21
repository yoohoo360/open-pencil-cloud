import { memo, useMemo } from 'react'

import { useI18n } from '@open-pencil/react'
import ProviderSettingsField from '@/components/chat/ProviderSettings/ProviderSettingsField'
import ProviderSettingsInput from '@/components/chat/ProviderSettings/ProviderSettingsInput'
import ProviderSettingsLink from '@/components/chat/ProviderSettings/ProviderSettingsLink'

export type ProviderSettingsKeyFieldProps = {
  label: string
  value: string
  onValueChange: (value: string) => void
  saved: boolean
  kind: 'api' | 'pexels' | 'unsplash'
  placeholder: string
  keyUrl?: string
  keyUrlLabel?: string
  onClear: () => void
  onChangeCommit: () => void
}

export const ProviderSettingsKeyField = memo(function ProviderSettingsKeyField({
  label,
  value,
  onValueChange,
  saved,
  kind,
  placeholder,
  keyUrl,
  keyUrlLabel,
  onClear,
  onChangeCommit
}: ProviderSettingsKeyFieldProps) {
  const { dialogs } = useI18n()

  const inputDataTestId = useMemo(() => {
    if (kind === 'pexels') return 'provider-settings-pexels-key'
    if (kind === 'unsplash') return 'provider-settings-unsplash-key'
    return 'provider-settings-api-key'
  }, [kind])

  const clearDataTestId = useMemo(() => {
    if (kind === 'pexels') return 'provider-settings-clear-pexels-key'
    if (kind === 'unsplash') return 'provider-settings-clear-unsplash-key'
    return 'provider-settings-clear-key'
  }, [kind])

  return (
    <ProviderSettingsField
      label={label}
      clearLabel={saved ? dialogs.clear : undefined}
      onClear={onClear}
    >
      <ProviderSettingsInput
        value={value}
        onValueChange={onValueChange}
        type="password"
        placeholder={placeholder}
        onChangeCommit={onChangeCommit}
        {...{ 'data-test-id': inputDataTestId, 'data-testid': inputDataTestId }}
      />
      {keyUrl && keyUrlLabel ? (
        <ProviderSettingsLink href={keyUrl}>{keyUrlLabel}</ProviderSettingsLink>
      ) : null}
    </ProviderSettingsField>
  )
})

ProviderSettingsKeyField.displayName = 'ProviderSettingsKeyField'
export default ProviderSettingsKeyField
