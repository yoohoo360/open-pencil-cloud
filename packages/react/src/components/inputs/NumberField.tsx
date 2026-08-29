import { useEffect, useRef, useState } from 'react'

import { panelFieldBase } from '#react/theme/panel/field'

export function NumberField({
  value,
  min,
  max,
  icon,
  suffix,
  disabled,
  'aria-label': ariaLabel,
  'data-property': dataProperty,
  onCommit
}: {
  value: number
  min?: number
  max?: number
  icon?: string
  suffix?: string
  disabled?: boolean
  'aria-label'?: string
  'data-property'?: string
  onCommit: (value: number, previous: number) => void
}) {
  const [text, setText] = useState(formatNumber(value))
  const focused = useRef(false)
  const previous = useRef(value)

  useEffect(() => {
    if (!focused.current) setText(formatNumber(value))
  }, [value])

  function commit() {
    let next = Number.parseFloat(text)
    if (!Number.isFinite(next)) {
      setText(formatNumber(value))
      return
    }
    if (min != null) next = Math.max(min, next)
    if (max != null) next = Math.min(max, next)
    setText(formatNumber(next))
    if (next === previous.current) return
    onCommit(next, previous.current)
  }

  return (
    <label
      data-slot="number-field"
      data-property={dataProperty}
      data-disabled={disabled ? '' : undefined}
      className={`group flex min-h-6 flex-1 cursor-text items-center text-[11px] tabular-nums ${panelFieldBase}`}
    >
      {icon ? (
        <span className="flex shrink-0 items-center justify-center self-stretch px-[5px] text-muted select-none">
          {icon}
        </span>
      ) : null}
      <input
        type="text"
        inputMode="decimal"
        aria-label={ariaLabel}
        disabled={disabled}
        value={text}
        className="min-w-0 flex-1 cursor-text border-none bg-transparent pr-1.5 font-[inherit] text-[11px] text-surface outline-none"
        onFocus={() => {
          focused.current = true
          previous.current = value
        }}
        onBlur={() => {
          focused.current = false
          commit()
        }}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return
          event.currentTarget.blur()
        }}
      />
      {suffix ? <span className="shrink-0 pr-1.5 text-muted">{suffix}</span> : null}
    </label>
  )
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return '0'
  return String(Math.round(value * 100) / 100)
}
