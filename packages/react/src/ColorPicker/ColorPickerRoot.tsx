import { useState, type CSSProperties, type ReactNode } from 'react'

import { colorToCSS } from '@open-pencil/core'

import { testIdProps } from '../testing/test-id'

import type { Color } from '@open-pencil/core'

export interface ColorPickerRootSlotProps {
  color: Color
  update: (nextColor: Color) => void
  open: boolean
  setOpen: (open: boolean) => void
}

export interface ColorPickerRootProps {
  color: Color
  contentClassName?: string
  swatchClassName?: string
  onUpdate?: (color: Color) => void
  trigger?: ReactNode | ((state: { style: CSSProperties }) => ReactNode)
  children?: ReactNode | ((state: ColorPickerRootSlotProps) => ReactNode)
}

/**
 * Headless color picker popover shell (native structure, no Reka UI).
 */
export function ColorPickerRoot({
  color,
  contentClassName,
  swatchClassName,
  onUpdate,
  trigger,
  children
}: ColorPickerRootProps) {
  const [open, setOpen] = useState(false)
  const swatchBg = colorToCSS(color)
  const triggerStyle: CSSProperties = { background: swatchBg }

  const triggerNode =
    typeof trigger === 'function'
      ? trigger({ style: triggerStyle })
      : (trigger ?? <button type="button" className={swatchClassName} style={triggerStyle} />)

  const slot: ColorPickerRootSlotProps = {
    color,
    update: (nextColor) => onUpdate?.(nextColor),
    open,
    setOpen
  }

  return (
    <div data-color-picker="" style={{ position: 'relative', display: 'inline-block' }}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setOpen((v) => !v)
          }
        }}
      >
        {triggerNode}
      </div>
      {open ? (
        <div {...testIdProps('color-picker-popover')} className={contentClassName} role="dialog">
          {typeof children === 'function' ? children(slot) : children}
        </div>
      ) : null}
    </div>
  )
}
