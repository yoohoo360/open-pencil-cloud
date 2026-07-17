import { useRef, useState, type HTMLAttributes } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'

import IconChevronDown from '~icons/lucide/chevron-down'
import IconCheck from '~icons/lucide/check'

import { useInputUI } from '@/components/ui/input'
import { menuItem, useMenuUI } from '@/components/ui/menu'
import { Tip } from '@/components/ui/Tip'

interface ExportScaleInputProps extends HTMLAttributes<HTMLDivElement> {
  value: number
  presets: readonly number[]
  clamp: (scale: number) => number
  label?: string
  onChange?: (value: number) => void
}

export function ExportScaleInput({
  value,
  presets,
  clamp,
  label,
  onChange,
  ...attrs
}: ExportScaleInputProps) {
  const [text, setText] = useState(() => `${value}x`)
  const inputRef = useRef<HTMLInputElement>(null)

  if (`${value}x` !== text && !inputRef.current?.matches(':focus')) {
    setText(`${value}x`)
  }

  const inputClass = useInputUI({
    size: 'sm',
    ui: { base: 'min-w-0 flex-1 rounded-none border-0 bg-transparent focus:border-transparent' }
  }).base
  const menuCls = useMenuUI({ content: 'min-w-[7rem]' })
  const itemCls = menuItem({ justify: 'between' })

  function commit() {
    const parsed = Number.parseFloat(text.replace(/[^0-9.]/g, ''))
    if (Number.isFinite(parsed) && parsed > 0) {
      const clamped = clamp(parsed)
      onChange?.(clamped)
      setText(`${clamped}x`)
    } else {
      setText(`${value}x`)
    }
  }

  function pick(scale: number) {
    onChange?.(scale)
    setText(`${scale}x`)
  }

  function isActive(scale: number) {
    return Math.abs(value - scale) < 1e-9
  }

  return (
    <Tip label={label} disabled={!label}>
      <div
        {...attrs}
        className="flex min-w-0 flex-1 overflow-hidden rounded border border-border bg-input focus-within:border-accent"
      >
        <input
          ref={inputRef}
          value={text}
          type="text"
          aria-label={label}
          className={inputClass}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => inputRef.current?.select()}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); inputRef.current?.blur() }
            if (e.key === 'Escape') { e.preventDefault(); setText(`${value}x`); inputRef.current?.blur() }
          }}
        />
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              aria-label={label}
              className="flex shrink-0 cursor-pointer items-center border-l border-border px-1.5 text-surface hover:bg-hover"
            >
              <IconChevronDown className="size-3 text-muted" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content side="bottom" align="end" sideOffset={4} className={menuCls.content}>
              {presets.map((scale) => (
                <DropdownMenu.Item
                  key={scale}
                  className={itemCls}
                  onSelect={() => pick(scale)}
                >
                  <span>{scale}x</span>
                  {isActive(scale) && <IconCheck className="size-3 text-accent" />}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </Tip>
  )
}
