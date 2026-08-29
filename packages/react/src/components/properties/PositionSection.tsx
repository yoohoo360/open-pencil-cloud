import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical
} from 'lucide-react'

import { IconButton } from '#react/components/ui/IconButton'
import { NumberField } from '#react/components/inputs/NumberField'
import { PanelGrid } from '#react/components/ui/panel/PanelGrid'
import { PanelSection } from '#react/components/ui/panel/PanelSection'
import { Tip } from '#react/components/ui/Tip'
import { useNodePropCommit } from '#react/components/properties/useNodePropCommit'
import { useSelectionState } from '#react/editor/selection-state/use'
import { useSceneComputed } from '#react/internal/scene-computed/use'
import { useI18n } from '#react/i18n'

export function PositionSection() {
  const { editor, commit } = useNodePropCommit()
  const { selectedNode, selectedCount, hasSelection, selectedIds } = useSelectionState()
  const { panels } = useI18n()
  const node = useSceneComputed(() => editor.getSelectedNode() ?? selectedNode)
  if (!hasSelection || !node) return null

  const isMulti = selectedCount > 1
  const ids = [...selectedIds]

  function align(axis: 'horizontal' | 'vertical', pos: 'min' | 'center' | 'max') {
    editor.alignNodes(ids, axis, pos)
  }

  return (
    <PanelSection label={panels.position}>
      <div role="toolbar" aria-label={panels.position} className="mb-1.5 flex justify-between">
        <div className="flex gap-0.5">
          <IconButton label={panels.alignLeft} size="xs" onClick={() => align('horizontal', 'min')}>
            <AlignStartVertical className="size-3.5" />
          </IconButton>
          <IconButton
            label={panels.alignCenterHorizontally}
            size="xs"
            onClick={() => align('horizontal', 'center')}
          >
            <AlignCenterVertical className="size-3.5" />
          </IconButton>
          <IconButton label={panels.alignRight} size="xs" onClick={() => align('horizontal', 'max')}>
            <AlignEndVertical className="size-3.5" />
          </IconButton>
        </div>
        <div className="flex gap-0.5">
          <IconButton label={panels.alignTop} size="xs" onClick={() => align('vertical', 'min')}>
            <AlignStartHorizontal className="size-3.5" />
          </IconButton>
          <IconButton
            label={panels.alignCenterVertically}
            size="xs"
            onClick={() => align('vertical', 'center')}
          >
            <AlignCenterHorizontal className="size-3.5" />
          </IconButton>
          <IconButton label={panels.alignBottom} size="xs" onClick={() => align('vertical', 'max')}>
            <AlignEndHorizontal className="size-3.5" />
          </IconButton>
        </div>
      </div>

      <PanelGrid columns={2}>
        <Tip label={panels.xAxis}>
          <NumberField
            icon="X"
            data-property="x"
            aria-label={panels.xAxis}
            value={Math.round(node.x)}
            onCommit={(value, previous) => commit('x', value, previous)}
          />
        </Tip>
        <Tip label={panels.yAxis}>
          <NumberField
            icon="Y"
            data-property="y"
            aria-label={panels.yAxis}
            value={Math.round(node.y)}
            onCommit={(value, previous) => commit('y', value, previous)}
          />
        </Tip>
      </PanelGrid>

      <PanelGrid columns={2} className="mt-1.5">
        <Tip label={panels.width}>
          <NumberField
            icon="W"
            data-property="width"
            aria-label={panels.width}
            min={1}
            value={Math.round(node.width)}
            onCommit={(value, previous) => commit('width', value, previous)}
          />
        </Tip>
        <Tip label={panels.height}>
          <NumberField
            icon="H"
            data-property="height"
            aria-label={panels.height}
            min={1}
            value={Math.round(node.height)}
            onCommit={(value, previous) => commit('height', value, previous)}
          />
        </Tip>
      </PanelGrid>

      {isMulti ? null : (
        <PanelGrid columns={2} className="mt-1.5">
          <Tip label={panels.rotation}>
            <NumberField
              icon="R"
              data-property="rotation"
              aria-label={panels.rotation}
              value={Math.round(node.rotation)}
              onCommit={(value, previous) => commit('rotation', value, previous)}
            />
          </Tip>
        </PanelGrid>
      )}
    </PanelSection>
  )
}
