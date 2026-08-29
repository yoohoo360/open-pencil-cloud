import type { ReactNode } from 'react'

export function SettingsField({
  label,
  htmlFor,
  children
}: {
  label: string
  htmlFor?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-[10px] text-muted">
        {label}
      </label>
      {children}
    </div>
  )
}
