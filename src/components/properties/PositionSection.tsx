import IconLucideAlignCenterHorizontal from '~icons/lucide/align-center-horizontal'
import IconLucideAlignCenterVertical from '~icons/lucide/align-center-vertical'
import IconLucideAlignEndHorizontal from '~icons/lucide/align-end-horizontal'
import IconLucideAlignEndVertical from '~icons/lucide/align-end-vertical'
import IconLucideAlignStartHorizontal from '~icons/lucide/align-start-horizontal'
import IconLucideAlignStartVertical from '~icons/lucide/align-start-vertical'
import IconLucideFlipHorizontal2 from '~icons/lucide/flip-horizontal-2'
import IconLucideFlipVertical2 from '~icons/lucide/flip-vertical-2'
import IconLucideRotateCw from '~icons/lucide/rotate-cw'
import IconLucideRotateCwSquare from '~icons/lucide/rotate-cw-square'
import { memo, useCallback } from 'react'

import { PositionControlsRoot, useI18n } from '@open-pencil/react'
import { useEditorStore } from '@/app/editor/active-store'
import NumberField from '@/components/inputs/NumberField'
import IconButton from '@/components/ui/IconButton'
import PanelGrid from '@/components/ui/panel/PanelGrid'
import PanelSection from '@/components/ui/panel/PanelSection'
import Tip from '@/components/ui/Tip'

export const PositionSection = memo(function PositionSection() {
  const { panels } = useI18n()
  const store = useEditorStore()

  const handleAlign = useCallback(
    (
      nodeAlign: (axis: 'horizontal' | 'vertical', pos: 'min' | 'center' | 'max') => void,
      axis: 'horizontal' | 'vertical',
      pos: 'min' | 'center' | 'max'
    ) => {
      const editState = store.state.nodeEditState
      if (editState && editState.selectedVertexIndices.size >= 2) {
        store.nodeEditAlignVertices(axis, pos)
      } else {
        nodeAlign(axis, pos)
      }
    },
    [store]
  )

  return (
    <PositionControlsRoot>
      {({ active, isMulti, xValue, yValue, wValue, hValue, rotationValue, actions }) =>
        active ? (
          <PanelSection label={panels.position}>
            <div role="toolbar" aria-label={panels.position} className="mb-1.5 flex justify-between">
              <div className="flex gap-0.5">
                <IconButton
                  label={panels.alignLeft}
                  size="md"
                  onClick={() => handleAlign(actions.align, 'horizontal', 'min')}
                >
                  <IconLucideAlignStartVertical className="size-3.5" />
                </IconButton>
                <IconButton
                  label={panels.alignCenterHorizontally}
                  size="md"
                  onClick={() => handleAlign(actions.align, 'horizontal', 'center')}
                >
                  <IconLucideAlignCenterVertical className="size-3.5" />
                </IconButton>
                <IconButton
                  label={panels.alignRight}
                  size="md"
                  onClick={() => handleAlign(actions.align, 'horizontal', 'max')}
                >
                  <IconLucideAlignEndVertical className="size-3.5" />
                </IconButton>
              </div>
              <div className="flex gap-0.5">
                <IconButton
                  label={panels.alignTop}
                  size="md"
                  onClick={() => handleAlign(actions.align, 'vertical', 'min')}
                >
                  <IconLucideAlignStartHorizontal className="size-3.5" />
                </IconButton>
                <IconButton
                  label={panels.alignCenterVertically}
                  size="md"
                  onClick={() => handleAlign(actions.align, 'vertical', 'center')}
                >
                  <IconLucideAlignCenterHorizontal className="size-3.5" />
                </IconButton>
                <IconButton
                  label={panels.alignBottom}
                  size="md"
                  onClick={() => handleAlign(actions.align, 'vertical', 'max')}
                >
                  <IconLucideAlignEndHorizontal className="size-3.5" />
                </IconButton>
              </div>
            </div>

            <PanelGrid columns="two">
              <Tip label={panels.xAxis}>
                <NumberField
                  icon="X"
                  data-property="x"
                  aria-label={panels.xAxis}
                  value={xValue}
                  onValueChange={(value) => actions.updateProp('x', value)}
                  onCommit={(value, previous) => actions.commitProp('x', value, previous)}
                />
              </Tip>
              <Tip label={panels.yAxis}>
                <NumberField
                  icon="Y"
                  data-property="y"
                  aria-label={panels.yAxis}
                  value={yValue}
                  onValueChange={(value) => actions.updateProp('y', value)}
                  onCommit={(value, previous) => actions.commitProp('y', value, previous)}
                />
              </Tip>
            </PanelGrid>

            {isMulti ? (
              <PanelGrid columns="two" className="mt-1.5">
                <Tip label={panels.width}>
                  <NumberField
                    icon="W"
                    data-property="width"
                    aria-label={panels.width}
                    value={wValue}
                    min={1}
                    onValueChange={(value) => actions.updateProp('width', value)}
                    onCommit={(value, previous) => actions.commitProp('width', value, previous)}
                  />
                </Tip>
                <Tip label={panels.height}>
                  <NumberField
                    icon="H"
                    data-property="height"
                    aria-label={panels.height}
                    value={hValue}
                    min={1}
                    onValueChange={(value) => actions.updateProp('height', value)}
                    onCommit={(value, previous) => actions.commitProp('height', value, previous)}
                  />
                </Tip>
              </PanelGrid>
            ) : null}

            <div className="mt-1.5 grid grid-cols-[minmax(0,1fr)_repeat(3,24px)] gap-0.5">
              <Tip label={panels.rotation}>
                <NumberField
                  suffix="°"
                  data-property="rotation"
                  aria-label={panels.rotation}
                  value={rotationValue}
                  min={-360}
                  max={360}
                  onValueChange={(value) => actions.updateProp('rotation', value)}
                  onCommit={(value, previous) => actions.commitProp('rotation', value, previous)}
                  icon={<IconLucideRotateCw className="size-3" />}
                />
              </Tip>
              <IconButton label={panels.flipHorizontal} size="md" onClick={() => actions.flip('horizontal')}>
                <IconLucideFlipHorizontal2 className="size-3.5" />
              </IconButton>
              <IconButton label={panels.flipVertical} size="md" onClick={() => actions.flip('vertical')}>
                <IconLucideFlipVertical2 className="size-3.5" />
              </IconButton>
              <IconButton label={panels.rotate90} size="md" onClick={() => actions.rotate(90)}>
                <IconLucideRotateCwSquare className="size-3.5" />
              </IconButton>
            </div>
          </PanelSection>
        ) : null
      }
    </PositionControlsRoot>
  )
})

PositionSection.displayName = 'PositionSection'
export default PositionSection
