import { useEffect, useRef, useState, type ReactNode } from 'react'

import { panelFieldBase } from '#react/theme/panel/field'
import { useOptionalBindableValue } from '#react/primitives/BindableValue/context'
import { useOptionalEditorStore } from '#react/app/editor/store'

export function NumberField({
  value,
  min,
  max,
  icon,
  suffix,
  trailing,
  boundDisplay,
  disabled,
  className,
  'aria-label': ariaLabel,
  'data-property': dataProperty,
  onCommit
}: {
  value: number
  min?: number
  max?: number
  icon?: ReactNode
  suffix?: string
  trailing?: ReactNode
  boundDisplay?: ReactNode
  disabled?: boolean
  className?: string
  'aria-label'?: string
  'data-property'?: string
  onCommit: (value: number, previous: number) => void
}) {
  const rawBinding = useOptionalBindableValue<number>()
  const binding =
    rawBinding &&
    (rawBinding.state !== 'bound' || typeof rawBinding.resolvedValue === 'number')
      ? rawBinding
      : undefined
  const displayValue =
    binding?.state === 'bound' && typeof binding.resolvedValue === 'number'
      ? binding.resolvedValue
      : value
  const [text, setText] = useState(formatNumber(displayValue))
  const [revealInput, setRevealInput] = useState(false)
  const focused = useRef(false)
  const previous = useRef(displayValue)
  const mutated = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const store = useOptionalEditorStore()
  const showBound = Boolean(boundDisplay) && binding?.state === 'bound' && !revealInput

  useEffect(() => {
    if (!focused.current) setText(formatNumber(displayValue))
  }, [displayValue])

  useEffect(() => {
    if (revealInput) inputRef.current?.focus()
  }, [revealInput])

  function requestMutation() {
    if (mutated.current) return true
    if (binding && !binding.actions.beginMutation('edit')) return false
    mutated.current = true
    return true
  }

  function commit() {
    let next = Number.parseFloat(text)
    if (!Number.isFinite(next)) {
      setText(formatNumber(displayValue))
      binding?.actions.commitMutation()
      mutated.current = false
      return
    }
    if (min != null) next = Math.max(min, next)
    if (max != null) next = Math.min(max, next)
    setText(formatNumber(next))
    if (next !== previous.current) {
      if (binding?.actions.applyValue(next)) {
        binding.actions.commitMutation()
        mutated.current = false
        previous.current = next
        return
      }
      onCommit(next, previous.current)
    }
    binding?.actions.commitMutation()
    mutated.current = false
    previous.current = next
  }

  return (
    <div
      data-slot="number-field"
      data-property={dataProperty}
      data-disabled={disabled ? '' : undefined}
      data-bound={binding?.state === 'bound' ? '' : undefined}
      data-mixed={binding?.state === 'mixed' ? '' : undefined}
      className={`group flex min-h-6 flex-1 cursor-text items-center text-[11px] tabular-nums ${panelFieldBase} ${className ?? ''}`}
    >
      {icon ? (
        <span className="flex shrink-0 items-center justify-center self-stretch px-[5px] text-muted select-none">
          {icon}
        </span>
      ) : null}
      {showBound ? (
        <span
          className="min-w-0 flex-1 cursor-text"
          onClick={() => setRevealInput(true)}
        >
          {boundDisplay}
        </span>
      ) : (
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          aria-label={ariaLabel}
          disabled={disabled}
          value={text}
          className="min-w-0 flex-1 cursor-text border-none bg-transparent pr-1.5 font-[inherit] text-[11px] text-surface outline-none"
          onFocus={() => {
            focused.current = true
            previous.current = displayValue
            if (store) {
              store.state.numberFieldFocused = true
              store.notify()
            }
          }}
          onBlur={() => {
            focused.current = false
            setRevealInput(false)
            if (store) {
              store.state.numberFieldFocused = false
              store.notify()
            }
            commit()
          }}
          onChange={(event) => {
            const next = event.target.value
            if (next !== text && !requestMutation()) return
            setText(next)
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            event.currentTarget.blur()
          }}
        />
      )}
      {suffix && !showBound ? <span className="shrink-0 pr-1.5 text-muted">{suffix}</span> : null}
      {trailing}
    </div>
  )
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return '0'
  return String(Math.round(value * 100) / 100)
}
