import { ColorPickerRoot } from '@open-pencil/react'
import { memo, type CSSProperties, type ReactNode } from 'react'

import ColorPickerPanel from '@/components/color-picker-panel/ColorPickerPanel'
import { usePopoverUI } from '@/components/ui/popover'

import type { Color } from '@open-pencil/scene-graph/primitives'
import type { OkHCLControls } from '@open-pencil/react'

export type ColorPickerProps = {
  color: Color
  okhcl?: OkHCLControls | null
  trigger?: ReactNode | ((props: { style: CSSProperties }) => ReactNode)
  onUpdate?: (color: Color) => void
  onOpenChange?: (open: boolean) => void
  onCancel?: () => void
}

export const ColorPicker = memo(function ColorPicker({
  color,
  okhcl = null,
  trigger,
  onUpdate,
  onOpenChange,
  onCancel
}: ColorPickerProps) {
  const cls = usePopoverUI({ content: 'w-56 p-2' })

  return (
    <ColorPickerRoot
      color={color}
      ui={{
        content: cls.content,
        swatch: 'size-5 shrink-0 cursor-pointer rounded border border-border p-0'
      }}
      trigger={trigger}
      onOpenChange={onOpenChange}
      onCancel={onCancel}
    >
      {(slot) => (
        <ColorPickerPanel color={slot.color} okhcl={okhcl} onUpdate={(next) => onUpdate?.(next)} />
      )}
    </ColorPickerRoot>
  )
})

ColorPicker.displayName = 'ColorPicker'
export default ColorPicker
