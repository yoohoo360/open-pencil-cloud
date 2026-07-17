import { useMemo, type ReactNode } from 'react'

import { colorToHexRaw, parseColor } from '@open-pencil/core'

import type { Color } from '@open-pencil/core'
import type { OkHCLControls } from './types'

export interface ColorInputRootProps {
  color: Color
  editable?: boolean
  okhcl?: OkHCLControls | null
  onUpdate: (color: Color) => void
  children: (ctx: {
    color: Color
    editable: boolean
    hex: string
    okhcl: OkHCLControls | null
    updateFromHex: (value: string) => void
    updateColor: (color: Color) => void
  }) => ReactNode
}

export function ColorInputRoot({
  color,
  editable = false,
  okhcl = null,
  onUpdate,
  children
}: ColorInputRootProps) {
  const hex = useMemo(() => colorToHexRaw(color), [color])

  function updateFromHex(value: string) {
    const parsed = parseColor(value.startsWith('#') ? value : `#${value}`)
    onUpdate({ ...parsed, a: color.a })
  }

  return (
    <>
      {children({
        color,
        editable,
        hex,
        okhcl: okhcl ?? null,
        updateFromHex,
        updateColor: onUpdate
      })}
    </>
  )
}

export default ColorInputRoot
