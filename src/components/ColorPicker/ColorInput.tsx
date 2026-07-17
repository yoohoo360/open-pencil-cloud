import type { HTMLAttributes } from 'react'

import { ColorInputRoot } from '@open-pencil/react'
import { ColorPicker } from '@/components/ColorPicker/ColorPicker'

import type { Color } from '@open-pencil/scene-graph/primitives'
import type { OkHCLControls } from '@open-pencil/react'

interface ColorInputProps extends HTMLAttributes<HTMLDivElement> {
  color: Color
  editable?: boolean
  okhcl?: OkHCLControls | null
  onUpdate?: (color: Color) => void
}

export function ColorInput({ color, editable = false, okhcl = null, onUpdate, className, ...attrs }: ColorInputProps) {
  return (
    <ColorInputRoot
      color={color}
      editable={editable}
      okhcl={okhcl}
      onUpdate={onUpdate}
    >
      {({ editable: isEditable, hex, actions, okhcl: okhclControls }) => (
        <div {...attrs} className={`flex items-center gap-1.5 ${className ?? ''}`}>
          <ColorPicker color={color} okhcl={okhclControls} onUpdate={actions.updateColor} />
          {isEditable ? (
            <input
              data-test-id="color-hex-input"
              className="min-w-0 flex-1 border-none bg-transparent font-mono text-xs text-surface outline-none"
              value={hex}
              maxLength={6}
              onChange={(e) => actions.updateFromHex(e.target.value)}
            />
          ) : (
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted">{hex}</span>
          )}
        </div>
      )}
    </ColorInputRoot>
  )
}
