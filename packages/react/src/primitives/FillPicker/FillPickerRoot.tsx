import { useMemo, type ReactNode } from 'react'
import * as Popover from '@radix-ui/react-popover'

import { useFillPicker } from '#react/primitives/FillPicker/useFillPicker'

import type { Fill } from '@open-pencil/scene-graph'

export interface FillPickerUI {
  content?: string
  swatch?: string
}

interface FillPickerRootSlotProps {
  fill: Fill
  category: string
  toSolid: () => void
  toGradient: () => void
  toImage: () => void
}

interface FillPickerRootProps {
  fill: Fill
  ui?: FillPickerUI
  onUpdate?: (fill: Fill) => void
  children?: ReactNode | ((props: FillPickerRootSlotProps) => ReactNode)
  trigger?: ReactNode | ((props: { style: { background: string } }) => ReactNode)
}

export function FillPickerRoot({ fill, ui, onUpdate, children, trigger }: FillPickerRootProps) {
  const fillRef = useMemo(() => ({ value: fill }), [fill])
  const { category, swatchBg, toSolid, toGradient, toImage } = useFillPicker(
    fillRef,
    (updated) => onUpdate?.(updated)
  )

  const triggerContent =
    typeof trigger === 'function'
      ? trigger({ style: { background: swatchBg.value } })
      : (trigger ?? (
          <button className={ui?.swatch} style={{ background: swatchBg.value }} />
        ))

  const slotProps: FillPickerRootSlotProps = {
    fill,
    category: category.value,
    toSolid,
    toGradient,
    toImage
  }

  const content = typeof children === 'function' ? children(slotProps) : children

  return (
    <Popover.Root>
      <Popover.Trigger asChild>{triggerContent}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className={ui?.content} sideOffset={4} side="left">
          {content}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
