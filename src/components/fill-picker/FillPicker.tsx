import { twMerge } from 'tailwind-merge'

import { applySolidFillColor, FillPickerRoot, useI18n } from '@open-pencil/react'

import IconSquare from '~icons/lucide/square'
import IconBlend from '~icons/lucide/blend'
import IconImage from '~icons/lucide/image'

import { GradientEditor } from './GradientEditor'
import { ColorPickerPanel } from '@/components/color-picker-panel/ColorPickerPanel'
import { ImageFillPicker } from './ImageFillPicker'
import { Tip } from '@/components/ui/Tip'
import { usePopoverUI } from '@/components/ui/popover'

import type { Fill } from '@open-pencil/scene-graph'
import type { OkHCLControls } from '@open-pencil/react'

const TAB_BASE =
  'flex size-6 cursor-pointer items-center justify-center rounded border-none p-0 transition-colors'

function tabClass(active: boolean) {
  return twMerge(
    TAB_BASE,
    active ? 'bg-hover text-surface' : 'text-muted hover:bg-hover hover:text-surface'
  )
}

interface FillPickerProps {
  fill: Fill
  okhcl?: OkHCLControls | null
  swatchBackground?: string
  onUpdate?: (fill: Fill) => void
}

export function FillPicker({ fill, okhcl = null, swatchBackground, onUpdate }: FillPickerProps) {
  const cls = usePopoverUI({ content: 'w-60 p-2' })
  const { panels } = useI18n()

  return (
    <FillPickerRoot
      fill={fill}
      ui={{
        content: cls.content,
        swatch: 'size-5 shrink-0 cursor-pointer rounded border border-border p-0'
      }}
      onUpdate={onUpdate}
      trigger={({ style }) => (
        <button
          data-test-id="fill-picker-swatch"
          className="size-5 shrink-0 cursor-pointer rounded border border-border p-0"
          style={{ ...style, background: swatchBackground ?? style.background }}
        />
      )}
    >
      {({ fill: currentFill, category, toSolid, toGradient, toImage }) => (
        <>
          <div className="mb-2 flex items-center gap-0.5">
            <Tip label={panels.solid}>
              <button
                className={tabClass(category === 'SOLID')}
                data-test-id="fill-picker-tab-solid"
                onClick={toSolid}
              >
                <IconSquare className="size-3.5" />
              </button>
            </Tip>
            <Tip label={panels.linearGradient}>
              <button
                className={tabClass(category === 'GRADIENT')}
                data-test-id="fill-picker-tab-gradient"
                onClick={toGradient}
              >
                <IconBlend className="size-3.5" />
              </button>
            </Tip>
            <Tip label={panels.image}>
              <button
                className={tabClass(category === 'IMAGE')}
                data-test-id="fill-picker-tab-image"
                onClick={toImage}
              >
                <IconImage className="size-3.5" />
              </button>
            </Tip>
          </div>

          {category === 'SOLID' && currentFill.type === 'SOLID' && (
            <ColorPickerPanel
              color={currentFill.color}
              okhcl={okhcl}
              onUpdate={(color) => onUpdate?.(applySolidFillColor(currentFill, color))}
            />
          )}

          {category === 'GRADIENT' && (
            <GradientEditor fill={currentFill} onUpdate={onUpdate} />
          )}

          {category === 'IMAGE' && (
            <ImageFillPicker fill={currentFill} onUpdate={onUpdate} />
          )}
        </>
      )}
    </FillPickerRoot>
  )
}
