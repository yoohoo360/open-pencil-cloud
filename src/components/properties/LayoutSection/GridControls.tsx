import IconLucideMoveHorizontal from '~icons/lucide/move-horizontal'
import IconLucideMoveVertical from '~icons/lucide/move-vertical'
import IconLucidePlus from '~icons/lucide/plus'
import IconLucideX from '~icons/lucide/x'
import { memo, useCallback } from 'react'

import { useI18n } from '@open-pencil/react'
import type { GridTrackSizing } from '@open-pencil/scene-graph'

import type { GridTrackProp } from '@/components/properties/LayoutSection/types'
import { useLayoutContext } from '@/components/properties/LayoutSection/types'
import NumberField from '@/components/inputs/NumberField'
import AppSelect from '@/components/ui/AppSelect'
import IconButton from '@/components/ui/IconButton'

const trackProps: GridTrackProp[] = ['gridTemplateColumns', 'gridTemplateRows']

function defaultTrackValue(sizing: GridTrackSizing): number {
  if (sizing === 'FR') return 1
  if (sizing === 'FIXED') return 100
  return 0
}

export const GridControls = memo(function GridControls() {
  const ctx = useLayoutContext()
  const { panels } = useI18n()

  const trackLabel = useCallback(
    (trackProp: GridTrackProp) => (trackProp === 'gridTemplateColumns' ? panels.columns : panels.rows),
    [panels.columns, panels.rows]
  )

  return (
    <>
      {trackProps.map((trackProp) => (
        <div key={trackProp} className="mt-2">
          <div className="mb-1 flex items-center justify-between">
            <label className="text-[11px] text-muted">{trackLabel(trackProp)}</label>
            <IconButton onClick={() => ctx.addTrack(trackProp)}>
              <IconLucidePlus className="size-3.5" />
            </IconButton>
          </div>
          <div className="flex flex-col gap-1">
            {ctx.node[trackProp].map((track, index) => (
              <div key={index} className="flex items-center gap-1">
                {track.sizing !== 'AUTO' ? (
                  <NumberField
                    className="flex-1"
                    icon={`${trackProp === 'gridTemplateColumns' ? 'C' : 'R'}${index + 1}`}
                    value={track.value}
                    min={track.sizing === 'FR' ? 1 : 0}
                    suffix={track.sizing === 'FR' ? 'fr' : 'px'}
                    onValueChange={(value) => ctx.updateGridTrack(trackProp, index, { value })}
                  />
                ) : (
                  <span className="flex-1 px-1 text-xs text-muted">{ctx.trackLabel(track)}</span>
                )}
                <AppSelect
                  value={track.sizing}
                  options={ctx.trackSizingOptions}
                  onValueChange={(sizing) =>
                    ctx.updateGridTrack(trackProp, index, {
                      sizing: sizing as GridTrackSizing,
                      value: defaultTrackValue(sizing as GridTrackSizing)
                    })
                  }
                />
                {ctx.node[trackProp].length > 1 ? (
                  <IconButton onClick={() => ctx.removeTrack(trackProp, index)}>
                    <IconLucideX className="size-3.5" />
                  </IconButton>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <NumberField
          value={Math.round(ctx.node.gridColumnGap)}
          min={0}
          icon={<IconLucideMoveHorizontal className="size-3" />}
          onValueChange={(value) => ctx.updateProp('gridColumnGap', value)}
          onCommit={(value, previous) => ctx.commitProp('gridColumnGap', value, previous)}
        />
        <NumberField
          value={Math.round(ctx.node.gridRowGap)}
          min={0}
          icon={<IconLucideMoveVertical className="size-3" />}
          onValueChange={(value) => ctx.updateProp('gridRowGap', value)}
          onCommit={(value, previous) => ctx.commitProp('gridRowGap', value, previous)}
        />
      </div>
    </>
  )
})

GridControls.displayName = 'GridControls'
export default GridControls
