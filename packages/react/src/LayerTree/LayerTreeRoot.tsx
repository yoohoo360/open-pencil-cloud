import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

import { useEditor } from '../context/editorContext'
import { useSceneSnapshot } from '../store/useEditorStore'
import { LayerTreeProvider } from './context'

import type { LayerNode, LayerTreeContext } from './context'

export interface LayerTreeRootProps {
  indentPerLevel?: number
  onSelect?: (id: string, additive: boolean) => void
  onToggleExpand?: (id: string) => void
  onToggleVisibility?: (id: string) => void
  onToggleLock?: (id: string) => void
  onRename?: (id: string, name: string) => void
  children: (ctx: LayerTreeContext) => ReactNode
}

export function LayerTreeRoot({
  indentPerLevel = 16,
  onSelect: onSelectProp,
  onToggleExpand: onToggleExpandProp,
  onToggleVisibility: onToggleVisibilityProp,
  onToggleLock: onToggleLockProp,
  onRename: onRenameProp,
  children
}: LayerTreeRootProps) {
  const editor = useEditor()
  const selectedIds = useSceneSnapshot((e) => e.state.selectedIds)
  const sceneVersion = useSceneSnapshot((e) => e.state.sceneVersion)
  const currentPageId = useSceneSnapshot((e) => e.state.currentPageId)

  const [expanded, setExpanded] = useState<string[]>([])
  const [treeKey, setTreeKey] = useState(0)
  const rowRefs = useRef(new Map<string, HTMLElement>())

  const buildTree = useCallback(
    (parentId: string): LayerNode[] => {
      const parent = editor.graph.getNode(parentId)
      if (!parent) return []
      return parent.childIds
        .map((cid) => editor.graph.getNode(cid))
        .filter((n): n is NonNullable<typeof n> => n != null)
        .map((node) => ({
          id: node.id,
          name: node.name,
          type: node.type,
          layoutMode: node.layoutMode,
          visible: node.visible,
          locked: node.locked,
          children: node.childIds.length > 0 ? buildTree(node.id) : undefined
        }))
    },
    [editor]
  )

  const [items, setItems] = useState<LayerNode[]>(() => buildTree(editor.state.currentPageId))

  useEffect(() => {
    setItems(buildTree(currentPageId))
    setTreeKey((k) => k + 1)
  }, [sceneVersion, currentPageId, buildTree])

  useEffect(() => {
    const toExpand = new Set(expanded)
    for (const id of selectedIds) {
      let node = editor.graph.getNode(id)
      while (node?.parentId && node.parentId !== editor.state.currentPageId) {
        toExpand.add(node.parentId)
        node = editor.graph.getNode(node.parentId)
      }
    }
    if (toExpand.size > expanded.length) {
      setExpanded([...toExpand])
    }
    const first = [...selectedIds][0]
    if (first) {
      requestAnimationFrame(() => {
        rowRefs.current.get(first)?.scrollIntoView({ block: 'nearest' })
      })
    }
  }, [selectedIds, editor, expanded.length])

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
    onSelectProp?.(id, additive)
    if (additive) {
      editor.select([id], true)
    } else {
      editor.select([id])
      syncCanvasScope(id)
    }
  }

  function toggleExpand(id: string) {
    onToggleExpandProp?.(id)
    setExpanded((prev) => {
      const idx = prev.indexOf(id)
      return idx !== -1 ? prev.filter((e) => e !== id) : [...prev, id]
    })
  }

  function toggleVisibility(id: string) {
    onToggleVisibilityProp?.(id)
    const node = editor.graph.getNode(id)
    if (!node) return
    editor.updateNodeWithUndo(id, { visible: !node.visible }, 'Toggle visibility')
  }

  function toggleLock(id: string) {
    onToggleLockProp?.(id)
    const node = editor.graph.getNode(id)
    if (!node) return
    editor.updateNodeWithUndo(id, { locked: !node.locked }, 'Toggle lock')
  }

  function rename(id: string, name: string) {
    onRenameProp?.(id, name)
    editor.updateNodeWithUndo(id, { name }, 'Rename')
  }

  function setRowRef(id: string, el: HTMLElement | null) {
    if (el) rowRefs.current.set(id, el)
    else rowRefs.current.delete(id)
  }

  const ctx: LayerTreeContext = {
    editor,
    items,
    expanded,
    treeKey,
    selectedIds,
    indentPerLevel,
    select,
    toggleExpand,
    toggleVisibility,
    toggleLock,
    rename,
    setRowRef
  }

  return <LayerTreeProvider value={ctx}>{children(ctx)}</LayerTreeProvider>
}

export default LayerTreeRoot
