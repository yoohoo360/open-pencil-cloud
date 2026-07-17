import { useCallback, type ReactNode } from 'react'

import { useLayerTree, type LayerNode } from './context'

export interface LayerTreeItemSlotProps {
  node: LayerNode
  level: number
  hasChildren: boolean
  isSelected: boolean
  isDragging: boolean
  padLeft: string
  select: (additive: boolean) => void
  toggleExpand: () => void
  toggleVisibility: () => void
  toggleLock: () => void
  rename: (name: string) => void
}

export interface LayerTreeItemProps {
  node: LayerNode
  level: number
  hasChildren: boolean
  onSelect?: (id: string, additive: boolean) => void
  onToggleExpand?: (id: string) => void
  onToggleVisibility?: (id: string) => void
  onToggleLock?: (id: string) => void
  onRename?: (id: string, name: string) => void
  children?: ReactNode | ((state: LayerTreeItemSlotProps) => ReactNode)
}

export function LayerTreeItem({
  node,
  level,
  hasChildren,
  onSelect,
  onToggleExpand,
  onToggleVisibility,
  onToggleLock,
  onRename,
  children
}: LayerTreeItemProps) {
  const ctx = useLayerTree()

  const isSelected = ctx.selectedIds.has(node.id)
  const isDragging = false
  const padLeft = `${8 + (level - 1) * ctx.indentPerLevel}px`

  const onRef = useCallback(
    (el: HTMLDivElement | null) => {
      ctx.setRowRef(node.id, el)
    },
    [ctx, node.id]
  )

  const slot: LayerTreeItemSlotProps = {
    node,
    level,
    hasChildren,
    isSelected,
    isDragging,
    padLeft,
    select: (additive: boolean) => {
      onSelect?.(node.id, additive)
      ctx.select(node.id, additive)
    },
    toggleExpand: () => {
      onToggleExpand?.(node.id)
      ctx.toggleExpand(node.id)
    },
    toggleVisibility: () => {
      onToggleVisibility?.(node.id)
      ctx.toggleVisibility(node.id)
    },
    toggleLock: () => {
      onToggleLock?.(node.id)
      ctx.toggleLock(node.id)
    },
    rename: (name: string) => {
      onRename?.(node.id, name)
      ctx.rename(node.id, name)
    }
  }

  return (
    <div ref={onRef} data-node-id={node.id}>
      {typeof children === 'function' ? children(slot) : children}
    </div>
  )
}
