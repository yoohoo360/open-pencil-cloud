import { Blend, Image, Square } from 'lucide-react'
import { twMerge } from 'tailwind-merge'

import { ColorPickerPanel } from '@/react_app/pickers/ColorPickerPanel'
import { GradientEditor } from '@/react_app/pickers/GradientEditor'
import { ImageFillPicker } from '@/react_app/pickers/ImageFillPicker'
import { usePopoverUI } from '@/react_app/ui/popover'
import { Tip } from '@/react_app/ui/Tip'
import {
  applySolidFillColor,
  FillPickerRoot,
  useI18n,
  type OkHCLControls
} from '@open-pencil/react'

import type { Fill } from '@open-pencil/core'

const TAB_BASE =
  'flex size-6 cursor-pointer items-center justify-center rounded border-none p-0 transition-colors'

function tabClass(active: boolean) {
  return twMerge(
    TAB_BASE,
    active ? 'bg-hover text-surface' : 'text-muted hover:bg-hover hover:text-surface'
  )
}

export function FillPicker({
  fill,
  okhcl = null,
  onUpdate
}: {
  fill: Fill
  okhcl?: OkHCLControls | null
  onUpdate: (fill: Fill) => void
}) {
  const cls = usePopoverUI({ content: 'w-60 p-2' })
  const { panels } = useI18n()

  return (
    <FillPickerRoot
      fill={fill}
      contentClassName={cls.content}
      swatchClassName="size-5 shrink-0 cursor-pointer rounded border border-border p-0"
      onUpdate={onUpdate}
      trigger={({ style }) => (
        <button
          type="button"
          data-test-id="fill-picker-swatch"
          className="size-5 shrink-0 cursor-pointer rounded border border-border p-0"
          style={style}
        />
      )}
    >
      {({ fill: currentFill, category, toSolid, toGradient, toImage, update }) => (
        <>
          <div className="mb-2 flex items-center gap-0.5">
            <Tip label={panels.solid}>
              <button
                type="button"
                className={tabClass(category === 'SOLID')}
                data-test-id="fill-picker-tab-solid"
                onClick={toSolid}
              >
                <Square className="size-3.5" />
              </button>
            </Tip>
            <Tip label={panels.linearGradient}>
              <button
                type="button"
                className={tabClass(category === 'GRADIENT')}
                data-test-id="fill-picker-tab-gradient"
                onClick={toGradient}
              >
                <Blend className="size-3.5" />
              </button>
            </Tip>
            <Tip label={panels.image}>
              <button
                type="button"
                className={tabClass(category === 'IMAGE')}
                data-test-id="fill-picker-tab-image"
                onClick={toImage}
              >
                <Image className="size-3.5" />
              </button>
            </Tip>
          </div>

          {category === 'SOLID' ? (
            <ColorPickerPanel
              color={currentFill.color}
              okhcl={okhcl}
              onUpdate={(c) => update(applySolidFillColor(currentFill, c))}
            />
          ) : null}

          {category === 'GRADIENT' ? <GradientEditor fill={currentFill} onUpdate={update} /> : null}

          {category === 'IMAGE' ? <ImageFillPicker fill={currentFill} onUpdate={update} /> : null}
        </>
      )}
    </FillPickerRoot>
  )
}
