import { useScrubInput } from './context'

import type { InputHTMLAttributes } from 'react'

export type ScrubInputFieldProps = InputHTMLAttributes<HTMLInputElement>

export function ScrubInputField(props: ScrubInputFieldProps) {
  const ctx = useScrubInput()

  function setRef(el: HTMLInputElement | null) {
    ;(ctx.inputRef as { current: HTMLInputElement | null }).current = el
  }

  if (!ctx.editing) return null

  return (
    <input
      ref={setRef}
      type="number"
      value={ctx.isMixed ? '' : ctx.displayValue}
      onBlur={ctx.commitEdit}
      onKeyDown={ctx.onKeydown}
      {...props}
    />
  )
}
