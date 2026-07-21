import * as Popover from '@radix-ui/react-popover'
import { memo, useMemo, type CSSProperties, type ReactNode } from 'react'

import { colorToCSS } from '@open-pencil/core/color'
import type { Color } from '@open-pencil/scene-graph/primitives'

export interface ColorPickerUI {
  content?: string
  swatch?: string
}

export type ColorPickerRootProps = {
  color: Color
  label?: string
  ui?: ColorPickerUI
  children?: ReactNode | ((props: { color: Color }) => ReactNode)
  trigger?: ReactNode | ((props: { style: CSSProperties }) => ReactNode)
  onUpdate?: (color: Color) => void
  onOpenChange?: (open: boolean) => void
  onCancel?: () => void
}

export const ColorPickerRoot = memo(function ColorPickerRoot({
  color,
  label = 'Edit color',
  ui,
  children,
  trigger,
  onOpenChange,
  onCancel
}: ColorPickerRootProps) {
  const style = useMemo(() => ({ background: colorToCSS(color) }), [color])

  return (
    <Popover.Root onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>
        {trigger ? (
          typeof trigger === 'function' ? (
            trigger({ style })
          ) : (
            trigger
          )
        ) : (
          <button aria-label={label} className={ui?.swatch} style={style} type="button" />
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className={ui?.content}
          data-picker-content=""
          onEscapeKeyDown={(event) => {
            event.stopPropagation()
            onCancel?.()
          }}
          side="left"
          sideOffset={4}
        >
          {typeof children === 'function' ? children({ color }) : children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
})

ColorPickerRoot.displayName = 'ColorPickerRoot'
