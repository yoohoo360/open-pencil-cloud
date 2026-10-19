import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { usePopoverUI } from '#react/components/ui/popover'
import { panelFieldBase } from '#react/theme/panel/field'

export type AppSelectOption<T extends string | number> = {
  value: T
  label: string
  disabled?: boolean
}

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

export function AppSelect<T extends string | number>({
  value,
  options,
  label,
  className,
  onChange,
  'data-property': dataProperty,
  'data-test-id': dataTestId
}: {
  value: T
  options: AppSelectOption<T>[]
  label?: string
  className?: string
  onChange: (value: T) => void
  'data-property'?: string
  'data-test-id'?: string
}) {
  const { open, setOpen, rootRef } = useSelectOpen()
  const cls = usePopoverUI({
    content: 'absolute right-0 top-full z-50 mt-1 min-w-full overflow-hidden p-0'
  })
  const selected = options.find((option) => String(option.value) === String(value))

  return (
    <div ref={rootRef} className={`relative min-w-0 ${className ?? ''}`}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        data-property={dataProperty}
        data-test-id={dataTestId}
        className={triggerClass}
        onClick={() => setOpen((next) => !next)}
      >
        <span className="min-w-0 flex-1 truncate">{selected?.label ?? ''}</span>
        <ChevronDown className="size-3 shrink-0 text-muted" />
      </button>
      {open ? (
        <div className={cls.content}>
          <div className="max-h-72 overflow-y-auto">
            {options.map((option) => {
              const selectedOption = String(option.value) === String(value)
              return (
                <button
                  key={String(option.value)}
                  type="button"
                  disabled={option.disabled}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] leading-tight text-surface hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => {
                    if (String(option.value) !== String(value)) onChange(option.value)
                    setOpen(false)
                  }}
                >
                  {selectedOption ? (
                    <Check className="size-3 shrink-0 text-accent" />
                  ) : (
                    <span className="size-3 shrink-0" />
                  )}
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export type AppSelectGroup<T extends string> = {
  label: string
  items: AppSelectOption<T>[]
}

export function AppGroupedSelect<T extends string>({
  value,
  groups,
  label,
  className,
  onChange,
  'data-property': dataProperty
}: {
  value: T
  groups: AppSelectGroup<T>[]
  label?: string
  className?: string
  onChange: (value: T) => void
  'data-property'?: string
}) {
  const { open, setOpen, rootRef } = useSelectOpen()
  const cls = usePopoverUI({
    content: 'absolute right-0 top-full z-50 mt-1 min-w-full overflow-hidden p-0'
  })
  const selected = groups.flatMap((group) => group.items).find((item) => item.value === value)

  return (
    <div ref={rootRef} className={`relative min-w-0 ${className ?? ''}`}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        data-property={dataProperty}
        className={triggerClass}
        onClick={() => setOpen((next) => !next)}
      >
        <span className="min-w-0 flex-1 truncate">{selected?.label ?? ''}</span>
        <ChevronDown className="size-3 shrink-0 text-muted" />
      </button>
      {open ? (
        <div className={cls.content}>
          <div className="max-h-72 overflow-y-auto">
            {groups.map((group) => (
              <div key={group.label}>
                <div className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-muted">
                  {group.label}
                </div>
                {group.items.map((item) => {
                  const selectedOption = item.value === value
                  return (
                    <button
                      key={item.value}
                      type="button"
                      disabled={item.disabled}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] leading-tight text-surface hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => {
                        if (item.value !== value) onChange(item.value)
                        setOpen(false)
                      }}
                    >
                      {selectedOption ? (
                        <Check className="size-3 shrink-0 text-accent" />
                      ) : (
                        <span className="size-3 shrink-0" />
                      )}
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
