import { colorToCSS } from '@open-pencil/core/color'
import { GradientEditorRoot, GradientEditorBar, GradientEditorStop, useI18n } from '@open-pencil/react'

import { AppSelect } from '@/components/ui/AppSelect'
import { Tip } from '@/components/ui/Tip'
import { ColorPickerPanel } from '@/components/color-picker-panel/ColorPickerPanel'
import { NumberField } from '@/components/inputs/NumberField'

import IconPlus from '~icons/lucide/plus'

import type { Fill } from '@open-pencil/scene-graph'

interface GradientEditorProps {
  fill: Fill
  onUpdate?: (fill: Fill) => void
}

export function GradientEditor({ fill, onUpdate }: GradientEditorProps) {
  const { panels } = useI18n()

  return (
    <GradientEditorRoot fill={fill} onUpdate={onUpdate}>
      {(root) => (
        <div>
          <div className="mb-2 w-28">
            <AppSelect
              value={root.subtype}
              options={root.subtypes}
              onChange={(v) => root.actions.setSubtype(v as typeof root.subtype)}
            />
          </div>

          <GradientEditorBar
            stops={root.stops}
            activeStopIndex={root.activeStopIndex}
            barBackground={root.barBackground}
            ui={{ bar: 'relative mb-2 h-6 rounded' }}
            data-test-id="fill-picker-gradient-bar"
            onSelectStop={root.actions.selectStop}
            onDragStop={root.actions.dragStop}
          >
            {(bar) =>
              bar.stops.map((stop, idx) => (
                <div
                  key={idx}
                  className={`absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-sm border-2 shadow-sm ${
                    idx === bar.activeStopIndex ? 'border-white' : 'border-white/60'
                  }`}
                  style={{ left: `${stop.position * 100}%`, background: colorToCSS(stop.color) }}
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    bar.actions.stopPointerDown(idx, e.nativeEvent)
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
                  className="flex size-4 cursor-pointer items-center justify-center rounded border-none bg-transparent p-0 text-muted hover:text-surface"
                  data-test-id="fill-picker-add-stop"
                  onClick={root.actions.addStop}
                >
                  <IconPlus className="size-3" />
                </button>
              </Tip>
            </div>
            {root.stops.map((stop, idx) => (
              <GradientEditorStop
                key={idx}
                stop={stop}
                index={idx}
                active={idx === root.activeStopIndex}
                onSelect={root.actions.selectStop}
                onUpdatePosition={root.actions.updateStopPosition}
                onUpdateColor={root.actions.updateStopColor}
                onUpdateOpacity={root.actions.updateStopOpacity}
                onRemove={root.actions.removeStop}
              >
                {(s) => (
                  <div
                    className={`flex items-center gap-1 py-0.5 ${s.active ? 'rounded bg-hover/50' : ''}`}
                    onClick={s.actions.select}
                  >
                    <NumberField
                      className="w-11"
                      suffix="%"
                      value={s.positionPercent}
                      min={0}
                      max={100}
                      onChange={(v) => s.actions.updatePosition(v)}
                    />
                    <button
                      className="size-4 shrink-0 cursor-pointer rounded border border-border p-0"
                      style={{ background: s.css }}
                      onClick={(e) => { e.stopPropagation(); s.actions.select() }}
                    />
                    <input
                      className="min-w-0 flex-1 rounded border border-border bg-input px-1 py-0.5 font-mono text-[11px] text-surface"
                      value={s.hex}
                      maxLength={6}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => s.actions.updateColor(e.target.value)}
                    />
                    <NumberField
                      className="w-9"
                      suffix="%"
                      value={s.opacityPercent}
                      min={0}
                      max={100}
                      onChange={(v) => s.actions.updateOpacity(v)}
                    />
                    {root.stops.length > 2 && (
                      <button
                        className="flex size-4 cursor-pointer items-center justify-center rounded border-none bg-transparent p-0 text-muted hover:text-surface"
                        onClick={(e) => { e.stopPropagation(); s.actions.remove() }}
                      >
                        −
                      </button>
                    )}
                  </div>
                )}
              </GradientEditorStop>
            ))}
          </div>

          {root.activeColor && (
            <ColorPickerPanel
              color={root.activeColor}
              onUpdate={root.actions.updateActiveColor}
            />
          )}
        </div>
      )}
    </GradientEditorRoot>
  )
}
