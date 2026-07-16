import { ScrubInputDisplay, ScrubInputField, ScrubInputRoot } from '@open-pencil/react'

import type { ReactNode } from 'react'

export function ScrubInput({
  value,
  min,
  max,
  step,
  icon,
  label,
  suffix,
  sensitivity,
  placeholder,
  className,
  onValueChange,
  onCommit,
  iconSlot,
  'data-test-id': dataTestId = 'scrub-input'
}: {
  value: number | symbol
  min?: number
  max?: number
  step?: number
  icon?: string
  label?: string
  suffix?: string
  sensitivity?: number
  placeholder?: string
  className?: string
  onValueChange?: (value: number) => void
  onCommit?: (value: number, previous: number) => void
  iconSlot?: ReactNode
  'data-test-id'?: string
}) {
  return (
    <ScrubInputRoot
      value={value}
      min={min}
      max={max}
      step={step}
      sensitivity={sensitivity}
      placeholder={placeholder}
      onValueChange={onValueChange}
      onCommit={onCommit}
    >
      {({ editing, startScrub, placeholder: ph }) => (
        <div
          data-test-id={dataTestId}
          className={`flex h-[26px] min-w-0 flex-1 items-center rounded border border-border bg-input focus-within:border-accent ${className ?? ''}`}
          style={{ cursor: editing ? 'auto' : 'ew-resize' }}
          onPointerDown={(e) => {
            if (!editing) startScrub(e.nativeEvent)
          }}
        >
          <span className="flex shrink-0 items-center justify-center self-stretch px-[5px] text-muted select-none [&>*]:pointer-events-none">
            {iconSlot ?? (icon ? <span className="text-[11px] leading-none">{icon}</span> : null)}
            {label ? <span className="text-[11px] leading-none">{label}</span> : null}
          </span>
          <ScrubInputField
            data-test-id="scrub-input-field"
            className="min-w-0 flex-1 cursor-text border-none bg-transparent pr-1.5 font-[inherit] text-xs text-surface outline-none"
            min={min === -Infinity ? undefined : min}
            max={max === Infinity ? undefined : max}
            step={step}
          />
          <ScrubInputDisplay className="flex flex-1 items-center truncate overflow-hidden pr-1.5 text-xs select-none">
            {({ value: display, isMixed: mixed }) =>
              mixed ? (
                <span className="flex-1 text-muted">{ph}</span>
              ) : (
                <>
                  <span className="flex-1 text-surface">{display}</span>
                  {suffix ? <span className="shrink-0 text-muted">{suffix}</span> : null}
                </>
              )
            }
          </ScrubInputDisplay>
        </div>
      )}
    </ScrubInputRoot>
  )
}
