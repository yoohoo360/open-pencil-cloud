import type { ReactNode } from 'react'
import { tv, type VariantProps } from 'tailwind-variants'

import type { ComponentUI } from '#react/components/ui/types'
import theme from '#react/theme/input-group'

const inputGroup = tv(theme)
type InputGroupVariants = VariantProps<typeof inputGroup>
type InputGroupUI = ComponentUI<typeof theme>

export function InputGroup({
  size = 'sm',
  disabled = false,
  ui,
  children,
  attachment,
  leading,
  model,
  actions
}: {
  size?: NonNullable<InputGroupVariants['size']>
  disabled?: boolean
  ui?: InputGroupUI
  children?: ReactNode
  attachment?: ReactNode
  leading?: ReactNode
  model?: ReactNode
  actions?: ReactNode
}) {
  const cls = inputGroup({ size, disabled })
  return (
    <div
      data-slot="input-group"
      data-size={size}
      data-disabled={disabled || undefined}
      className={cls.root({ class: ui?.root })}
    >
      {attachment ? (
        <div data-slot="input-group-attachment" className={ui?.attachment}>
          {attachment}
        </div>
      ) : null}
      <div data-slot="input-group-control" className={cls.control({ class: ui?.control })}>
        {children}
      </div>
      <div data-slot="input-group-toolbar" className={cls.toolbar({ class: ui?.toolbar })}>
        {leading}
        <div data-slot="input-group-model" className={cls.model({ class: ui?.model })}>
          {model}
        </div>
        <div data-slot="input-group-actions" className={cls.actions({ class: ui?.actions })}>
          {actions}
        </div>
      </div>
    </div>
  )
}
