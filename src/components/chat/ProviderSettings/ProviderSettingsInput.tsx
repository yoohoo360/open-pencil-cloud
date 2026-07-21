import { memo } from 'react'

import AppInput from '@/components/ui/AppInput'

export type ProviderSettingsInputProps = {
  value: string | number
  onValueChange: (value: string) => void
  type?: 'text' | 'password' | 'number'
  placeholder?: string
  min?: number
  max?: number
  step?: number
  onChangeCommit?: () => void
}

export const ProviderSettingsInput = memo(function ProviderSettingsInput({
  value,
  onValueChange,
  type = 'text',
  placeholder,
  min,
  max,
  step,
  onChangeCommit
}: ProviderSettingsInputProps) {
  return (
    <AppInput
      value={value}
      onValueChange={onValueChange}
      type={type}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
      size="sm"
      onChangeCommit={onChangeCommit}
    />
  )
})

ProviderSettingsInput.displayName = 'ProviderSettingsInput'
export default ProviderSettingsInput
