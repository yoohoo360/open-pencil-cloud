import { useEffect, useState } from 'react'

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

import type { Editor } from '@open-pencil/core/editor'

export interface DragItem {
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
 * Sets up drag-and-drop for a single layer tree item.
 *
 * Returns a cleanup function. Call from a React `useEffect` or a React 19
 * ref callback that returns a cleanup.
 *
 * @example
 * ```tsx
 * const { setupItem } = useLayerDrag(editor)
 * // in the item component:
 * <div ref={(el) => { if (!el) return; return setupItem(el, { id, level, hasChildren, parentId }) }}>
 * ```
 */
export function useLayerDrag(editor: Editor, indentPerLevel = 16) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [instruction, setInstruction] = useState<TreeInstruction | null>(null)
  const [instructionTargetId, setInstructionTargetId] = useState<string | null>(null)

  useEffect(() => {
    const cleanupMonitor = monitorForElements({
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
    return cleanupMonitor
  }, [editor])

  /**
   * Set up drag-and-drop for a layer item element.
   *
   * Returns a cleanup function suitable for use with React 19 ref callbacks
   * or inside a `useEffect`.
   */
  function setupItem(element: HTMLElement, item: DragItem): () => void {
    const mode: ItemMode = item.hasChildren ? 'expanded' : 'standard'

    return combine(
      draggable({
        element,
        getInitialData: () => ({ id: item.id }),
        onDragStart: () => {
          setDraggingId(item.id)
        },
        onDrop: () => {
          setDraggingId(null)
        }
      }),
      dropTargetForElements({
        element,
        getData: ({ input, element: el }) =>
          attachInstruction(
            { id: item.id },
            {
              input,
              element: el,
              indentPerLevel,
              currentLevel: item.level,
              mode,
              block: []
            }
          ),
        canDrop: ({ source }) => source.data.id !== item.id,
        onDrag: ({ self }) => {
          const inst = extractInstruction(self.data) as TreeInstruction | null
          setInstruction(inst)
          setInstructionTargetId(inst ? item.id : null)
        },
        onDragLeave: () => {
          setInstruction(null)
          setInstructionTargetId(null)
        },
        onDrop: () => {
          setInstruction(null)
          setInstructionTargetId(null)
        },
        getIsSticky: () => true
      })
    )
  }

  return {
    draggingId,
    instruction,
    instructionTargetId,
    setupItem
  }
}
