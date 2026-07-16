import { useCallback, type InputHTMLAttributes } from 'react'

import { useScrubInput } from './context'

export type ScrubInputFieldProps = InputHTMLAttributes<HTMLInputElement>

export function ScrubInputField(props: ScrubInputFieldProps) {
  const ctx = useScrubInput()
  if (!ctx.editing) return null

  const setRef = useCallback(
    (el: HTMLInputElement | null) => {
      ;(ctx.inputRef as { current: HTMLInputElement | null }).current = el
    },
    [ctx.inputRef]
  )

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
