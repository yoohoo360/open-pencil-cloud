import { useNumberField } from '#react/primitives/NumberField/context'
import { memo, useEffect, useMemo, type InputHTMLAttributes } from 'react'

export const NumberFieldInput = memo(function NumberFieldInput(
  props: InputHTMLAttributes<HTMLInputElement>
) {
  const context = useNumberField()
  useEffect(() => {
    return () => {
      context.inputRef.current = null
    }
  }, [context.inputRef])
  const stateAttrs = useMemo(() => context.stateAttrs, [context.stateAttrs])
  if (!context.editing) return null
  return (
    <input
      {...props}
      {...stateAttrs}
      ref={context.inputRef}
      data-slot="input"
      type="text"
      inputMode="decimal"
      autoComplete="off"
      spellCheck={false}
      disabled={context.disabled}
      value={context.draftValue}
      role="spinbutton"
      aria-valuenow={context.isMixed ? undefined : context.numericValue}
      aria-valuemin={Number.isFinite(context.min) ? context.min : undefined}
      aria-valuemax={Number.isFinite(context.max) ? context.max : undefined}
      aria-disabled={context.disabled || undefined}
      aria-label={context.ariaLabel}
      onBlur={(event) => {
        props.onBlur?.(event)
        context.actions.commitEdit()
      }}
      onKeyDown={(event) => {
        props.onKeyDown?.(event)
        event.stopPropagation()
        context.actions.keydown(event.nativeEvent)
      }}
      onChange={(event) => {
        props.onChange?.(event)
        context.actions.setDraft(event.currentTarget.value)
      }}
    />
  )
})

NumberFieldInput.displayName = 'NumberFieldInput'
