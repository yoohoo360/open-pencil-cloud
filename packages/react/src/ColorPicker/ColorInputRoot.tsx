import { colorToHexRaw, parseColor } from '@open-pencil/core'

import type { OkHCLControls } from './types'
import type { Color } from '@open-pencil/core'
import type { ReactNode } from 'react'

export interface ColorInputRootSlotProps {
  color: Color
  editable: boolean
  hex: string
  updateFromHex: (value: string) => void
  updateColor: (nextColor: Color) => void
  okhcl: OkHCLControls | null
}

export interface ColorInputRootProps {
  color: Color
  editable?: boolean
  okhcl?: OkHCLControls | null
  onUpdate?: (color: Color) => void
  children?: ReactNode | ((state: ColorInputRootSlotProps) => ReactNode)
}

export function ColorInputRoot({
  color,
  editable = false,
  okhcl = null,
  onUpdate,
  children
}: ColorInputRootProps) {
  const hex = colorToHexRaw(color)

  function updateFromHex(value: string) {
    const parsed = parseColor(value.startsWith('#') ? value : `#${value}`)
    if (!parsed) return
    onUpdate?.({ ...parsed, a: color.a })
  }

  const slot: ColorInputRootSlotProps = {
    color,
    editable,
    hex,
    updateFromHex,
    updateColor: (nextColor) => onUpdate?.(nextColor),
    okhcl
  }

  return <>{typeof children === 'function' ? children(slot) : children}</>
}
