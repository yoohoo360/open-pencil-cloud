import { useMemo, useRef, useState } from 'react'
import type { ChangeEventHandler } from 'react'

import { AppBadge } from '@/components/ui/AppBadge'
import { useInputUI } from '@/components/ui/input'
import { useSelectUI } from '@/components/ui/select'

export type AppComboboxOption = {
  value: string
  label: string
  meta?: string
}

export interface AppComboboxInputProps {
  value: string
  options: AppComboboxOption[]
  placeholder?: string
  ui?: {
    input?: string
    content?: string
    item?: string
    viewport?: string
    empty?: string
  }
  onChange?: (value: string) => void
  className?: string
}

export function AppComboboxInput({
  value,
  options,
  placeholder,
  ui,
  onChange,
  className
}: AppComboboxInputProps) {
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const select = useSelectUI({
    content: ui?.content ?? 'max-h-56 min-w-full',
    item: ui?.item ?? 'gap-2 rounded px-2 py-1.5 text-[11px]'
  })
  const inputClass = useInputUI({ size: 'sm', ui: { base: [ui?.input, className].filter(Boolean).join(' ') } }).base
  const viewportClass = ui?.viewport ?? 'max-h-56 overflow-y-auto p-0.5'
  const emptyClass = ui?.empty ?? 'px-2 py-2 text-[11px] text-muted'

  const filteredOptions = useMemo(() => {
    const query = value.trim().toLowerCase()
    if (!query) return options.slice(0, 50)
    return options
      .filter((option) => {
        const v = option.value.toLowerCase()
        const l = option.label.toLowerCase()
        return v.includes(query) || l.includes(query)
      })
      .slice(0, 50)
  }, [value, options])

  const handleChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    onChange?.(e.target.value)
    setOpen(true)
  }

  const handleSelect = (optionValue: string) => {
    onChange?.(optionValue)
    setOpen(false)
    inputRef.current?.blur()
  }

  const handleBlur = () => {
    setTimeout(() => setOpen(false), 150)
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        value={value}
        type="text"
        placeholder={placeholder}
        className={inputClass}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        onChange={handleChange}
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
      />
      {open && (filteredOptions.length > 0 || options.length > 0) && (
        <div className={`absolute left-0 top-full z-50 mt-0.5 w-full ${select.content}`}>
          <div className={viewportClass}>
            {filteredOptions.map((option) => (
              <div
                key={option.value}
                className={`flex cursor-pointer items-center ${select.item}`}
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleSelect(option.value)
                }}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-surface">{option.label}</div>
                  <div className="truncate font-mono text-[10px] text-muted">{option.value}</div>
                </div>
                {option.meta && <AppBadge>{option.meta}</AppBadge>}
              </div>
            ))}
            {filteredOptions.length === 0 && (
              <div className={emptyClass}>No matching models</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
