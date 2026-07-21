import { memo, useMemo, type InputHTMLAttributes, type KeyboardEvent, type FocusEvent } from 'react'
import { tv } from 'tailwind-variants'

import theme from '@/theme/input'

export type AppInputProps = {
  value: string | number
  onValueChange: (value: string) => void
  type?: 'text' | 'password' | 'number' | 'search'
  placeholder?: string
  readOnly?: boolean
  disabled?: boolean
  autoFocus?: boolean
  min?: number
  max?: number
  step?: number
  tone?: 'default' | 'panel'
  size?: 'sm' | 'md'
  state?: 'idle' | 'mixed' | 'bound' | 'invalid'
  className?: string
  onChangeCommit?: () => void
  onEnter?: (event: KeyboardEvent<HTMLInputElement>) => void
  onFocus?: (event: FocusEvent<HTMLInputElement>) => void
} & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'size' | 'value' | 'onChange' | 'onFocus' | 'type'
>

export const AppInput = memo(function AppInput({
  value,
  onValueChange,
  type = 'text',
  placeholder,
  readOnly,
  disabled,
  autoFocus,
  min,
  max,
  step,
  tone = 'default',
  size = 'md',
  state = 'idle',
  className,
  onChangeCommit,
  onEnter,
  onFocus,
  ...rest
}: AppInputProps) {
  const inputClass = useMemo(
    () => tv(theme)({ tone, size, state, class: className }),
    [className, size, state, tone]
  )

  return (
    <input
      {...rest}
      value={value}
      type={type}
      placeholder={placeholder}
      readOnly={readOnly}
      disabled={disabled}
      autoFocus={autoFocus}
      min={min}
      max={max}
      step={step}
      className={inputClass}
      onChange={(event) => onValueChange(event.target.value)}
      onChangeCapture={() => onChangeCommit?.()}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onEnter?.(event)
      }}
      onFocus={onFocus}
    />
  )
})

AppInput.displayName = 'AppInput'
export default AppInput
