import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

import { useEditor, useEditorVersion } from '../context/editorContext'
import { LayerTreeProvider, type LayerNode } from './context'

export interface LayerTreeRootSlotProps {
  items: LayerNode[]
  expanded: string[]
  treeKey: number
  selectedIds: Set<string>
  select: (id: string, additive: boolean) => void
  toggleExpand: (id: string) => void
  getKey: (v: LayerNode) => string
  getChildren: (v: LayerNode) => LayerNode[] | undefined
}

export interface LayerTreeRootProps {
  indentPerLevel?: number
  onSelect?: (id: string, additive: boolean) => void
  onToggleExpand?: (id: string) => void
  onToggleVisibility?: (id: string) => void
  onToggleLock?: (id: string) => void
  onRename?: (id: string, name: string) => void
  children?: ReactNode | ((state: LayerTreeRootSlotProps) => ReactNode)
}

export function LayerTreeRoot({
  indentPerLevel = 16,
  onSelect,
  onToggleExpand,
  onToggleVisibility,
  onToggleLock,
  onRename,
  children
}: LayerTreeRootProps) {
  const editor = useEditor()
  useEditorVersion()

  function buildTree(parentId: string): LayerNode[] {
    const parent = editor.graph.getNode(parentId)
    if (!parent) return []
    return parent.childIds
      .map((cid) => editor.graph.getNode(cid))
      .filter((n): n is NonNullable<typeof n> => !!n)
      .map((node) => ({
        id: node.id,
        name: node.name,
        type: node.type,
        layoutMode: node.layoutMode,
        visible: node.visible,
        locked: node.locked,
        children: node.childIds.length > 0 ? buildTree(node.id) : undefined
      }))
  }

  const [items, setItems] = useState(() => buildTree(editor.state.currentPageId))
  const [treeKey, setTreeKey] = useState(0)
  const [expanded, setExpanded] = useState<string[]>([])
  const selectedIds = editor.state.selectedIds
  const rowRefs = useRef(new Map<string, HTMLElement>())

  useEffect(() => {
    setItems(buildTree(editor.state.currentPageId))
    setTreeKey((k) => k + 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor.state.sceneVersion, editor.state.currentPageId])

  const setRowRef = useCallback((id: string, el: HTMLElement | null) => {
    if (el) rowRefs.current.set(id, el)
    else rowRefs.current.delete(id)
  }, [])

  useEffect(() => {
    const toExpand = new Set(expanded)
    for (const id of selectedIds) {
      let node = editor.graph.getNode(id)
      while (node?.parentId && node.parentId !== editor.state.currentPageId) {
        toExpand.add(node.parentId)
        node = editor.graph.getNode(node.parentId)
      }
    }
    if (toExpand.size > expanded.length) setExpanded([...toExpand])
    const first = [...selectedIds][0]
    if (first) {
      requestAnimationFrame(() => {
        rowRefs.current.get(first)?.scrollIntoView({ block: 'nearest' })
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds])

  function syncCanvasScope(nodeId: string) {
    const node = editor.graph.getNode(nodeId)
    if (!node) return
    let parentId = node.parentId
    while (parentId && parentId !== editor.state.currentPageId) {
      if (editor.graph.isContainer(parentId)) {
        editor.enterContainer(parentId)
        return
      }
      const parent = editor.graph.getNode(parentId)
      parentId = parent?.parentId ?? null
    }
    editor.state.enteredContainerId = null
  }

  function select(id: string, additive: boolean) {
    onSelect?.(id, additive)
    if (additive) {
      editor.select([id], true)
    } else {
      editor.select([id])
      syncCanvasScope(id)
    }
  }

  function toggleExpand(id: string) {
    onToggleExpand?.(id)
    setExpanded((prev) => {
      const idx = prev.indexOf(id)
      if (idx !== -1) return prev.filter((e) => e !== id)
      return [...prev, id]
    })
  }

  const slot: LayerTreeRootSlotProps = {
    items,
    expanded,
    treeKey,
    selectedIds,
    select,
    toggleExpand,
    getKey: (v) => v.id,
    getChildren: (v) => v.children
  }

  const content = typeof children === 'function' ? children(slot) : children

  return (
    <LayerTreeProvider
      value={{
        editor,
        items,
        expanded,
        treeKey,
        selectedIds,
        indentPerLevel,
        select,
        toggleExpand,
        toggleVisibility: (id: string) => {
          onToggleVisibility?.(id)
          editor.toggleNodeVisibility(id)
        },
        toggleLock: (id: string) => {
          onToggleLock?.(id)
          editor.toggleNodeLock(id)
        },
        rename: (id: string, name: string) => {
          onRename?.(id, name)
          editor.renameNode(id, name)
        },
        setRowRef
      }}
    >
      {content}
    </LayerTreeProvider>
  )
}
