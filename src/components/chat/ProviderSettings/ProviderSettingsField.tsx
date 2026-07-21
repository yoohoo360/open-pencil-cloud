import { memo, type ReactNode } from 'react'

import AppTextButton from '@/components/ui/AppTextButton'

export type ProviderSettingsFieldProps = {
  label: string
  clearLabel?: string
  onClear?: () => void
  children: ReactNode
  hint?: ReactNode
}

export const ProviderSettingsField = memo(function ProviderSettingsField({
  label,
  clearLabel,
  onClear,
  children,
  hint
}: ProviderSettingsFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <label className="text-[10px] text-muted">{label}</label>
        {clearLabel && onClear ? (
          <AppTextButton onClick={onClear}>{clearLabel}</AppTextButton>
        ) : null}
      </div>
      {children}
      {hint}
    </div>
  )
})

ProviderSettingsField.displayName = 'ProviderSettingsField'
export default ProviderSettingsField
