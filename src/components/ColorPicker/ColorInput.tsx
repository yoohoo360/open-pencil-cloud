import { ColorInputRoot, inputValue } from '@open-pencil/react'
import { memo, type HTMLAttributes } from 'react'

import ColorPicker from '@/components/ColorPicker/ColorPicker'

import type { Color } from '@open-pencil/scene-graph/primitives'
import type { OkHCLControls } from '@open-pencil/react'

export type ColorInputProps = {
  color: Color
  editable?: boolean
  okhcl?: OkHCLControls | null
  onUpdate?: (color: Color) => void
} & Omit<HTMLAttributes<HTMLDivElement>, 'children'>

export const ColorInput = memo(function ColorInput({
  color,
  editable = false,
  okhcl = null,
  onUpdate,
  ...rest
}: ColorInputProps) {
  return (
    <ColorInputRoot color={color} editable={editable} okhcl={okhcl} onUpdate={onUpdate}>
      {(slot) => (
        <div {...rest} className={['flex items-center gap-1.5', rest.className].filter(Boolean).join(' ')}>
          <ColorPicker
            color={color}
            okhcl={slot.okhcl}
            onUpdate={slot.actions.updateColor}
          />
          {slot.editable ? (
            <input
              data-test-id="color-hex-input"
              className="min-w-0 flex-1 border-none bg-transparent font-mono text-xs text-surface outline-none"
              value={slot.hex}
              maxLength={6}
              onChange={(event) => slot.actions.updateFromHex(inputValue(event.nativeEvent))}
            />
          ) : (
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted">{slot.hex}</span>
          )}
        </div>
      )}
    </ColorInputRoot>
  )
})

ColorInput.displayName = 'ColorInput'
export default ColorInput
