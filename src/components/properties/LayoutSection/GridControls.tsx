import IconMoveHorizontal from '~icons/lucide/move-horizontal'
import IconMoveVertical from '~icons/lucide/move-vertical'
import IconPlus from '~icons/lucide/plus'
import IconX from '~icons/lucide/x'

import { useI18n, useLayoutControlsContext } from '@open-pencil/react'
import type { GridTrackSizing } from '@open-pencil/scene-graph'
import { AppSelect } from '@/components/ui/AppSelect'
import { IconButton } from '@/components/ui/IconButton'
import { NumberField } from '@/components/inputs/NumberField'
import type { GridTrackProp } from '@/components/properties/LayoutSection/types'

const trackProps: GridTrackProp[] = ['gridTemplateColumns', 'gridTemplateRows']

function defaultTrackValue(sizing: GridTrackSizing): number {
  if (sizing === 'FR') return 1
  if (sizing === 'FIXED') return 100
  return 0
}

export function GridControls() {
  const ctx = useLayoutControlsContext()
  const { panels } = useI18n()
  const node = ctx.node.value
  if (!node) return null

  return (
    <>
      {trackProps.map((trackProp) => (
        <div key={trackProp} className="mt-2">
          <div className="mb-1 flex items-center justify-between">
            <label className="text-[11px] text-muted">
              {trackProp === 'gridTemplateColumns' ? panels.columns : panels.rows}
            </label>
            <IconButton onClick={() => ctx.addTrack(trackProp)}>
              <IconPlus className="size-3.5" />
            </IconButton>
          </div>
          <div className="flex flex-col gap-1">
            {node[trackProp].map((track, i) => (
              <div key={i} className="flex items-center gap-1">
                {track.sizing !== 'AUTO' ? (
                  <NumberField
                    className="flex-1"
                    icon={`${trackProp === 'gridTemplateColumns' ? 'C' : 'R'}${i + 1}`}
                    value={track.value}
                    min={track.sizing === 'FR' ? 1 : 0}
                    suffix={track.sizing === 'FR' ? 'fr' : 'px'}
                    onChange={(v) => ctx.updateGridTrack(trackProp, i, { value: v })}
                  />
                ) : (
                  <span className="flex-1 px-1 text-xs text-muted">{ctx.trackLabel(track)}</span>
                )}
                <AppSelect
                  value={track.sizing}
                  options={ctx.trackSizingOptions}
                  onChange={(v) =>
                    ctx.updateGridTrack(trackProp, i, {
                      sizing: v as GridTrackSizing,
                      value: defaultTrackValue(v as GridTrackSizing)
                    })
                  }
                />
                {node[trackProp].length > 1 && (
                  <IconButton onClick={() => ctx.removeTrack(trackProp, i)}>
                    <IconX className="size-3.5" />
                  </IconButton>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <NumberField
          value={Math.round(node.gridColumnGap)}
          min={0}
          iconSlot={<IconMoveHorizontal className="size-3" />}
          onChange={(v) => ctx.updateProp('gridColumnGap', v)}
          onCommit={(v, p) => ctx.commitProp('gridColumnGap', v, p)}
        />
        <NumberField
          value={Math.round(node.gridRowGap)}
          min={0}
          iconSlot={<IconMoveVertical className="size-3" />}
          onChange={(v) => ctx.updateProp('gridRowGap', v)}
          onCommit={(v, p) => ctx.commitProp('gridRowGap', v, p)}
        />
      </div>
    </>
  )
}
