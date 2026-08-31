import { applyLayerDrag, type LayerDragInstruction } from '#react/components/LayerTree/apply'
import { canAcceptInsertedChild } from '#react/controls/component-props/slot-insert'
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
import { useCallback, useEffect, useRef, useState } from 'react'

import type { Editor } from '@open-pencil/core/editor'

export type LayerDragItem = {
  id: string
  level: number
  hasChildren: boolean
  expanded?: boolean
}

export function useLayerDrag(editor: Editor, indentPerLevel = 16, onExpand?: (id: string) => void) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [instruction, setInstruction] = useState<LayerDragInstruction | null>(null)
  const [instructionTargetId, setInstructionTargetId] = useState<string | null>(null)
  const editorRef = useRef(editor)
  const onExpandRef = useRef(onExpand)
  editorRef.current = editor
  onExpandRef.current = onExpand

  const clearInstruction = useCallback(() => {
    setInstruction(null)
    setInstructionTargetId(null)
  }, [])

  const setupItem = useCallback(
    (element: HTMLElement | null, item: LayerDragItem) => {
      if (!element) return () => {}
      const target = editorRef.current.graph.getNode(item.id)
      const canNest = canAcceptInsertedChild(target, (id) => editorRef.current.graph.getNode(id))
      const mode: ItemMode = item.hasChildren && item.expanded ? 'expanded' : 'standard'
      return combine(
        draggable({
          element,
          getInitialData: () => ({ id: item.id }),
          onDragStart: () => setDraggingId(item.id),
          onDrop: () => setDraggingId(null)
        }),
        dropTargetForElements({
          element,
          getData: ({ input, element: target }) =>
            attachInstruction(
              { id: item.id },
              {
                input,
                element: target,
                indentPerLevel,
                currentLevel: item.level,
                mode,
                block: canNest ? ['reparent'] : ['make-child', 'reparent']
              }
            ),
          canDrop: ({ source }) => source.data.id !== item.id,
          onDrag: ({ self }) => {
            const next = extractInstruction(self.data)
            if (!next || next.type === 'instruction-blocked') {
              clearInstruction()
              return
            }
            setInstruction(next as LayerDragInstruction)
            setInstructionTargetId(item.id)
          },
          onDragLeave: clearInstruction,
          onDrop: clearInstruction,
          getIsSticky: () => true
        })
      )
    },
    [clearInstruction, indentPerLevel]
  )

  useEffect(() => {
    return monitorForElements({
      onDrop: ({ source, location }) => {
        const target = location.current.dropTargets.at(0)
        if (!target) return
        const sourceId = source.data.id
        const targetId = target.data.id
        if (typeof sourceId !== 'string' || typeof targetId !== 'string') return
        const raw = extractInstruction(target.data)
        if (!raw || raw.type === 'instruction-blocked') return
        applyLayerDrag(editorRef.current, sourceId, targetId, raw as LayerDragInstruction)
        if (raw.type === 'make-child') onExpandRef.current?.(targetId)
        setDraggingId(null)
        clearInstruction()
      }
    })
  }, [clearInstruction])

  return { draggingId, instruction, instructionTargetId, setupItem }
}
