import { tv } from 'tailwind-variants'
import type { ReactNode } from 'react'

import { NumberFieldRoot, NumberFieldInput, NumberFieldValue, type NumberFieldEditPolicy, type NumberFieldSlotProps, type NumberExpressionError } from '@open-pencil/react'
import { useEditorStore } from '@/app/editor/active-store'
import theme from '@/theme/number-field'
import type { NumberFieldTheme } from '@/theme/number-field'
import type { ComponentUI } from '@/components/ui/types'

export type NumberFieldUI = ComponentUI<NumberFieldTheme>

export interface NumberFieldProps {
  value: number | symbol
  min?: number
  max?: number
  step?: number
  icon?: string | ReactNode
  label?: string
  suffix?: string
  sensitivity?: number
  placeholder?: string
  disabled?: boolean
  bound?: boolean
  editPolicy?: NumberFieldEditPolicy
  ui?: NumberFieldUI
  className?: string
  onChange?: (value: number) => void
  onEditingChange?: (editing: boolean) => void
  onCommit?: (value: number, previous: number) => void
  onInvalid?: (expression: string, reason: NumberExpressionError) => void
  onDetachRequest?: (source: 'edit' | 'scrub' | 'step') => void
  iconSlot?: ReactNode
  suffixSlot?: ReactNode
  boundSlot?: ReactNode
  displaySlot?: ((props: NumberFieldSlotProps & { value: string }) => ReactNode) | null
  [key: string]: unknown
}

export function NumberField({
  value,
  min,
  max,
  step,
  icon,
  label,
  suffix,
  sensitivity,
  placeholder,
  disabled,
  bound,
  editPolicy,
  ui,
  className,
  onChange,
  onEditingChange,
  onCommit,
  onInvalid,
  onDetachRequest,
  iconSlot,
  suffixSlot,
  boundSlot,
  displaySlot,
  ...dataAttrs
}: NumberFieldProps) {
  const store = useEditorStore()

  const hasSuffix = Boolean(suffixSlot || suffix)
  const styles = tv(theme)({ suffix: hasSuffix })

  const accessibleLabel = label ?? icon

  // Filter out data-* and aria-* attributes to pass to the root div
  const htmlAttrs = Object.fromEntries(
    Object.entries(dataAttrs).filter(([k]) => k.startsWith('data-') || k.startsWith('aria-'))
  )

  return (
    <NumberFieldRoot
      modelValue={value}
      min={min}
      max={max}
      step={step}
      sensitivity={sensitivity}
      placeholder={placeholder}
      aria-label={accessibleLabel}
      disabled={disabled}
      bound={bound}
      editPolicy={editPolicy}
      onUpdate:modelValue={onChange}
      onCommit={onCommit}
      onInvalid={onInvalid}
      onDetachRequest={onDetachRequest}
      onEditingChange={(editing: boolean) => {
        store.state.numberFieldFocused = editing
        onEditingChange?.(editing)
      }}
    >
      {({ editing, actions, attrs: rootAttrs, placeholder: ph }: NumberFieldSlotProps & { placeholder: string }) => (
        <div
          {...rootAttrs}
          {...htmlAttrs}
          data-slot="root"
          className={styles.root({ class: [ui?.root, className] })}
          onPointerDown={(e) => {
            if (!editing && !(e.target as HTMLElement).closest?.('button')) {
              actions.startScrub(e)
            }
          }}
        >
          <span className={styles.leading({ class: ui?.leading })}>
            {iconSlot ?? (icon ? (
              typeof icon === 'string'
                ? <span className="text-[11px] leading-none">{icon}</span>
                : icon
            ) : null)}
            {label && <span className="text-[11px] leading-none">{label}</span>}
          </span>
          <NumberFieldInput className={styles.field({ class: ui?.field })} />
          {editing && suffixSlot}
          <NumberFieldValue className={styles.display({ class: ui?.display })}>
            {(display: NumberFieldSlotProps & { value: string; bound: boolean; isMixed: boolean }) =>
              displaySlot ? displaySlot(display) : (
                <>
                  {(() => {
                    if (display.bound && boundSlot) return boundSlot
                    if (display.bound) return (
                      <>
                        <span className={styles.value({ class: ui?.value })}>{display.value}</span>
                        {suffix && <span className={styles.suffix({ class: ui?.suffix })}>{suffix}</span>}
                      </>
                    )
                    if (display.isMixed) return <span className={styles.mixed({ class: ui?.mixed })}>{ph}</span>
                    return (
                      <>
                        <span className={styles.value({ class: ui?.value })}>{display.value}</span>
                        {suffix && <span className={styles.suffix({ class: ui?.suffix })}>{suffix}</span>}
                      </>
                    )
                  })()}
                  {!editing && suffixSlot}
                </>
              )
            }
          </NumberFieldValue>
        </div>
      )}
    </NumberFieldRoot>
  )
}
