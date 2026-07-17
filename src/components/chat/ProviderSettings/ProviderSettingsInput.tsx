import { AppInput } from '@/components/ui/AppInput'

interface ProviderSettingsInputProps {
  value: string | number
  type?: 'text' | 'password' | 'number'
  placeholder?: string
  min?: number
  max?: number
  step?: number
  'data-test-id'?: string
  onChange?: (value: string | number) => void
}

export function ProviderSettingsInput({
  value,
  type = 'text',
  placeholder,
  min,
  max,
  step,
  'data-test-id': testId,
  onChange
}: ProviderSettingsInputProps) {
  return (
    <AppInput
      value={String(value)}
      type={type}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
      size="sm"
      data-test-id={testId}
      onChange={(e) => onChange?.(type === 'number' ? Number(e.target.value) : e.target.value)}
    />
  )
}
