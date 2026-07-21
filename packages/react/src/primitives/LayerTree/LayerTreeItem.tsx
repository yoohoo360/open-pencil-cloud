import { memo, useEffect, useMemo, useRef, type ReactNode } from 'react'

import type { LayerNode } from '#react/primitives/LayerTree/context'
import { useLayerTree } from '#react/primitives/LayerTree/context'

export type LayerTreeItemActions = {
  select: (additive: boolean, range?: boolean) => void
  toggleExpand: () => void
  toggleVisibility: () => void
  toggleLock: () => void
  rename: (name: string) => void
}

export type LayerTreeItemSlotProps = {
  node: LayerNode
  level: number
  hasChildren: boolean
  isSelected: boolean
  isDragging: boolean
  focused: boolean
  padLeft: string
  actions: LayerTreeItemActions
}

export type LayerTreeItemProps = {
  node: LayerNode
  level: number
  hasChildren: boolean
  children?: ReactNode | ((props: LayerTreeItemSlotProps) => ReactNode)
  onSelect?: (id: string, additive: boolean) => void
  onToggleExpand?: (id: string) => void
  onToggleVisibility?: (id: string) => void
  onToggleLock?: (id: string) => void
  onRename?: (id: string, name: string) => void
}

export const LayerTreeItem = memo(function LayerTreeItem({
  node,
  level,
  hasChildren,
  children,
  onSelect,
  onToggleExpand,
  onToggleVisibility,
  onToggleLock,
  onRename
}: LayerTreeItemProps) {
  const context = useLayerTree()
  const rowRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const element = rowRef.current
    if (!element) return
    context.setRowRef(node.id, element)
    const cleanup = context.setupDrag(element, () => ({
      id: node.id,
      level,
      hasChildren,
      parentId: null
    }))
    return () => {
      cleanup()
      context.setRowRef(node.id, null)
    }
  }, [context, hasChildren, level, node.id])
  const slotProps = useMemo<LayerTreeItemSlotProps>(
    () => ({
      node,
      level,
      hasChildren,
      isSelected: context.selectedIds.has(node.id),
      isDragging: context.draggingId === node.id,
      focused: context.focused,
      padLeft: `${(level - 1) * context.indentPerLevel}px`,
      actions: {
        select: (additive, range = false) => {
          onSelect?.(node.id, additive)
          context.select(node.id, { additive, range })
        },
        toggleExpand: () => {
          onToggleExpand?.(node.id)
          context.toggleExpand(node.id)
        },
        toggleVisibility: () => {
          onToggleVisibility?.(node.id)
          context.toggleVisibility(node.id)
        },
        toggleLock: () => {
          onToggleLock?.(node.id)
          context.toggleLock(node.id)
        },
        rename: (name) => {
          onRename?.(node.id, name)
          context.rename(node.id, name)
        }
      }
    }),
    [context, hasChildren, level, node, onRename, onSelect, onToggleExpand, onToggleLock, onToggleVisibility]
  )

  return (
    <div ref={rowRef} data-slot="item" data-node-id={node.id} className="w-full">
      {typeof children === 'function' ? children(slotProps) : children}
    </div>
  )
})

LayerTreeItem.displayName = 'LayerTreeItem'
