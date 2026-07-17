import { ColorPickerRoot } from '@open-pencil/react'
import { ColorPickerPanel } from '@/components/color-picker-panel/ColorPickerPanel'
import { usePopoverUI } from '@/components/ui/popover'

import type { Color } from '@open-pencil/scene-graph/primitives'
import type { OkHCLControls } from '@open-pencil/react'

interface ColorPickerProps {
  color: Color
  okhcl?: OkHCLControls | null
  onUpdate?: (color: Color) => void
}

export function ColorPicker({ color, okhcl = null, onUpdate }: ColorPickerProps) {
  const cls = usePopoverUI({ content: 'w-56 p-2' })

  return (
    <ColorPickerRoot
      color={color}
      ui={{
        content: cls.content,
        swatch: 'size-5 shrink-0 cursor-pointer rounded border border-border p-0'
      }}
      onUpdate={onUpdate}
    >
      {({ color: currentColor }) => (
        <ColorPickerPanel color={currentColor} okhcl={okhcl} onUpdate={onUpdate} />
      )}
    </ColorPickerRoot>
  )
}
