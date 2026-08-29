import { Blend, Eye, EyeOff, SquareRoundCorner } from 'lucide-react'

import { VariableNumberField } from '#react/components/properties/VariableNumberField'
import { IconButton } from '#react/components/ui/IconButton'
import { PanelGrid } from '#react/components/ui/panel/PanelGrid'
import { PanelSection } from '#react/components/ui/panel/PanelSection'
import { useNodePropCommit } from '#react/components/properties/useNodePropCommit'
import { useSelectionState } from '#react/editor/selection-state/use'
import { useSceneComputed } from '#react/internal/scene-computed/use'
import { useI18n } from '#react/i18n'

const CORNER_TYPES = new Set([
  'RECTANGLE',
  'FRAME',
  'COMPONENT',
  'COMPONENT_SET',
  'INSTANCE',
  'VECTOR',
  'POLYGON',
  'STAR'
])

export function AppearanceSection() {
  const { editor, commit } = useNodePropCommit()
  const { selectedNode, hasSelection } = useSelectionState()
  const { panels } = useI18n()
  const node = useSceneComputed(() => editor.getSelectedNode() ?? selectedNode)
  if (!hasSelection || !node) return null

  const hidden = node.visible === false
  const hasCorners = CORNER_TYPES.has(node.type)

  return (
    <PanelSection
      label={panels.appearance}
      actions={
        <IconButton
          label={panels.toggleVisibility}
          active={hidden}
          onClick={() => editor.toggleVisibility()}
        >
          {hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        </IconButton>
      }
    >
      <PanelGrid columns={2} distribution="wide-first">
        <div className="flex h-6 items-center gap-1.5 text-[11px] text-muted">
          <Blend className="size-3" />
          {panels.opacity}
        </div>
        <VariableNumberField
          data-property="opacity"
          aria-label={panels.opacity}
          suffix="%"
          min={0}
          max={100}
          value={Math.round(node.opacity * 100)}
          nodeId={node.id}
          bindingPath="opacity"
          onCommit={(value) => editor.setOpacity(value / 100)}
        />
      </PanelGrid>
      {hasCorners ? (
        <PanelGrid columns={2} className="mt-1.5">
          <VariableNumberField
            data-property="cornerRadius"
            aria-label={panels.radius}
            min={0}
            value={Math.round(node.cornerRadius)}
            nodeId={node.id}
            bindingPath="cornerRadius"
            onCommit={(value, previous) => commit('cornerRadius', value, previous)}
          />
          <div className="flex h-6 items-center text-[11px] text-muted">
            <SquareRoundCorner className="mr-1 size-3" />
            {panels.radius}
          </div>
        </PanelGrid>
      ) : null}
    </PanelSection>
  )
}
