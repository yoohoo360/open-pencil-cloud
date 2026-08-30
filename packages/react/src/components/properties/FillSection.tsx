import { BoundColorRow } from '#react/components/properties/paint/BoundColorRow'
import { SharedStyleField } from '#react/components/properties/shared-style/SharedStyleField'
import { IconButton } from '#react/components/ui/IconButton'
import { PanelSection } from '#react/components/ui/panel/PanelSection'
import { useSharedStyleBinding } from '#react/controls/shared-style'
import { useEditor } from '#react/editor/context'
import { useSelectionState } from '#react/editor/selection-state/use'
import { useI18n } from '#react/i18n'
import { useSceneComputed } from '#react/internal/scene-computed/use'
import { Plus, Trash2 } from 'lucide-react'

import { DEFAULT_SHAPE_FILL } from '@open-pencil/core/constants'
import type { Fill, SceneNode } from '@open-pencil/scene-graph'

export function FillSection() {
  const editor = useEditor()
  const { hasSelection } = useSelectionState()
  const { panels } = useI18n()
  const fillStyle = useSharedStyleBinding('fill')
  const nodes = useSceneComputed(() => editor.getSelectedNodes())
  if (!hasSelection) return null

  const fills = nodes[0]?.fills ?? []
  const empty = fills.length === 0 && !fillStyle.visible
  const nodeIds = nodes.map((node) => node.id)

  function patchNodeFills(node: SceneNode, mutator: (fills: Fill[]) => Fill[], label: string) {
    editor.updateNodeWithUndo(node.id, { fills: mutator(structuredClone(node.fills)) }, label)
  }

  function addFill() {
    for (const node of nodes) {
      patchNodeFills(
        node,
        (current) => [...current, structuredClone(DEFAULT_SHAPE_FILL)],
        'Add fill'
      )
    }
  }

  return (
    <PanelSection
      label={panels.fill}
      empty={empty}
      actions={
        <IconButton label={panels.addFill} onClick={addFill}>
          <Plus className="size-3.5" />
        </IconButton>
      }
    >
      <SharedStyleField binding={fillStyle} label={panels.fillStyle} />
      {fills.map((fill, index) => (
        <div
          key={`${nodes[0]?.id ?? 'fill'}:${index}:${fill.visible ? 'visible' : 'hidden'}`}
          className="mb-1.5 last:mb-0"
        >
          <div className="flex items-start gap-1">
            <div className="min-w-0 flex-1">
              <BoundColorRow
                nodeIds={nodeIds}
                kind="fills"
                index={index}
                color={fill.color}
                opacity={fill.opacity}
                label={panels.fill}
                batchLabel="Change fill color"
                onColor={(color) => {
                  for (const node of nodes) {
                    patchNodeFills(
                      node,
                      (current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index && item.type === 'SOLID' ? { ...item, color } : item
                        ),
                      'Update fill'
                    )
                  }
                }}
                onOpacity={(opacity) => {
                  for (const node of nodes) {
                    patchNodeFills(
                      node,
                      (current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, opacity } : item
                        ),
                      'Update fill'
                    )
                  }
                }}
              />
            </div>
            <IconButton
              label={panels.removeFill}
              onClick={() => {
                for (const node of nodes) {
                  patchNodeFills(
                    node,
                    (current) => current.filter((_, itemIndex) => itemIndex !== index),
                    'Remove fill'
                  )
                }
              }}
            >
              <Trash2 className="size-3.5" />
            </IconButton>
          </div>
        </div>
      ))}
    </PanelSection>
  )
}
