import { ColorPickerPanel } from '@/react_app/pickers/ColorPickerPanel'
import { usePopoverUI } from '@/react_app/ui/popover'
import { ColorPickerRoot, type OkHCLControls } from '@open-pencil/react'

import type { Color } from '@open-pencil/core'

export function ColorPicker({
  color,
  okhcl = null,
  onUpdate
}: {
  color: Color
  okhcl?: OkHCLControls | null
  onUpdate: (color: Color) => void
}) {
  const cls = usePopoverUI({ content: 'w-56 p-2' })

  return (
    <ColorPickerRoot
      color={color}
      contentClassName={cls.content}
      swatchClassName="size-5 shrink-0 cursor-pointer rounded border border-border p-0"
      onUpdate={onUpdate}
    >
      {({ color: currentColor, update }) => (
        <ColorPickerPanel color={currentColor} okhcl={okhcl} onUpdate={update} />
      )}
    </ColorPickerRoot>
  )
}
