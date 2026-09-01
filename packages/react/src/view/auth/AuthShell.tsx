import type { ReactNode } from 'react'
import { Pencil } from 'lucide-react'

export function AuthShell({
  title,
  subtitle,
  children
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <div className="flex h-full items-center justify-center overflow-y-auto bg-canvas px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-panel p-8 shadow-lg">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
            <Pencil className="size-8 text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-surface">{title}</h1>
          <p className="mt-2 text-sm text-muted">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  )
}

export function AuthAlert({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 rounded bg-danger/10 px-4 py-2 text-sm text-danger" role="alert">
      {children}
    </div>
  )
}

export function AuthField({
  id,
  label,
  error,
  children
}: {
  id: string
  label: string
  error?: string
  children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-surface">
        {label}
      </label>
      {children}
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
    </div>
  )
}

export function authInputClass(hasError: boolean): string {
  return `mt-1.5 block w-full rounded border bg-input px-3 py-2 text-sm text-surface placeholder:text-muted focus:outline-none focus:ring-1 disabled:opacity-50 ${
    hasError
      ? 'border-danger focus:border-danger focus:ring-danger'
      : 'border-border focus:border-accent focus:ring-accent'
  }`
}
