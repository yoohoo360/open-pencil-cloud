import { useMemo, type ReactNode } from 'react'
import { colorToHexRaw, parseColor } from '@open-pencil/core/color'

import type { Color } from '@open-pencil/scene-graph/primitives'
import type { OkHCLControls } from '#react/primitives/ColorPicker/types'

interface ColorInputRootSlotProps {
  color: Color
  editable: boolean
  hex: string
  okhcl: OkHCLControls | null
  actions: {
    updateFromHex: (value: string) => void
    updateColor: (color: Color) => void
  }
}

interface ColorInputRootProps {
  color: Color
  editable?: boolean
  okhcl?: OkHCLControls | null
  onUpdate?: (color: Color) => void
  children?: ReactNode | ((props: ColorInputRootSlotProps) => ReactNode)
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
    onUpdate?.({ ...parsed, a: color.a })
  }

  const actions = {
    updateFromHex,
    updateColor: (nextColor: Color) => onUpdate?.(nextColor)
  }

  const slotProps: ColorInputRootSlotProps = { color, editable, hex, actions, okhcl: okhcl ?? null }
  return typeof children === 'function' ? <>{children(slotProps)}</> : <>{children}</>
}
