import IconLucideMinus from '~icons/lucide/minus'
import IconLucidePlus from '~icons/lucide/plus'
import { colorToCSS } from '@open-pencil/core/color'
import {
  GradientEditorBar,
  GradientEditorRoot,
  GradientEditorStop,
  inputValue,
  useI18n,
  type GradientEditorStopSlotProps
} from '@open-pencil/react'
import { memo, useMemo, type ReactNode } from 'react'
import { tv } from 'tailwind-variants'

import AppSelect from '@/components/ui/AppSelect'
import Tip from '@/components/ui/Tip'
import ColorPickerPanel from '@/components/color-picker-panel/ColorPickerPanel'
import NumberField from '@/components/inputs/NumberField'
import fillPickerTheme from '@/theme/fill-picker'

import type { Fill } from '@open-pencil/scene-graph'

export type GradientEditorProps = {
  fill: Fill
  onUpdate?: (fill: Fill) => void
}

function renderListStop(
  root: {
    stops: Fill['gradientStops']
  },
  slot: GradientEditorStopSlotProps
): ReactNode {
  return (
    <>
      <NumberField
        className="w-11"
        suffix="%"
        value={slot.positionPercent}
        min={0}
        max={100}
        onValueChange={(value) => slot.actions.updatePosition(Number(value))}
        onClick={(event) => event.stopPropagation()}
      />
      <button
        type="button"
        className="size-4 shrink-0 cursor-pointer rounded border border-border p-0"
        style={{ background: slot.css }}
        onClick={(event) => {
          event.stopPropagation()
          slot.actions.select()
        }}
      />
      <input
        className="min-w-0 flex-1 rounded border border-border bg-input px-1 py-0.5 font-mono text-[11px] text-surface"
        value={slot.hex}
        maxLength={6}
        onChange={(event) => slot.actions.updateColor(inputValue(event.nativeEvent))}
        onClick={(event) => event.stopPropagation()}
      />
      <NumberField
        className="w-9"
        suffix="%"
        value={slot.opacityPercent}
        min={0}
        max={100}
        onValueChange={(value) => slot.actions.updateOpacity(Number(value))}
        onClick={(event) => event.stopPropagation()}
      />
      {(root.stops?.length ?? 0) > 2 ? (
        <button
          type="button"
          className="flex size-4 cursor-pointer items-center justify-center rounded border-none bg-transparent p-0 text-muted hover:text-surface"
          aria-label="Remove gradient stop"
          onClick={(event) => {
            event.stopPropagation()
            slot.actions.remove()
          }}
        >
          <IconLucideMinus className="size-3" />
        </button>
      ) : null}
    </>
  )
}

export const GradientEditor = memo(function GradientEditor({ fill, onUpdate }: GradientEditorProps) {
  const { panels } = useI18n()
  const fillPicker = useMemo(() => tv(fillPickerTheme), [])

  const barStopClass = (active: boolean, dragging: boolean) =>
    fillPicker({ active, dragging }).barStop()

  const listStopClass = (active: boolean) => fillPicker({ active }).listStop()

  return (
    <GradientEditorRoot fill={fill} onUpdate={onUpdate}>
      {(root) => (
        <div>
          <div className="mb-2 w-28">
            <AppSelect
              value={root.subtype}
              options={root.subtypes}
              onValueChange={(value) => root.setSubtype(String(value) as typeof root.subtype)}
            />
          </div>

          <GradientEditorBar
            stops={root.stops}
            activeStopIndex={root.activeStopIndex}
            barBackground={root.barBackground}
            ui={{ bar: 'relative mb-2 h-6 rounded' }}
            data-test-id="fill-picker-gradient-bar"
            onSelectStop={root.selectStop}
            onDragStop={root.dragStop}
          >
            {(bar) =>
              bar.stops.map((stop, idx) => (
                <GradientEditorStop
                  key={idx}
                  stop={stop}
                  index={idx}
                  active={idx === bar.activeStopIndex}
                  dragging={idx === bar.draggingIndex}
                  removable={bar.stops.length > 2}
                  className={barStopClass(idx === bar.activeStopIndex, idx === bar.draggingIndex)}
                  style={{
                    left: `${stop.position * 100}%`,
                    background: colorToCSS(stop.color)
                  }}
                  onUpdatePosition={root.updateStopPosition}
                  onRemove={root.removeStop}
                  onPointerDown={(event) => {
                    event.stopPropagation()
                    bar.actions.stopPointerDown(idx, event)
                  }}
                />
              ))
            }
          </GradientEditorBar>

          <div className="mb-2">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[11px] text-muted">{panels.stops}</span>
              <Tip label={panels.addStop}>
                <button
                  type="button"
                  className="flex size-4 cursor-pointer items-center justify-center rounded border-none bg-transparent p-0 text-muted hover:text-surface"
                  data-test-id="fill-picker-add-stop"
                  onClick={root.addStop}
                >
                  <IconLucidePlus className="size-3" />
                </button>
              </Tip>
            </div>
            {root.stops.map((stop, idx) => (
              <GradientEditorStop
                key={idx}
                stop={stop}
                index={idx}
                active={idx === root.activeStopIndex}
                removable={root.stops.length > 2}
                interactive={false}
                className={listStopClass(idx === root.activeStopIndex)}
                onUpdatePosition={root.updateStopPosition}
                onUpdateColor={root.updateStopColor}
                onUpdateOpacity={root.updateStopOpacity}
                onRemove={root.removeStop}
              >
                {((slot: GradientEditorStopSlotProps) => renderListStop(root, slot)) as never}
              </GradientEditorStop>
            ))}
          </div>

          <ColorPickerPanel color={root.activeColor} onUpdate={root.updateActiveColor} />
        </div>
      )}
    </GradientEditorRoot>
  )
})

GradientEditor.displayName = 'GradientEditor'
export default GradientEditor
