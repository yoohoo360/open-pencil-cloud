import type { ReactNode } from 'react'
import { AppTextButton } from '@/components/ui/AppTextButton'

interface ProviderSettingsFieldProps {
  label: string
  clearLabel?: string
  'data-test-id'?: string
  onClear?: () => void
  children?: ReactNode
  hint?: ReactNode
}

export function ProviderSettingsField({
  label,
  clearLabel,
  'data-test-id': testId,
  onClear,
  children,
  hint
}: ProviderSettingsFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <label className="text-[10px] text-muted">{label}</label>
        {clearLabel && (
          <AppTextButton data-test-id={testId} onClick={onClear}>
            {clearLabel}
          </AppTextButton>
        )}
      </div>
      {children}
      {hint}
    </div>
  )
}
