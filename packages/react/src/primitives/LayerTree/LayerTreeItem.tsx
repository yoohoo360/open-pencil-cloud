import { useEffect, useRef, type ReactNode } from 'react'

import { useLayerTree } from '#react/primitives/LayerTree/context'
import type { LayerNode } from '#react/primitives/LayerTree/context'

interface LayerTreeItemActions {
  select: (additive: boolean) => void
  toggleExpand: () => void
  toggleVisibility: () => void
  toggleLock: () => void
  rename: (name: string) => void
}

interface LayerTreeItemSlotProps {
  node: LayerNode
  level: number
  hasChildren: boolean
  isSelected: boolean
  isDragging: boolean
  padLeft: string
  actions: LayerTreeItemActions
}

interface LayerTreeItemProps {
  node: LayerNode
  level: number
  hasChildren: boolean
  onSelect?: (id: string, additive: boolean) => void
  onToggleExpand?: (id: string) => void
  onToggleVisibility?: (id: string) => void
  onToggleLock?: (id: string) => void
  onRename?: (id: string, name: string) => void
  children?: ReactNode | ((props: LayerTreeItemSlotProps) => ReactNode)
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
  const rowRef = useRef<HTMLDivElement | null>(null)

  const isSelected = ctx.selectedIds.has(node.id)
  const isDragging = ctx.draggingId === node.id
  const padLeft = `${8 + (level - 1) * ctx.indentPerLevel}px`

  useEffect(() => {
    const el = rowRef.current
    if (!el) return undefined
    return ctx.setupDrag(el, { id: node.id, level, hasChildren, parentId: null })
  }, [ctx, node.id, level, hasChildren])

  useEffect(() => {
    ctx.setRowRef(node.id, rowRef.current)
    return () => {
      ctx.setRowRef(node.id, null)
    }
  }, [ctx, node.id])

  const actions: LayerTreeItemActions = {
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

  const slotProps: LayerTreeItemSlotProps = {
    node,
    level,
    hasChildren,
    isSelected,
    isDragging,
    padLeft,
    actions
  }

  return (
    <div ref={rowRef} data-node-id={node.id}>
      {typeof children === 'function' ? children(slotProps) : children}
    </div>
  )
}
