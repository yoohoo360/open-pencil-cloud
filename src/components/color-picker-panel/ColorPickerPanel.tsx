import { memo } from 'react'

import type { Color } from '@open-pencil/scene-graph/primitives'
import type { OkHCLControls } from '@open-pencil/react'

import ColorAreaControl from '@/components/color-picker-panel/ColorAreaControl'
import FormatControls from '@/components/color-picker-panel/FormatControls'
import HueAlphaSliders from '@/components/color-picker-panel/HueAlphaSliders'
import { ColorPickerPanelProvider } from '@/components/color-picker-panel/context'

export type ColorPickerPanelProps = {
  color: Color
  okhcl?: OkHCLControls | null
  onUpdate: (color: Color) => void
}

export const ColorPickerPanel = memo(function ColorPickerPanel({
  color,
  okhcl = null,
  onUpdate
}: ColorPickerPanelProps) {
  return (
    <ColorPickerPanelProvider color={color} okhcl={okhcl} onUpdate={onUpdate}>
      <div className="flex flex-col gap-2">
        <ColorAreaControl />
        <HueAlphaSliders />
        <FormatControls />
      </div>
    </ColorPickerPanelProvider>
  )
})

ColorPickerPanel.displayName = 'ColorPickerPanel'
export default ColorPickerPanel
