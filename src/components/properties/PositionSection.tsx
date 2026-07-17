import IconAlignStartVertical from '~icons/lucide/align-start-vertical'
import IconAlignCenterVertical from '~icons/lucide/align-center-vertical'
import IconAlignEndVertical from '~icons/lucide/align-end-vertical'
import IconAlignStartHorizontal from '~icons/lucide/align-start-horizontal'
import IconAlignCenterHorizontal from '~icons/lucide/align-center-horizontal'
import IconAlignEndHorizontal from '~icons/lucide/align-end-horizontal'
import IconRotateCw from '~icons/lucide/rotate-cw'
import IconFlipHorizontal2 from '~icons/lucide/flip-horizontal-2'
import IconFlipVertical2 from '~icons/lucide/flip-vertical-2'
import IconRotateCwSquare from '~icons/lucide/rotate-cw-square'

import { PositionControlsRoot, useI18n } from '@open-pencil/react'
import { useEditorStore } from '@/app/editor/active-store'
import { NumberField } from '@/components/inputs/NumberField'
import { IconButton } from '@/components/ui/IconButton'
import { PanelGrid } from '@/components/ui/panel/PanelGrid'
import { PanelSection } from '@/components/ui/panel/PanelSection'
import { Tip } from '@/components/ui/Tip'

export function PositionSection() {
  const { panels } = useI18n()
  const store = useEditorStore()

  function handleAlign(
    nodeAlign: (axis: 'horizontal' | 'vertical', pos: 'min' | 'center' | 'max') => void,
    axis: 'horizontal' | 'vertical',
    pos: 'min' | 'center' | 'max'
  ) {
    const editState = store.state.nodeEditState
    if (editState && editState.selectedVertexIndices.size >= 2) {
      store.nodeEditAlignVertices(axis, pos)
    } else {
      nodeAlign(axis, pos)
    }
  }

  return (
    <PositionControlsRoot>
      {({ active, isMulti, xValue, yValue, wValue, hValue, rotationValue, actions }) => {
        if (!active) return null
        return (
          <PanelSection label={panels.position}>
            <div role="toolbar" aria-label={panels.position} className="mb-panel flex justify-between">
              <div className="flex gap-0.5">
                <IconButton
                  label={panels.alignLeft}
                  size="md"
                  onClick={() => handleAlign(actions.align, 'horizontal', 'min')}
                >
                  <IconAlignStartVertical className="size-3.5" />
                </IconButton>
                <IconButton
                  label={panels.alignCenterHorizontally}
                  size="md"
                  onClick={() => handleAlign(actions.align, 'horizontal', 'center')}
                >
                  <IconAlignCenterVertical className="size-3.5" />
                </IconButton>
                <IconButton
                  label={panels.alignRight}
                  size="md"
                  onClick={() => handleAlign(actions.align, 'horizontal', 'max')}
                >
                  <IconAlignEndVertical className="size-3.5" />
                </IconButton>
              </div>
              <div className="flex gap-0.5">
                <IconButton
                  label={panels.alignTop}
                  size="md"
                  onClick={() => handleAlign(actions.align, 'vertical', 'min')}
                >
                  <IconAlignStartHorizontal className="size-3.5" />
                </IconButton>
                <IconButton
                  label={panels.alignCenterVertically}
                  size="md"
                  onClick={() => handleAlign(actions.align, 'vertical', 'center')}
                >
                  <IconAlignCenterHorizontal className="size-3.5" />
                </IconButton>
                <IconButton
                  label={panels.alignBottom}
                  size="md"
                  onClick={() => handleAlign(actions.align, 'vertical', 'max')}
                >
                  <IconAlignEndHorizontal className="size-3.5" />
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
                  onChange={(v) => actions.updateProp('x', v)}
                  onCommit={(v, p) => actions.commitProp('x', v, p)}
                />
              </Tip>
              <Tip label={panels.yAxis}>
                <NumberField
                  icon="Y"
                  data-property="y"
                  aria-label={panels.yAxis}
                  value={yValue}
                  onChange={(v) => actions.updateProp('y', v)}
                  onCommit={(v, p) => actions.commitProp('y', v, p)}
                />
              </Tip>
            </PanelGrid>

            {isMulti && (
              <PanelGrid columns="two" className="mt-panel">
                <Tip label={panels.width}>
                  <NumberField
                    icon="W"
                    data-property="width"
                    aria-label={panels.width}
                    value={wValue}
                    min={1}
                    onChange={(v) => actions.updateProp('width', v)}
                    onCommit={(v, p) => actions.commitProp('width', v, p)}
                  />
                </Tip>
                <Tip label={panels.height}>
                  <NumberField
                    icon="H"
                    data-property="height"
                    aria-label={panels.height}
                    value={hValue}
                    min={1}
                    onChange={(v) => actions.updateProp('height', v)}
                    onCommit={(v, p) => actions.commitProp('height', v, p)}
                  />
                </Tip>
              </PanelGrid>
            )}

            <div className="mt-panel grid grid-cols-[minmax(0,1fr)_repeat(3,var(--spacing-control))] gap-0.5">
              <Tip label={panels.rotation}>
                <NumberField
                  suffix="°"
                  data-property="rotation"
                  aria-label={panels.rotation}
                  value={rotationValue}
                  min={-360}
                  max={360}
                  onChange={(v) => actions.updateProp('rotation', v)}
                  onCommit={(v, p) => actions.commitProp('rotation', v, p)}
                  icon={<IconRotateCw className="size-3" />}
                />
              </Tip>
              <IconButton label={panels.flipHorizontal} size="md" onClick={() => actions.flip('horizontal')}>
                <IconFlipHorizontal2 className="size-3.5" />
              </IconButton>
              <IconButton label={panels.flipVertical} size="md" onClick={() => actions.flip('vertical')}>
                <IconFlipVertical2 className="size-3.5" />
              </IconButton>
              <IconButton label={panels.rotate90} size="md" onClick={() => actions.rotate(90)}>
                <IconRotateCwSquare className="size-3.5" />
              </IconButton>
            </div>
          </PanelSection>
        )
      }}
    </PositionControlsRoot>
  )
}
