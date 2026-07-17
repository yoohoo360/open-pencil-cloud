import { useMemo, type ReactNode } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { colorToCSS } from '@open-pencil/core/color'

import type { Color } from '@open-pencil/scene-graph/primitives'

export interface ColorPickerUI {
  content?: string
  swatch?: string
}

interface ColorPickerRootProps {
  color: Color
  ui?: ColorPickerUI
  onUpdate?: (color: Color) => void
  children?: ReactNode | ((props: { color: Color }) => ReactNode)
  trigger?: ReactNode | ((props: { style: { background: string } }) => ReactNode)
}

export function ColorPickerRoot({ color, ui, onUpdate: _onUpdate, children, trigger }: ColorPickerRootProps) {
  const swatchBg = useMemo(() => colorToCSS(color), [color])

  const triggerContent =
    typeof trigger === 'function'
      ? trigger({ style: { background: swatchBg } })
      : (trigger ?? (
          <button
            data-test-id="color-picker-swatch"
            className={ui?.swatch}
            style={{ background: swatchBg }}
          />
        ))

  const pickerContent = typeof children === 'function' ? children({ color }) : children

  return (
    <Popover.Root>
      <Popover.Trigger asChild>{triggerContent}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          data-test-id="color-picker-popover"
          className={ui?.content}
          sideOffset={4}
          side="left"
        >
          {pickerContent}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
