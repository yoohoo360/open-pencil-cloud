import { MoveHorizontal, MoveVertical, Plus, X } from 'lucide-react'
import type { GridTrackSizing } from '@open-pencil/scene-graph'

import { NumberField } from '#react/components/inputs/NumberField'
import { AppSelect } from '#react/components/ui/AppSelect'
import { IconButton } from '#react/components/ui/IconButton'
import { useLayoutControlsContext } from '#react/controls/layout/use'
import type { GridTrackProp } from '#react/controls/layout/helpers'
import { useI18n } from '#react/i18n'

const trackProps: GridTrackProp[] = ['gridTemplateColumns', 'gridTemplateRows']

function defaultTrackValue(sizing: GridTrackSizing): number {
  if (sizing === 'FR') return 1
  if (sizing === 'FIXED') return 100
  return 0
}

export function GridControls() {
  const ctx = useLayoutControlsContext()
  const { panels } = useI18n()
  const node = ctx.node
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
              <Plus className="size-3.5" />
            </IconButton>
          </div>
          <div className="flex flex-col gap-1">
            {node[trackProp].map((track, index) => (
              <div key={index} className="flex items-center gap-1">
                {track.sizing !== 'AUTO' ? (
                  <NumberField
                    icon={`${trackProp === 'gridTemplateColumns' ? 'C' : 'R'}${index + 1}`}
                    min={track.sizing === 'FR' ? 1 : 0}
                    suffix={track.sizing === 'FR' ? 'fr' : 'px'}
                    value={track.value}
                    onCommit={(value) => ctx.updateGridTrack(trackProp, index, { value })}
                  />
                ) : (
                  <span className="flex-1 px-1 text-xs text-muted">{ctx.trackLabel(track)}</span>
                )}
                <AppSelect
                  value={track.sizing}
                  options={ctx.trackSizingOptions}
                  onChange={(sizing) =>
                    ctx.updateGridTrack(trackProp, index, {
                      sizing,
                      value: defaultTrackValue(sizing)
                    })
                  }
                />
                {node[trackProp].length > 1 ? (
                  <IconButton onClick={() => ctx.removeTrack(trackProp, index)}>
                    <X className="size-3.5" />
                  </IconButton>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <NumberField
          min={0}
          value={Math.round(node.gridColumnGap)}
          icon={<MoveHorizontal className="size-3" />}
          onCommit={(value, previous) => ctx.commitProp('gridColumnGap', value, previous)}
        />
        <NumberField
          min={0}
          value={Math.round(node.gridRowGap)}
          icon={<MoveVertical className="size-3" />}
          onCommit={(value, previous) => ctx.commitProp('gridRowGap', value, previous)}
        />
      </div>
    </>
  )
}
