import { useNumberField } from '#react/primitives/NumberField/context'

interface NumberFieldInputProps {
  className?: string
  [key: string]: unknown
}

export function NumberFieldInput({ ...attrs }: NumberFieldInputProps) {
  const ctx = useNumberField()
  if (!ctx.editing) return null

  const ariaAttrs = {
    role: 'spinbutton' as const,
    'aria-valuenow': ctx.isMixed ? undefined : ctx.numericValue,
    'aria-valuemin': Number.isFinite(ctx.min) ? ctx.min : undefined,
    'aria-valuemax': Number.isFinite(ctx.max) ? ctx.max : undefined,
    'aria-disabled': ctx.disabled ? ('true' as const) : undefined,
    'aria-label': ctx.ariaLabel
  }

  return (
    <input
      {...attrs}
      {...ctx.stateAttrs}
      {...ariaAttrs}
      ref={ctx.inputRef}
      data-slot="input"
      type="text"
      inputMode="decimal"
      autoComplete="off"
      spellCheck={false}
      disabled={ctx.disabled}
      value={ctx.draftValue}
      onChange={() => {/* controlled via onInput */}}
      onBlur={() => ctx.actions.commitEdit()}
      onKeyDown={(e) => ctx.actions.keydown(e.nativeEvent)}
      onInput={(e) => ctx.actions.input(e.nativeEvent)}
    />
  )
}
