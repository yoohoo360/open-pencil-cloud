import { type ReactNode } from 'react'

import { useLayerTree } from './context'

import type { LayerNode } from './context'

export interface LayerTreeItemProps {
  node: LayerNode
  depth?: number
  onSelect?: (id: string, additive: boolean) => void
  onToggleExpand?: (id: string) => void
  onToggleVisibility?: (id: string) => void
  onToggleLock?: (id: string) => void
  onRename?: (id: string, name: string) => void
  children: (ctx: {
    node: LayerNode
    depth: number
    isExpanded: boolean
    hasChildren: boolean
    isSelected: boolean
    padLeft: number
    select: (additive: boolean) => void
    toggleExpand: () => void
    toggleVisibility: () => void
    toggleLock: () => void
    rename: (name: string) => void
    setRef: (el: HTMLElement | null) => void
  }) => ReactNode
}

export function LayerTreeItem({
  node,
  depth = 0,
  onSelect,
  onToggleExpand,
  onToggleVisibility,
  onToggleLock,
  onRename,
  children
}: LayerTreeItemProps) {
  const ctx = useLayerTree()

  const isExpanded = ctx.expanded.includes(node.id)
  const hasChildren = (node.children?.length ?? 0) > 0
  const isSelected = ctx.selectedIds.has(node.id)
  const padLeft = depth * ctx.indentPerLevel

  function select(additive: boolean) {
    onSelect?.(node.id, additive)
    ctx.select(node.id, additive)
  }

  function toggleExpand() {
    onToggleExpand?.(node.id)
    ctx.toggleExpand(node.id)
  }

  function toggleVisibility() {
    onToggleVisibility?.(node.id)
    ctx.toggleVisibility(node.id)
  }

  function toggleLock() {
    onToggleLock?.(node.id)
    ctx.toggleLock(node.id)
  }

  function rename(name: string) {
    onRename?.(node.id, name)
    ctx.rename(node.id, name)
  }

  function setRef(el: HTMLElement | null) {
    ctx.setRowRef(node.id, el)
  }

  return (
    <>
      {children({
        node,
        depth,
        isExpanded,
        hasChildren,
        isSelected,
        padLeft,
        select,
        toggleExpand,
        toggleVisibility,
        toggleLock,
        rename,
        setRef
      })}
    </>
  )
}

export default LayerTreeItem
