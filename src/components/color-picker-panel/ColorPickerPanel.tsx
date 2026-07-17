import { ColorPickerPanelProvider, createColorPickerPanelContext } from '@/components/color-picker-panel/context'
import { ColorAreaControl } from '@/components/color-picker-panel/ColorAreaControl'
import { FormatControls } from '@/components/color-picker-panel/FormatControls'
import { HueAlphaSliders } from '@/components/color-picker-panel/HueAlphaSliders'

import type { Color } from '@open-pencil/scene-graph/primitives'
import type { OkHCLControls } from '@open-pencil/react'

interface ColorPickerPanelProps {
  color: Color
  okhcl?: OkHCLControls | null
  onUpdate?: (color: Color) => void
}

export function ColorPickerPanel({ color, okhcl = null, onUpdate }: ColorPickerPanelProps) {
  const ctx = createColorPickerPanelContext(color, okhcl, onUpdate ?? (() => undefined))

  return (
    <ColorPickerPanelProvider value={ctx}>
      <div className="flex flex-col gap-2">
        <ColorAreaControl />
        <HueAlphaSliders />
        <FormatControls />
      </div>
    </ColorPickerPanelProvider>
  )
}
