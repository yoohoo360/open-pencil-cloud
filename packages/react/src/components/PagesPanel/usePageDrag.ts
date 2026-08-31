import {
  attachInstruction,
  extractInstruction,
  type Instruction
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/list-item'
import { getReorderDestinationIndex } from '@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index'
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine'
import {
  draggable,
  dropTargetForElements,
  monitorForElements
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { useCallback, useEffect, useRef, useState } from 'react'

export type PageDragInstruction = Extract<
  Instruction,
  { operation: 'reorder-before' | 'reorder-after' }
>

export type PageDragItem = {
  id: string
}

function isPageDragInstruction(instruction: Instruction | null): instruction is PageDragInstruction {
  return (
    !!instruction &&
    !instruction.blocked &&
    (instruction.operation === 'reorder-before' || instruction.operation === 'reorder-after')
  )
}

export function usePageDrag(
  getItems: () => readonly PageDragItem[],
  onMove: (pageId: string, index: number) => void
) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [instruction, setInstruction] = useState<PageDragInstruction | null>(null)
  const [instructionTargetId, setInstructionTargetId] = useState<string | null>(null)
  const getItemsRef = useRef(getItems)
  const onMoveRef = useRef(onMove)
  getItemsRef.current = getItems
  onMoveRef.current = onMove

  const clearInstruction = useCallback(() => {
    setInstruction(null)
    setInstructionTargetId(null)
  }, [])

  const setupItem = useCallback(
    (element: HTMLElement | null, item: PageDragItem) => {
      if (!element) return () => {}
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
                axis: 'vertical',
                operations: {
                  'reorder-before': 'available',
                  'reorder-after': 'available'
                }
              }
            ),
          canDrop: ({ source }) => source.data.id !== item.id,
          onDrag: ({ self }) => {
            const next = extractInstruction(self.data)
            if (!isPageDragInstruction(next)) {
              clearInstruction()
              return
            }
            setInstruction(next)
            setInstructionTargetId(item.id)
          },
          onDragLeave: clearInstruction,
          onDrop: clearInstruction,
          getIsSticky: () => true
        })
      )
    },
    [clearInstruction]
  )

  useEffect(() => {
    return monitorForElements({
      onDrop: ({ source, location }) => {
        const target = location.current.dropTargets.at(0)
        if (!target) return

        const sourceId = typeof source.data.id === 'string' ? source.data.id : null
        const targetId = typeof target.data.id === 'string' ? target.data.id : null
        if (!sourceId || !targetId || sourceId === targetId) return

        const dropInstruction = extractInstruction(target.data)
        if (!isPageDragInstruction(dropInstruction)) return

        const currentItems = getItemsRef.current()
        const startIndex = currentItems.findIndex((item) => item.id === sourceId)
        const indexOfTarget = currentItems.findIndex((item) => item.id === targetId)
        const targetIndex = getReorderDestinationIndex({
          startIndex,
          indexOfTarget,
          axis: 'vertical',
          closestEdgeOfTarget: dropInstruction.operation === 'reorder-before' ? 'top' : 'bottom'
        })

        if (targetIndex !== startIndex) onMoveRef.current(sourceId, targetIndex)
        setDraggingId(null)
        clearInstruction()
      }
    })
  }, [clearInstruction])

  return { draggingId, instruction, instructionTargetId, setupItem }
}
