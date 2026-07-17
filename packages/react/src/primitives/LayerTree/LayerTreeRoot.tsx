import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { SceneNode } from '@open-pencil/scene-graph'

import { useEditor } from '#react/editor/context'
import { LayerTreeContextProvider } from '#react/primitives/LayerTree/context'
import { useLayerDrag } from '#react/primitives/LayerTree/useLayerDrag'
import type { LayerDragInstruction, LayerNode } from '#react/primitives/LayerTree/context'

interface LayerTreeRootSlotProps {
  items: LayerNode[]
  expanded: string[]
  treeVersion: number
  selectedIds: ReadonlySet<string>
  draggingId: string | null
  instruction: LayerDragInstruction | null
  instructionTargetId: string | null
  actions: {
    select: (id: string, additive: boolean) => void
    toggleExpand: (id: string) => void
  }
}

interface LayerTreeRootProps {
  indentPerLevel?: number
  onSelect?: (id: string, additive: boolean) => void
  onToggleExpand?: (id: string) => void
  onToggleVisibility?: (id: string) => void
  onToggleLock?: (id: string) => void
  onRename?: (id: string, name: string) => void
  children?: ReactNode | ((props: LayerTreeRootSlotProps) => ReactNode)
}

function nodeToLayerNode(node: SceneNode): LayerNode {
  return {
    id: node.id,
    name: node.name,
    type: node.type,
    layoutMode: node.layoutMode,
    visible: node.visible,
    locked: node.locked
  }
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

  const buildTree = useCallback(
    (parentId: string): LayerNode[] => {
      const parent = editor.graph.getNode(parentId)
      if (!parent) return []
      return parent.childIds
        .map((cid) => editor.graph.getNode(cid))
        .filter((n): n is NonNullable<typeof n> => n != null)
        .map((node) => ({
          ...nodeToLayerNode(node),
          children: node.childIds.length > 0 ? buildTree(node.id) : undefined
        }))
    },
    [editor]
  )

  const [items, setItems] = useState<LayerNode[]>(() => buildTree(editor.state.currentPageId))
  const [treeVersion, setTreeVersion] = useState(0)
  const [expanded, setExpanded] = useState<string[]>([])

  const selectedIds = editor.state.selectedIds

  const rowRefs = useRef(new Map<string, HTMLElement>())

  function setRowRef(id: string, el: HTMLElement | null) {
    if (el) rowRefs.current.set(id, el)
    else rowRefs.current.delete(id)
  }

  const expandNode = useCallback((id: string) => {
    setExpanded((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }, [])

  const { draggingId, instruction, instructionTargetId, setupItem } = useLayerDrag(
    editor,
    indentPerLevel,
    expandNode
  )

  function replaceLayerNode(nodes: LayerNode[], replacement: LayerNode): LayerNode[] | null {
    const state = { changed: false }
    const next = nodes.map((node) => {
      if (node.id === replacement.id) {
        state.changed = true
        return { ...replacement, children: node.children }
      }
      if (!node.children) return node
      const children = replaceLayerNode(node.children, replacement)
      if (!children) return node
      state.changed = true
      return { ...node, children }
    })
    return state.changed ? next : null
  }

  const rebuildTree = useCallback(() => {
    setItems(buildTree(editor.state.currentPageId))
    setTreeVersion((v) => v + 1)
  }, [buildTree, editor])

  function patchLayerNode(id: string, changes: Partial<SceneNode>) {
    if ('childIds' in changes || 'parentId' in changes) {
      rebuildTree()
      return
    }

    if (
      !(
        'name' in changes ||
        'type' in changes ||
        'layoutMode' in changes ||
        'visible' in changes ||
        'locked' in changes
      )
    ) {
      return
    }

    const node = editor.graph.getNode(id)
    if (!node) return
    setItems((prev) => {
      const next = replaceLayerNode(prev, nodeToLayerNode(node))
      return next ?? prev
    })
  }

  useEffect(() => {
    const unsubscribers = [
      editor.onEditorEvent('graph:replaced', rebuildTree),
      editor.onEditorEvent('page:changed', rebuildTree),
      editor.onEditorEvent('node:created', rebuildTree),
      editor.onEditorEvent('node:deleted', rebuildTree),
      editor.onEditorEvent('node:reparented', rebuildTree),
      editor.onEditorEvent('node:reordered', rebuildTree),
      editor.onEditorEvent('node:updated', patchLayerNode)
    ]
    return () => {
      for (const off of unsubscribers) off()
    }
  }, [editor, rebuildTree])

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
      queueMicrotask(() => {
        rowRefs.current.get(first)?.scrollIntoView({ block: 'nearest' })
      })
    }
  }, [selectedIds, editor])

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
    const idx = expanded.indexOf(id)
    if (idx !== -1) {
      setExpanded(expanded.filter((e) => e !== id))
    } else {
      expandNode(id)
    }
  }

  const ctx = {
    editor,
    items,
    expanded,
    treeVersion,
    selectedIds,
    indentPerLevel,
    draggingId,
    instruction,
    instructionTargetId,
    setupDrag: setupItem,
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
  }

  const slotProps: LayerTreeRootSlotProps = {
    items,
    expanded,
    treeVersion,
    selectedIds,
    draggingId,
    instruction,
    instructionTargetId,
    actions: { select, toggleExpand }
  }

  return (
    <LayerTreeContextProvider value={ctx}>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {typeof children === 'function' ? children(slotProps) : children}
      </div>
    </LayerTreeContextProvider>
  )
}
