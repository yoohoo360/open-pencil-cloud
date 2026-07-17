import { useI18n } from '@open-pencil/react'
import { ProviderSettingsField } from '@/components/chat/ProviderSettings/ProviderSettingsField'
import { ProviderSettingsInput } from '@/components/chat/ProviderSettings/ProviderSettingsInput'
import { ProviderSettingsLink } from '@/components/chat/ProviderSettings/ProviderSettingsLink'

interface ProviderSettingsKeyFieldProps {
  label: string
  value: string
  saved: boolean
  kind: 'api' | 'pexels' | 'unsplash'
  placeholder: string
  keyUrl?: string
  keyUrlLabel?: string
  onChange?: (value: string) => void
  onClear?: () => void
}

export function ProviderSettingsKeyField({
  label,
  value,
  saved,
  kind,
  placeholder,
  keyUrl,
  keyUrlLabel,
  onChange,
  onClear
}: ProviderSettingsKeyFieldProps) {
  const { dialogs } = useI18n()

  const inputDataTestId =
    kind === 'pexels' ? 'provider-settings-pexels-key'
    : (kind === 'unsplash' ? 'provider-settings-unsplash-key' : 'provider-settings-api-key')

  const clearDataTestId =
    kind === 'pexels' ? 'provider-settings-clear-pexels-key'
    : (kind === 'unsplash' ? 'provider-settings-clear-unsplash-key' : 'provider-settings-clear-key')

  return (
    <ProviderSettingsField
      label={label}
      clearLabel={saved ? dialogs.clear : undefined}
      data-test-id={clearDataTestId}
      onClear={onClear}
      hint={
        keyUrl && keyUrlLabel ? (
          <ProviderSettingsLink href={keyUrl}>{keyUrlLabel}</ProviderSettingsLink>
        ) : undefined
      }
    >
      <ProviderSettingsInput
        value={value}
        type="password"
        data-test-id={inputDataTestId}
        placeholder={placeholder}
        onChange={(v) => onChange?.(String(v))}
      />
    </ProviderSettingsField>
  )
}
