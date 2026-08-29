import { Plus, Trash2 } from 'lucide-react'

import { BLACK } from '@open-pencil/core/constants'
import type { SceneNode, Stroke } from '@open-pencil/scene-graph'

import { NumberField } from '#react/components/inputs/NumberField'
import { BoundColorRow } from '#react/components/properties/paint/BoundColorRow'
import { IconButton } from '#react/components/ui/IconButton'
import { PanelGrid } from '#react/components/ui/panel/PanelGrid'
import { PanelSection } from '#react/components/ui/panel/PanelSection'
import { useEditor } from '#react/editor/context'
import { useSelectionState } from '#react/editor/selection-state/use'
import { useSceneComputed } from '#react/internal/scene-computed/use'
import { useI18n } from '#react/i18n'

const DEFAULT_STROKE: Stroke = {
  color: BLACK,
  weight: 1,
  opacity: 1,
  visible: true,
  align: 'CENTER'
}

export function StrokeSection() {
  const editor = useEditor()
  const { hasSelection } = useSelectionState()
  const { panels } = useI18n()
  const nodes = useSceneComputed(() => editor.getSelectedNodes())
  if (!hasSelection) return null

  const strokes = nodes[0]?.strokes ?? []
  const empty = strokes.length === 0
  const nodeIds = nodes.map((node) => node.id)

  function patchNodeStrokes(node: SceneNode, mutator: (strokes: Stroke[]) => Stroke[], label: string) {
    editor.updateNodeWithUndo(node.id, { strokes: mutator(structuredClone(node.strokes)) }, label)
  }

  function addStroke() {
    for (const node of nodes) {
      patchNodeStrokes(node, (current) => [...current, structuredClone(DEFAULT_STROKE)], 'Add stroke')
    }
  }

  return (
    <PanelSection
      label={panels.stroke}
      empty={empty}
      actions={
        <IconButton label={panels.addStroke} onClick={addStroke}>
          <Plus className="size-3.5" />
        </IconButton>
      }
    >
      {strokes.map((stroke, index) => (
          <div key={`${nodes[0]?.id ?? 'stroke'}:${index}:${stroke.visible ? 'visible' : 'hidden'}`} className="mb-1.5 last:mb-0">
          <div className="flex items-start gap-1">
            <div className="min-w-0 flex-1">
              <BoundColorRow
                nodeIds={nodeIds}
                kind="strokes"
                index={index}
                color={stroke.color}
                opacity={stroke.opacity}
                label={panels.stroke}
                batchLabel="Change stroke color"
                onColor={(color) => {
                  for (const node of nodes) {
                    patchNodeStrokes(
                      node,
                      (current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, color } : item
                        ),
                      'Update stroke'
                    )
                  }
                }}
                onOpacity={(opacity) => {
                  for (const node of nodes) {
                    patchNodeStrokes(
                      node,
                      (current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, opacity } : item
                        ),
                      'Update stroke'
                    )
                  }
                }}
              />
              <PanelGrid columns={1} className="mt-1.5">
                <NumberField
                  icon="W"
                  min={0}
                  data-property="stroke-weight"
                  aria-label={panels.strokeWeight}
                  value={stroke.weight}
                  onCommit={(weight) => {
                    for (const node of nodes) {
                      patchNodeStrokes(
                        node,
                        (current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, weight } : item
                          ),
                        'Update stroke'
                      )
                    }
                  }}
                />
              </PanelGrid>
            </div>
            <IconButton
              label={panels.removeStroke}
              onClick={() => {
                for (const node of nodes) {
                  patchNodeStrokes(
                    node,
                    (current) => current.filter((_, itemIndex) => itemIndex !== index),
                    'Remove stroke'
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
