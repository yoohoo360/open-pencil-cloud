import { memo, useCallback, useMemo } from 'react'
import { tv } from 'tailwind-variants'

import { ColorPickerRoot, inputValue, useColorModel, useI18n, useSceneComputed } from '@open-pencil/react'
import type { Color, Fill } from '@open-pencil/scene-graph'
import { useEditorStore } from '@/app/editor/active-store'
import ColorPickerPanel from '@/components/color-picker-panel/ColorPickerPanel'
import NumberField from '@/components/inputs/NumberField'
import FillSwatch from '@/components/ui/FillSwatch'
import { usePopoverUI } from '@/components/ui/popover'
import PanelSection from '@/components/ui/panel/PanelSection'
import paintFieldTheme from '@/theme/paint-field'

const PagePaintValue = memo(function PagePaintValue({
  color,
  label,
  onUpdate
}: {
  color: Color
  label: string
  onUpdate: (color: Color) => void
}) {
  const model = useColorModel({ color, onUpdate })

  return (
    <input
      aria-label={label}
      data-property="color-hex"
      className="min-w-0 flex-1 border-none bg-transparent font-mono text-xs text-surface outline-none"
      value={model.hex}
      maxLength={6}
      onChange={(event) => model.updateHex(inputValue(event.nativeEvent))}
    />
  )
})

PagePaintValue.displayName = 'PagePaintValue'

export const PageSection = memo(function PageSection() {
  const editor = useEditorStore()
  const pageColor = useSceneComputed(() => {
    void editor.state.renderVersion
    return editor.state.pageColor
  })
  const pageFill = useMemo<Fill>(
    () => ({
      type: 'SOLID',
      color: pageColor,
      opacity: 1,
      visible: true
    }),
    [pageColor]
  )
  const { panels } = useI18n()
  const paintFieldStyles = useMemo(() => tv(paintFieldTheme)(), [])
  const popoverCls = usePopoverUI({ content: 'w-56 p-2' })

  const updatePageAlpha = useCallback(
    (alpha: number) => {
      editor.setPageColor({ ...pageColor, a: alpha })
    },
    [editor, pageColor]
  )

  const updatePageColor = useCallback(
    (color: Color) => {
      editor.setPageColor(color)
    },
    [editor]
  )

  return (
    <PanelSection label={panels.page}>
      <div className={paintFieldStyles.root()} data-slot="paint-field" data-property="paint">
        <div className={paintFieldStyles.preview()} data-slot="preview">
          <ColorPickerRoot
            color={pageColor}
            onUpdate={updatePageColor}
            ui={{ content: popoverCls.content }}
            trigger={() => (
              <button
                type="button"
                aria-label={panels.pageBackground}
                className="size-5 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
              >
                <FillSwatch fill={pageFill} className="size-full" />
              </button>
            )}
          >
            {({ color }) => <ColorPickerPanel color={color} onUpdate={updatePageColor} />}
          </ColorPickerRoot>
        </div>
        <div className={paintFieldStyles.value()} data-slot="value">
          <PagePaintValue color={pageColor} label={panels.pageBackground} onUpdate={updatePageColor} />
        </div>
        <div className={paintFieldStyles.divider()} data-slot="divider" />
        <NumberField
          className={paintFieldStyles.opacity()}
          aria-label={panels.opacity}
          suffix="%"
          value={Math.round(pageColor.a * 100)}
          min={0}
          max={100}
          ui={{
            root: 'h-full rounded-none border-0 bg-transparent shadow-none',
            leading: 'hidden'
          }}
          data-property="opacity"
          onValueChange={(opacity) =>
            updatePageAlpha(Math.max(0, Math.min(1, opacity / 100)))
          }
        />
      </div>
    </PanelSection>
  )
})

PageSection.displayName = 'PageSection'
export default PageSection
