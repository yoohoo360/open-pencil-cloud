import type { OkHCLControls } from '#react/controls/color-model/types'
import { memo, useCallback, useMemo, type ReactNode } from 'react'

import { colorToHexRaw, parseColor } from '@open-pencil/core/color'
import type { Color } from '@open-pencil/scene-graph/primitives'

export type ColorInputRootSlotProps = {
  color: Color
  editable: boolean
  hex: string
  okhcl: OkHCLControls | null
  actions: {
    updateFromHex: (hex: string) => Color
    updateColor: (color: Color) => Color
  }
}

export type ColorInputRootProps = {
  color: Color
  editable?: boolean
  okhcl?: OkHCLControls | null
  children?: ReactNode | ((props: ColorInputRootSlotProps) => ReactNode)
  onUpdate?: (color: Color) => void
}

export const ColorInputRoot = memo(function ColorInputRoot({
  color,
  editable = false,
  okhcl = null,
  children,
  onUpdate
}: ColorInputRootProps) {
  const updateColor = useCallback(
    (nextColor: Color) => {
      onUpdate?.(nextColor)
      return nextColor
    },
    [onUpdate]
  )
  const updateFromHex = useCallback(
    (hex: string) =>
      updateColor({ ...parseColor(hex.startsWith('#') ? hex : `#${hex}`), a: color.a }),
    [color.a, updateColor]
  )
  const slotProps = useMemo<ColorInputRootSlotProps>(
    () => ({
      color,
      editable,
      hex: colorToHexRaw(color),
      okhcl,
      actions: { updateFromHex, updateColor }
    }),
    [color, editable, okhcl, updateColor, updateFromHex]
  )

  return <>{typeof children === 'function' ? children(slotProps) : children}</>
})

ColorInputRoot.displayName = 'ColorInputRoot'
