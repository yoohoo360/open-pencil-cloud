import {
  NumberFieldInput,
  NumberFieldRoot,
  NumberFieldValue,
  type NumberExpressionError,
  type NumberFieldEditPolicy,
  type NumberFieldMutationSource
} from '@open-pencil/react'
import { memo, useMemo, type HTMLAttributes, type ReactNode } from 'react'
import { tv, type ClassValue } from 'tailwind-variants'

import { useEditorStore } from '@/app/editor/active-store'
import type { ComponentUI } from '@/components/ui/types'
import type { NumberFieldTheme } from '@/theme/number-field'
import theme from '@/theme/number-field'

export type NumberFieldUI = ComponentUI<NumberFieldTheme>

export type NumberFieldProps = {
  value: number | symbol
  min?: number
  max?: number
  step?: number
  icon?: ReactNode
  label?: string
  suffix?: string
  sensitivity?: number
  placeholder?: string
  disabled?: boolean
  bound?: boolean
  boundContent?: ReactNode
  suffixContent?: ReactNode
  editPolicy?: NumberFieldEditPolicy
  ui?: NumberFieldUI
  className?: ClassValue
  'aria-label'?: string
  onValueChange?: (value: number) => void
  onCommit?: (value: number, previous: number) => void
  onEditingChange?: (editing: boolean) => void
  onInvalid?: (expression: string, reason: NumberExpressionError) => void
  onDetachRequest?: (source: NumberFieldMutationSource) => void
} & Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'className'>

export const NumberField = memo(function NumberField({
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
  boundContent,
  suffixContent,
  editPolicy,
  ui,
  className,
  'aria-label': ariaLabel,
  onValueChange,
  onCommit,
  onEditingChange,
  onInvalid,
  onDetachRequest,
  ...rest
}: NumberFieldProps) {
  const store = useEditorStore()
  const accessibleLabel = ariaLabel ?? label ?? (typeof icon === 'string' ? icon : undefined)
  const styles = useMemo(() => tv(theme)({ suffix: Boolean(suffix) }), [suffix])

  return (
    <NumberFieldRoot
      modelValue={value}
      min={min}
      max={max}
      step={step}
      sensitivity={sensitivity}
      placeholder={placeholder}
      ariaLabel={accessibleLabel}
      disabled={disabled}
      bound={bound}
      editPolicy={editPolicy}
      onValueChange={onValueChange}
      onCommit={onCommit}
      onInvalid={onInvalid}
      onDetachRequest={onDetachRequest}
      onEditingChange={(editing) => {
        store.state.numberFieldFocused = editing
        onEditingChange?.(editing)
      }}
    >
      {({ editing, actions, attrs: rootAttrs, placeholder: ph }) => (
        <div
          {...rest}
          {...rootAttrs}
          data-slot="root"
          className={styles.root({ class: [ui?.root, className] })}
          onPointerDown={(event) => {
            if (
              !editing &&
              !(event.target as HTMLElement | null)?.closest?.('button')
            ) {
              actions.startScrub(event.nativeEvent)
            }
          }}
        >
          <span className={styles.leading({ class: ui?.leading })}>
            {icon ?? null}
            {label ? <span className="text-[11px] leading-none">{label}</span> : null}
          </span>
          <NumberFieldInput className={styles.field({ class: ui?.field })} />
          <NumberFieldValue className={styles.display({ class: ui?.display })}>
            {(display) =>
              display.bound && boundContent ? (
                boundContent
              ) : display.bound ? (
                <>
                  <span className={styles.value({ class: ui?.value })}>{display.value}</span>
                  {suffix ? (
                    <span className={styles.suffix({ class: ui?.suffix })}>{suffix}</span>
                  ) : null}
                </>
              ) : display.isMixed ? (
                <span className={styles.mixed({ class: ui?.mixed })}>{ph}</span>
              ) : (
                <>
                  <span className={styles.value({ class: ui?.value })}>{display.value}</span>
                  {suffix ? (
                    <span className={styles.suffix({ class: ui?.suffix })}>{suffix}</span>
                  ) : null}
                </>
              )
            }
          </NumberFieldValue>
          {suffixContent}
        </div>
      )}
    </NumberFieldRoot>
  )
})

NumberField.displayName = 'NumberField'
export default NumberField
