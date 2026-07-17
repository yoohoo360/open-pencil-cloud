import { type ComponentPropsWithoutRef } from 'react'

import { useScrubInput } from './context'

export type ScrubInputFieldProps = Omit<
  ComponentPropsWithoutRef<'input'>,
  'type' | 'value' | 'ref' | 'onBlur' | 'onKeyDown'
>

export function ScrubInputField(props: ScrubInputFieldProps) {
  const ctx = useScrubInput()

  if (!ctx.editing) return null

  return (
    <input
      {...props}
      ref={ctx.inputRef}
      type="number"
      defaultValue={ctx.isMixed ? '' : ctx.displayValue}
      onBlur={ctx.commitEdit}
      onKeyDown={ctx.onKeydown}
    />
  )
}

export default ScrubInputField
