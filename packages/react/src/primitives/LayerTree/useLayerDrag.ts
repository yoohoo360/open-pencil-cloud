import {
  attachInstruction,
  extractInstruction,
  type ItemMode
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item'
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine'
import {
  draggable,
  dropTargetForElements,
  monitorForElements
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { useCallback, useEffect, useState } from 'react'

import type { Editor } from '@open-pencil/core/editor'

import type { LayerDragInstruction } from '#react/primitives/LayerTree/context'

interface DragItem {
  id: string
  level: number
  hasChildren: boolean
  parentId: string | null
}

type TreeInstruction = LayerDragInstruction

export function useLayerDrag(
  editor: Editor,
  indentPerLevel = 16,
  onMakeChildDrop?: (targetId: string) => void
) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [instruction, setInstruction] = useState<TreeInstruction | null>(null)
  const [instructionTargetId, setInstructionTargetId] = useState<string | null>(null)

  const setupItem = useCallback(
    (element: HTMLElement, item: () => DragItem) => {
      const data = item()
      const isContainer = editor.graph.isContainer(data.id)
      const mode: ItemMode = data.hasChildren ? 'expanded' : 'standard'
      return combine(
        draggable({
          element,
          getInitialData: () => ({ id: data.id }),
          onDragStart: () => {
            setDraggingId(data.id)
          },
          onDrop: () => {
            setDraggingId(null)
          }
        }),
        dropTargetForElements({
          element,
          getData: ({ input, element: el }) =>
            attachInstruction(
              { id: data.id },
              {
                input,
                element: el,
                indentPerLevel,
                currentLevel: data.level,
                mode,
                block: isContainer ? ['reparent'] : ['make-child', 'reparent']
              }
            ),
          canDrop: ({ source }) => source.data.id !== data.id,
          onDrag: ({ self }) => {
            const inst = extractInstruction(self.data)
            if (!inst || inst.type === 'instruction-blocked') {
              setInstruction(null)
              setInstructionTargetId(null)
              return
            }
            setInstruction(inst as TreeInstruction)
            setInstructionTargetId(data.id)
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
    },
    [editor, indentPerLevel]
  )

  useEffect(() => {
    return monitorForElements({
      onDrop: ({ source, location }) => {
      const target = location.current.dropTargets.at(0)
      if (!target) return

      const sourceId = source.data.id as string
      const targetId = target.data.id as string
      const rawInstruction = extractInstruction(target.data)
      if (!rawInstruction || rawInstruction.type === 'instruction-blocked') return
      const inst = rawInstruction as TreeInstruction
      if (!sourceId || !targetId) return

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
      } else {
        const container = editor.graph.getNode(targetId)
        if (!container || !editor.graph.isContainer(targetId)) return
        editor.reorderChildWithUndo(sourceId, targetId, container.childIds.length)
        onMakeChildDrop?.(targetId)
      }

        setDraggingId(null)
        setInstruction(null)
        setInstructionTargetId(null)
      }
    })
  }, [editor, onMakeChildDrop])

  return {
    draggingId,
    instruction,
    instructionTargetId,
    setupItem
  }
}
