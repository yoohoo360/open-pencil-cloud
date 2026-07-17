import { forwardRef } from 'react'
import type {
  ChangeEventHandler,
  FocusEventHandler,
  InputHTMLAttributes,
  KeyboardEventHandler
} from 'react'
import { tv } from 'tailwind-variants'

import theme from '@/theme/input'

export interface AppInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'size' | 'value' | 'onChange' | 'onFocus' | 'type'
> {
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
  'data-story-control'?: string
  'data-state'?: string
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
    onFocus,
    onKeyDown,
    ...rest
  },
  ref
) {
  const inputClass = tv(theme)({ tone, size, state, class: className })

  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = (e) => {
    onKeyDown?.(e)
    if (e.key === 'Enter') onEnter?.(e)
  }

  return (
    <input
      {...rest}
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
