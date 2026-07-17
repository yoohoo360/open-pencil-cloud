import { useMemo, type ReactNode } from 'react'

import { colorToCSS } from '@open-pencil/core'

import type { Color } from '@open-pencil/core'

export interface ColorPickerTriggerProps {
  style: { background: string }
  swatchClass?: string
}

export interface ColorPickerRootProps {
  color: Color
  contentClass?: string
  swatchClass?: string
  onUpdate: (color: Color) => void
  trigger?: (props: ColorPickerTriggerProps) => ReactNode
  children: (ctx: { color: Color; update: (color: Color) => void; swatchBg: string }) => ReactNode
}

export function ColorPickerRoot({
  color,
  swatchClass,
  onUpdate,
  trigger,
  children
}: ColorPickerRootProps) {
  const swatchBg = useMemo(() => colorToCSS(color), [color])

  const triggerStyle = { background: swatchBg }

  return (
    <>
      {trigger ? (
        trigger({ style: triggerStyle, swatchClass })
      ) : (
        <button className={swatchClass} style={triggerStyle} />
      )}
      {children({ color, update: onUpdate, swatchBg })}
    </>
  )
}

export default ColorPickerRoot
