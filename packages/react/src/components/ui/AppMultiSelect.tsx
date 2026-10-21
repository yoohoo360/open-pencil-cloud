import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { usePopoverUI } from '#react/components/ui/popover'
import { panelFieldBase } from '#react/theme/panel/field'

import type { AppSelectOption } from './AppSelect'

const triggerClass = `${panelFieldBase} flex w-full min-w-0 cursor-pointer items-center gap-1 px-2 text-left text-[11px]`

function useSelectOpen() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current?.contains(event.target as Node)) return
      setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return { open, setOpen, rootRef }
}

export function AppMultiSelect<T extends string>({
  values,
  options,
  placeholder = '',
  label,
  className,
  disabled,
  onChange,
  'data-test-id': dataTestId
}: {
  values: T[]
  options: AppSelectOption<T>[]
  placeholder?: string
  label?: string
  className?: string
  disabled?: boolean
  onChange: (values: T[]) => void
  'data-test-id'?: string
}) {
  const { open, setOpen, rootRef } = useSelectOpen()
  const cls = usePopoverUI({
    content: 'absolute right-0 top-full z-50 mt-1 min-w-full overflow-hidden p-0'
  })
  const selectedSet = new Set(values.map(String))
  const selectedLabels = options
    .filter((option) => selectedSet.has(String(option.value)))
    .map((option) => option.label)
  const summary = selectedLabels.length === 0 ? placeholder : selectedLabels.join(', ')

  function toggle(value: T) {
    const next = new Set(values)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    onChange([...next])
  }

  return (
    <div ref={rootRef} className={`relative min-w-0 ${className ?? ''}`}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        disabled={disabled}
        data-test-id={dataTestId}
        className={`${triggerClass} disabled:cursor-not-allowed disabled:opacity-50`}
        onClick={() => setOpen((next) => !next)}
      >
        <span
          className={`min-w-0 flex-1 truncate ${
            selectedLabels.length === 0 ? 'text-muted' : ''
          }`}
        >
          {summary}
        </span>
        <ChevronDown className="size-3 shrink-0 text-muted" />
      </button>
      {open ? (
        <div className={cls.content}>
          <div className="max-h-72 overflow-y-auto">
            {options.length === 0 ? (
              <p className="px-3 py-2 text-[11px] text-muted">{placeholder}</p>
            ) : (
              options.map((option) => {
                const selected = selectedSet.has(String(option.value))
                return (
                  <button
                    key={String(option.value)}
                    type="button"
                    disabled={option.disabled}
                    data-test-id={
                      dataTestId ? `${dataTestId}-option-${String(option.value)}` : undefined
                    }
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] leading-tight text-surface hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => toggle(option.value)}
                  >
                    {selected ? (
                      <Check className="size-3 shrink-0 text-accent" />
                    ) : (
                      <span className="size-3 shrink-0" />
                    )}
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
