import {
  attachInstruction,
  extractInstruction,
  type Instruction,
  type ItemMode
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item'
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine'
import {
  draggable,
  dropTargetForElements,
  monitorForElements
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { useEffect, useState, type RefObject } from 'react'

import type { Editor } from '@open-pencil/core/editor'

interface DragItem {
  id: string
  level: number
  hasChildren: boolean
  parentId: string | null
}

type TreeInstruction = Extract<
  Instruction,
  { type: 'reorder-above' | 'reorder-below' | 'make-child' }
>

/**
 * Sets up tree-item drag-and-drop monitoring for the layer panel.
 *
 * Call {@link useLayerDragItem} from each row to bind a specific element.
 */
export function useLayerDrag(editor: Editor, _indentPerLevel = 16) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [instruction, setInstruction] = useState<TreeInstruction | null>(null)
  const [instructionTargetId, setInstructionTargetId] = useState<string | null>(null)

  useEffect(() => {
    return monitorForElements({
      onDrop: ({ source, location }) => {
        const target = location.current.dropTargets[0]
        if (!target) return

        const sourceId = source.data.id as string
        const targetId = target.data.id as string
        const inst = extractInstruction(target.data) as TreeInstruction | null
        if (!inst || !sourceId || !targetId) return

        if (editor.graph.isDescendant(targetId, sourceId)) return

        const targetNode = editor.graph.getNode(targetId)
        if (!targetNode) return
        const targetParentId = targetNode.parentId ?? editor.state.currentPageId
        const targetParent = editor.graph.getNode(targetParentId)
        if (!targetParent) return
        const targetIndex = targetParent.childIds.indexOf(targetId)

        if (inst.type === 'reorder-above') {
          editor.reorderChildWithUndo(sourceId, targetParentId, targetIndex)
        } else if (inst.type === 'reorder-below') {
          editor.reorderChildWithUndo(sourceId, targetParentId, targetIndex + 1)
        } else if (inst.type === 'make-child') {
          const container = editor.graph.getNode(targetId)
          editor.reorderChildWithUndo(sourceId, targetId, container?.childIds.length ?? 0)
        }

        setDraggingId(null)
        setInstruction(null)
        setInstructionTargetId(null)
      }
    })
  }, [editor])

  return {
    draggingId,
    instruction,
    instructionTargetId,
    setDraggingId,
    setInstruction,
    setInstructionTargetId
  }
}

/**
 * Bind pragmatic drag-and-drop handlers to a single layer-tree row element.
 */
export function useLayerDragItem(
  el: RefObject<HTMLElement | null>,
  item: () => DragItem,
  opts: {
    indentPerLevel?: number
    setDraggingId: (id: string | null) => void
    setInstruction: (inst: TreeInstruction | null) => void
    setInstructionTargetId: (id: string | null) => void
  }
) {
  const indentPerLevel = opts.indentPerLevel ?? 16

  useEffect(() => {
    const element = el.current
    if (!element) return

    const data = item()
    const mode: ItemMode = data.hasChildren ? 'expanded' : 'standard'

    return combine(
      draggable({
        element,
        getInitialData: () => ({ id: data.id }),
        onDragStart: () => {
          opts.setDraggingId(data.id)
        },
        onDrop: () => {
          opts.setDraggingId(null)
        }
      }),
      dropTargetForElements({
        element,
        getData: ({ input, element: targetEl }) =>
          attachInstruction(
            { id: data.id },
            {
              input,
              element: targetEl,
              indentPerLevel,
              currentLevel: data.level,
              mode,
              block: []
            }
          ),
        canDrop: ({ source }) => source.data.id !== data.id,
        onDrag: ({ self }) => {
          const inst = extractInstruction(self.data) as TreeInstruction | null
          opts.setInstruction(inst)
          opts.setInstructionTargetId(inst ? data.id : null)
        },
        onDragLeave: () => {
          opts.setInstruction(null)
          opts.setInstructionTargetId(null)
        },
        onDrop: () => {
          opts.setInstruction(null)
          opts.setInstructionTargetId(null)
        },
        getIsSticky: () => true
      })
    )
  })
}
