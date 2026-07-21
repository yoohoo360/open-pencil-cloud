import * as Popover from '@radix-ui/react-popover'
import IconLucideBlend from '~icons/lucide/blend'
import IconLucideImage from '~icons/lucide/image'
import IconLucideSquare from '~icons/lucide/square'
import { applySolidFillColor, FillRoot, useI18n } from '@open-pencil/react'
import { memo, useMemo } from 'react'
import { tv } from 'tailwind-variants'

import ColorPickerPanel from '@/components/color-picker-panel/ColorPickerPanel'
import GradientEditor from '@/components/fill-picker/GradientEditor'
import ImageFillPicker from '@/components/fill-picker/ImageFillPicker'
import FillSwatch from '@/components/ui/FillSwatch'
import Tip from '@/components/ui/Tip'
import { usePopoverUI } from '@/components/ui/popover'
import fillPickerTheme from '@/theme/fill-picker'

import type { Fill } from '@open-pencil/scene-graph'
import type { OkHCLControls } from '@open-pencil/react'

export type FillPickerProps = {
  fill: Fill
  okhcl?: OkHCLControls | null
  swatchBackground?: string
  onUpdate?: (fill: Fill) => void
  onOpenChange?: (open: boolean) => void
  onCancel?: () => void
}

export const FillPicker = memo(function FillPicker({
  fill,
  okhcl = null,
  swatchBackground,
  onUpdate,
  onOpenChange,
  onCancel
}: FillPickerProps) {
  const cls = usePopoverUI({ content: 'w-60 p-2' })
  const { panels } = useI18n()
  const fillPicker = useMemo(() => tv(fillPickerTheme), [])

  const tabClass = (active: boolean) => fillPicker({ active }).tab()

  const cancelFromEscape = (event: KeyboardEvent) => {
    event.stopPropagation()
    onCancel?.()
  }

  return (
    <FillRoot fill={fill} onUpdate={onUpdate}>
      {(root) => (
        <Popover.Root onOpenChange={onOpenChange}>
          <Popover.Trigger asChild>
            <button
              type="button"
              aria-label={panels.fill}
              data-test-id="fill-picker-swatch"
              className="size-5 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
            >
              <FillSwatch fill={fill} className="size-full">
                {(swatch) => (
                  <span
                    className="pointer-events-none absolute inset-0"
                    style={{ background: swatchBackground ?? swatch.background }}
                  />
                )}
              </FillSwatch>
            </button>
          </Popover.Trigger>

          <Popover.Portal>
            <Popover.Content
              className={cls.content}
              sideOffset={4}
              side="left"
              data-picker-content=""
              onEscapeKeyDown={cancelFromEscape}
            >
              <div className="mb-2 flex items-center gap-0.5">
                <Tip label={panels.solid}>
                  <button
                    type="button"
                    data-active={root.category === 'SOLID' ? '' : undefined}
                    className={tabClass(root.category === 'SOLID')}
                    data-test-id="fill-picker-tab-solid"
                    onClick={root.actions.toSolid}
                  >
                    <IconLucideSquare className="size-3.5" />
                  </button>
                </Tip>
                <Tip label={panels.linearGradient}>
                  <button
                    type="button"
                    data-active={root.category === 'GRADIENT' ? '' : undefined}
                    className={tabClass(root.category === 'GRADIENT')}
                    data-test-id="fill-picker-tab-gradient"
                    onClick={root.actions.toGradient}
                  >
                    <IconLucideBlend className="size-3.5" />
                  </button>
                </Tip>
                <Tip label={panels.image}>
                  <button
                    type="button"
                    data-active={root.category === 'IMAGE' ? '' : undefined}
                    className={tabClass(root.category === 'IMAGE')}
                    data-test-id="fill-picker-tab-image"
                    onClick={root.actions.toImage}
                  >
                    <IconLucideImage className="size-3.5" />
                  </button>
                </Tip>
              </div>

              {root.category === 'SOLID' ? (
                <ColorPickerPanel
                  color={root.fill.color}
                  okhcl={okhcl}
                  onUpdate={(color) => onUpdate?.(applySolidFillColor(root.fill, color))}
                />
              ) : null}

              {root.category === 'GRADIENT' ? (
                <GradientEditor fill={root.fill} onUpdate={onUpdate} />
              ) : null}

              {root.category === 'IMAGE' ? (
                <ImageFillPicker fill={root.fill} onUpdate={onUpdate} />
              ) : null}
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      )}
    </FillRoot>
  )
})

FillPicker.displayName = 'FillPicker'
export default FillPicker
