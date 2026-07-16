import { ColorPicker } from '@/react_app/pickers/ColorPicker'
import { ColorInputRoot, type OkHCLControls } from '@open-pencil/react'

import type { Color } from '@open-pencil/core'

export function ColorInput({
  color,
  editable = false,
  okhcl = null,
  className,
  onUpdate
}: {
  color: Color
  editable?: boolean
  okhcl?: OkHCLControls | null
  className?: string
  onUpdate: (color: Color) => void
}) {
  return (
    <ColorInputRoot color={color} editable={editable} okhcl={okhcl} onUpdate={onUpdate}>
      {({ editable: isEditable, hex, updateFromHex, updateColor, okhcl: okhclControls }) => (
        <div className={`flex items-center gap-1.5 ${className ?? ''}`}>
          <ColorPicker color={color} okhcl={okhclControls} onUpdate={updateColor} />
          {isEditable ? (
            <input
              data-test-id="color-hex-input"
              className="min-w-0 flex-1 border-none bg-transparent font-mono text-xs text-surface outline-none"
              defaultValue={hex}
              key={hex}
              maxLength={6}
              onChange={(e) => updateFromHex(e.currentTarget.value)}
            />
          ) : (
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted">{hex}</span>
          )}
        </div>
      )}
    </ColorInputRoot>
  )
}
