import { forwardRef } from 'react'
import { tv } from 'tailwind-variants'
import type { ChangeEventHandler, FocusEventHandler, KeyboardEventHandler } from 'react'

import theme from '@/theme/input'

export interface AppInputProps {
  value: string | number
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
  onChange?: ChangeEventHandler<HTMLInputElement>
  onEnter?: KeyboardEventHandler<HTMLInputElement>
  onFocus?: FocusEventHandler<HTMLInputElement>
}

export const AppInput = forwardRef<HTMLInputElement, AppInputProps>(function AppInput(
  {
    value,
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
    onChange,
    onEnter,
    onFocus
  },
  ref
) {
  const inputClass = tv(theme)({ tone, size, state, class: className })

  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') onEnter?.(e)
  }

  return (
    <input
      ref={ref}
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
      onChange={onChange}
      onKeyDown={handleKeyDown}
      onFocus={onFocus}
    />
  )
})
