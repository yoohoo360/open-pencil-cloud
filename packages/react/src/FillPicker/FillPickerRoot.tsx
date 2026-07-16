import { useState, type CSSProperties, type ReactNode } from 'react'

import { useFillPicker } from './useFillPicker'

import type { Fill } from '@open-pencil/core'

export interface FillPickerRootSlotProps {
  fill: Fill
  category: 'SOLID' | 'GRADIENT' | 'IMAGE'
  toSolid: () => void
  toGradient: () => void
  toImage: () => void
  update: (nextFill: Fill) => void
  open: boolean
  setOpen: (open: boolean) => void
}

export interface FillPickerRootProps {
  fill: Fill
  contentClassName?: string
  swatchClassName?: string
  onUpdate?: (fill: Fill) => void
  trigger?: ReactNode | ((state: { style: CSSProperties }) => ReactNode)
  children?: ReactNode | ((state: FillPickerRootSlotProps) => ReactNode)
}

/**
 * Headless fill picker. Uses a native details/popover-like structure instead of Reka UI.
 */
export function FillPickerRoot({
  fill,
  contentClassName,
  swatchClassName,
  onUpdate,
  trigger,
  children
}: FillPickerRootProps) {
  const [open, setOpen] = useState(false)
  const { category, swatchBg, toSolid, toGradient, toImage } = useFillPicker(fill, (updated) =>
    onUpdate?.(updated)
  )

  const triggerStyle: CSSProperties = { background: swatchBg }
  const triggerNode =
    typeof trigger === 'function'
      ? trigger({ style: triggerStyle })
      : (trigger ?? <button type="button" className={swatchClassName} style={triggerStyle} />)

  const slot: FillPickerRootSlotProps = {
    fill,
    category,
    toSolid,
    toGradient,
    toImage,
    update: (nextFill) => onUpdate?.(nextFill),
    open,
    setOpen
  }

  return (
    <div data-fill-picker="" style={{ position: 'relative', display: 'inline-block' }}>
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
        <div className={contentClassName} role="dialog">
          {typeof children === 'function' ? children(slot) : children}
        </div>
      ) : null}
    </div>
  )
}
