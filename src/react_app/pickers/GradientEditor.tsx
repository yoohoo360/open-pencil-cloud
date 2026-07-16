import { Plus } from 'lucide-react'

import { ColorPickerPanel } from '@/react_app/pickers/ColorPickerPanel'
import { ScrubInput } from '@/react_app/pickers/ScrubInput'
import { AppSelect } from '@/react_app/ui/AppSelect'
import { Tip } from '@/react_app/ui/Tip'
import { colorToCSS } from '@open-pencil/core'
import {
  GradientEditorBar,
  GradientEditorRoot,
  GradientEditorStop,
  useI18n
} from '@open-pencil/react'

import type { Fill } from '@open-pencil/core'
import type { Ref } from 'react'

export function GradientEditor({ fill, onUpdate }: { fill: Fill; onUpdate: (fill: Fill) => void }) {
  const { panels } = useI18n()

  return (
    <GradientEditorRoot fill={fill} onUpdate={onUpdate}>
      {(root) => (
        <div>
          <div className="mb-2 w-28">
            <AppSelect
              value={root.subtype}
              options={root.subtypes}
              onValueChange={root.setSubtype}
            />
          </div>

          <GradientEditorBar
            stops={root.stops}
            activeStopIndex={root.activeStopIndex}
            barBackground={root.barBackground}
            onSelectStop={root.selectStop}
            onDragStop={root.dragStop}
          >
            {(bar) => (
              <div
                ref={bar.barRef as Ref<HTMLDivElement>}
                data-test-id="fill-picker-gradient-bar"
                className="relative mb-2 h-6 rounded"
                style={{ background: bar.barBackground }}
                onPointerMove={(e) => bar.onPointerMove(e.nativeEvent)}
                onPointerUp={() => bar.onPointerUp()}
              >
                {bar.stops.map((stop, idx) => (
                  <div
                    key={idx}
                    className={`absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-sm border-2 shadow-sm ${
                      idx === bar.activeStopIndex ? 'border-white' : 'border-white/60'
                    }`}
                    style={{ left: `${stop.position * 100}%`, background: colorToCSS(stop.color) }}
                    onPointerDown={(e) => {
                      e.stopPropagation()
                      bar.onStopPointerDown(idx, e.nativeEvent)
                    }}
                  />
                ))}
              </div>
            )}
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
                  <Plus className="size-3" />
                </button>
              </Tip>
            </div>
            {root.stops.map((stop, idx) => (
              <GradientEditorStop
                key={idx}
                stop={stop}
                index={idx}
                active={idx === root.activeStopIndex}
                onSelect={root.selectStop}
                onUpdatePosition={root.updateStopPosition}
                onUpdateColor={root.updateStopColor}
                onUpdateOpacity={root.updateStopOpacity}
                onRemove={root.removeStop}
              >
                {(s) => (
                  <div
                    className={`flex items-center gap-1 py-0.5 ${s.active ? 'rounded bg-hover/50' : ''}`}
                    onClick={s.select}
                  >
                    <ScrubInput
                      className="w-11"
                      suffix="%"
                      value={s.positionPercent}
                      min={0}
                      max={100}
                      onValueChange={(v) => s.updatePosition(Number(v))}
                    />
                    <button
                      type="button"
                      className="size-4 shrink-0 cursor-pointer rounded border border-border p-0"
                      style={{ background: s.css }}
                      onClick={(e) => {
                        e.stopPropagation()
                        s.select()
                      }}
                    />
                    <input
                      className="min-w-0 flex-1 rounded border border-border bg-input px-1 py-0.5 font-mono text-[11px] text-surface"
                      defaultValue={s.hex}
                      key={s.hex}
                      maxLength={6}
                      onChange={(e) => s.updateColor(e.currentTarget.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <ScrubInput
                      className="w-9"
                      suffix="%"
                      value={s.opacityPercent}
                      min={0}
                      max={100}
                      onValueChange={(v) => s.updateOpacity(Number(v))}
                    />
                    {root.stops.length > 2 ? (
                      <button
                        type="button"
                        className="flex size-4 cursor-pointer items-center justify-center rounded border-none bg-transparent p-0 text-muted hover:text-surface"
                        onClick={(e) => {
                          e.stopPropagation()
                          s.remove()
                        }}
                      >
                        −
                      </button>
                    ) : null}
                  </div>
                )}
              </GradientEditorStop>
            ))}
          </div>

          <ColorPickerPanel color={root.activeColor} onUpdate={root.updateActiveColor} />
        </div>
      )}
    </GradientEditorRoot>
  )
}
