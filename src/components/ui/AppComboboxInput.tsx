import * as Popover from '@radix-ui/react-popover'
import { memo, useCallback, useMemo, useState, type InputHTMLAttributes } from 'react'
import { twMerge } from 'tailwind-merge'

import AppBadge from '@/components/ui/AppBadge'
import { useInputUI } from '@/components/ui/input'
import { useSelectUI } from '@/components/ui/select'

export type AppComboboxOption = {
  value: string
  label: string
  meta?: string
}

export type AppComboboxInputProps = {
  value: string
  onValueChange: (value: string) => void
  options: AppComboboxOption[]
  placeholder?: string
  ui?: {
    input?: string
    content?: string
    item?: string
    viewport?: string
    empty?: string
  }
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>

export const AppComboboxInput = memo(function AppComboboxInput({
  value,
  onValueChange,
  options,
  placeholder,
  ui,
  className,
  ...rest
}: AppComboboxInputProps) {
  const [open, setOpen] = useState(false)

  const select = useSelectUI({
    content: ui?.content ?? 'max-h-56 min-w-[var(--radix-popover-trigger-width)]',
    item: ui?.item ?? 'gap-2 rounded px-2 py-1.5 text-[11px]'
  })
  const inputClass = useMemo(
    () => useInputUI({ size: 'sm', ui: { base: ui?.input } }).base,
    [ui?.input]
  )
  const viewportClass = ui?.viewport ?? 'max-h-56 overflow-y-auto p-0.5'
  const emptyClass = ui?.empty ?? 'px-2 py-2 text-[11px] text-muted'

  const filteredOptions = useMemo(() => {
    const query = value.trim().toLowerCase()
    if (!query) return options.slice(0, 50)
    return options
      .filter((option) => {
        const optionValue = option.value.toLowerCase()
        const label = option.label.toLowerCase()
        return optionValue.includes(query) || label.includes(query)
      })
      .slice(0, 50)
  }, [options, value])

  const updateValue = useCallback(
    (next: string) => {
      onValueChange(next)
    },
    [onValueChange]
  )

  const showDropdown = open && (filteredOptions.length > 0 || options.length > 0)

  return (
    <Popover.Root open={showDropdown} onOpenChange={setOpen}>
      <Popover.Anchor asChild>
        <input
          {...rest}
          value={value}
          type="text"
          placeholder={placeholder}
          className={twMerge(inputClass, className)}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          onFocus={() => setOpen(true)}
          onChange={(event) => updateValue(event.target.value)}
        />
      </Popover.Anchor>
      <Popover.Portal>
        {showDropdown ? (
          <Popover.Content
            side="bottom"
            align="start"
            sideOffset={2}
            className={select.content}
            onOpenAutoFocus={(event) => event.preventDefault()}
          >
            <div className={viewportClass}>
              {filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={twMerge(select.item, 'flex w-full text-left')}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    updateValue(option.value)
                    setOpen(false)
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-surface">{option.label}</div>
                    <div className="truncate font-mono text-[10px] text-muted">{option.value}</div>
                  </div>
                  {option.meta ? <AppBadge>{option.meta}</AppBadge> : null}
                </button>
              ))}
              {filteredOptions.length === 0 ? (
                <div className={emptyClass}>No matching models</div>
              ) : null}
            </div>
          </Popover.Content>
        ) : null}
      </Popover.Portal>
    </Popover.Root>
  )
})

AppComboboxInput.displayName = 'AppComboboxInput'
export default AppComboboxInput
