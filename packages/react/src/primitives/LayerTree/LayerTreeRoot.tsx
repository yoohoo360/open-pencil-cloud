import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode
} from 'react'

import type { SceneNode } from '@open-pencil/scene-graph'

import { useEditor } from '#react/editor/context'
import {
  LayerTreeProvider,
  type LayerTreeContext,
  type LayerTreeVirtualizer
} from '#react/primitives/LayerTree/context'
import {
  buildLayerTreeModel,
  indexLayerNodes,
  layerSelectionForTarget,
  patchLayerNode,
  visibleLayerRows
} from '#react/primitives/LayerTree/model'
import { useLayerDrag } from '#react/primitives/LayerTree/useLayerDrag'

export type LayerTreeRootSlotProps = Pick<
  LayerTreeContext,
  | 'items'
  | 'expanded'
  | 'visibleRows'
  | 'treeVersion'
  | 'selectedIds'
  | 'focused'
  | 'draggingId'
  | 'instruction'
  | 'instructionTargetId'
> & { actions: Pick<LayerTreeContext, 'select' | 'toggleExpand' | 'setFocused' | 'setVirtualizer'> }

export type LayerTreeRootProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  indentPerLevel?: number
  children?: ReactNode | ((props: LayerTreeRootSlotProps) => ReactNode)
  onSelect?: (id: string, additive: boolean) => void
  onToggleExpand?: (id: string) => void
  onToggleVisibility?: (id: string) => void
  onToggleLock?: (id: string) => void
  onRename?: (id: string, name: string) => void
}

const PATCHABLE_NODE_KEYS = new Set<keyof SceneNode>([
  'name',
  'type',
  'layoutMode',
  'visible',
  'locked'
])

export const LayerTreeRoot = memo(function LayerTreeRoot({
  indentPerLevel = 16,
  children,
  onSelect,
  onToggleExpand,
  onToggleVisibility,
  onToggleLock,
  onRename,
  ...props
}: LayerTreeRootProps) {
  const editor = useEditor()
  const [items, setItems] = useState(() =>
    buildLayerTreeModel(editor.graph, editor.state.currentPageId).items
  )
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set())
  const [treeVersion, setTreeVersion] = useState(0)
  const [focused, setFocused] = useState(false)
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    () => new Set(editor.state.selectedIds)
  )
  const nodesById = useRef(indexLayerNodes(items))
  const rowRefs = useRef(new Map<string, HTMLElement>())
  const virtualizer = useRef<LayerTreeVirtualizer | null>(null)
  const selectionAnchorId = useRef<string | null>(null)
  const applyingSelection = useRef(false)
  const rebuildTree = useCallback(() => {
    const model = buildLayerTreeModel(editor.graph, editor.state.currentPageId)
    nodesById.current = model.byId
    setItems(model.items)
    setExpanded((current) => new Set([...current].filter((id) => model.byId.has(id))))
    setTreeVersion((current) => current + 1)
  }, [editor])
  const expandNode = useCallback((id: string) => {
    setExpanded((current) => (current.has(id) ? current : new Set(current).add(id)))
  }, [])
  const drag = useLayerDrag(editor, indentPerLevel, expandNode)
  const rows = useMemo(() => visibleLayerRows(items, expanded), [expanded, items])

  const scrollToNode = useCallback(
    (id: string) => {
      const index = rows.findIndex((row) => row.node.id === id)
      if (index !== -1 && virtualizer.current) {
        virtualizer.current.scrollToIndex(index, { align: 'auto' })
      } else {
        rowRefs.current.get(id)?.scrollIntoView({ block: 'nearest' })
      }
    },
    [rows]
  )

  useEffect(() => {
    const patchTreeNode = (id: string, changes: Partial<SceneNode>) => {
      if ('childIds' in changes || 'parentId' in changes) return rebuildTree()
      if (!(Object.keys(changes) as (keyof SceneNode)[]).some((key) => PATCHABLE_NODE_KEYS.has(key))) {
        return
      }
      const target = nodesById.current.get(id)
      const source = editor.graph.getNode(id)
      if (target && source && patchLayerNode(target, source)) setTreeVersion((value) => value + 1)
    }
    const onSelectionChanged = (ids: string[]) => {
      const nextExpanded = new Set(expanded)
      for (const id of ids) {
        let node = editor.graph.getNode(id)
        while (node?.parentId && node.parentId !== editor.state.currentPageId) {
          nextExpanded.add(node.parentId)
          node = editor.graph.getNode(node.parentId)
        }
      }
      setExpanded(nextExpanded)
      setSelectedIds(new Set(ids))
      if (!applyingSelection.current) selectionAnchorId.current = ids[0] ?? null
      if (ids[0]) queueMicrotask(() => scrollToNode(ids[0] as string))
    }
    const unsubscribes = [
      editor.onEditorEvent('graph:replaced', rebuildTree),
      editor.onEditorEvent('page:changed', rebuildTree),
      editor.onEditorEvent('node:created', rebuildTree),
      editor.onEditorEvent('node:deleted', rebuildTree),
      editor.onEditorEvent('node:reparented', rebuildTree),
      editor.onEditorEvent('node:reordered', rebuildTree),
      editor.onEditorEvent('node:updated', patchTreeNode),
      editor.onEditorEvent('selection:changed', onSelectionChanged)
    ]
    return () => {
      for (const unsubscribe of unsubscribes) unsubscribe()
    }
  }, [editor, expanded, rebuildTree, scrollToNode])

  const select = useCallback(
    (id: string, selection: boolean | { additive: boolean; range: boolean }) => {
      const mode = typeof selection === 'boolean' ? { additive: selection, range: false } : selection
      onSelect?.(id, mode.additive)
      const next = layerSelectionForTarget(
        rows.map((row) => row.node.id),
        selectedIds,
        selectionAnchorId.current,
        id,
        mode
      )
      if (!mode.range) selectionAnchorId.current = id
      applyingSelection.current = true
      try {
        editor.select([...next])
      } finally {
        applyingSelection.current = false
      }
      scrollToNode(id)
    },
    [editor, onSelect, rows, scrollToNode, selectedIds]
  )
  const toggleExpand = useCallback((id: string) => {
    onToggleExpand?.(id)
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [onToggleExpand])
  const context = useMemo<LayerTreeContext>(
    () => ({
      editor,
      items,
      expanded,
      visibleRows: rows,
      treeVersion,
      selectedIds,
      focused,
      indentPerLevel,
      draggingId: drag.draggingId,
      instruction: drag.instruction,
      instructionTargetId: drag.instructionTargetId,
      setupDrag: drag.setupItem,
      select,
      toggleExpand,
      setFocused,
      setVirtualizer: (value) => {
        virtualizer.current = value
      },
      toggleVisibility: (id) => {
        onToggleVisibility?.(id)
        editor.toggleNodeVisibility(id)
      },
      toggleLock: (id) => {
        onToggleLock?.(id)
        editor.toggleNodeLock(id)
      },
      rename: (id, name) => {
        onRename?.(id, name)
        editor.renameNode(id, name)
      },
      setRowRef: (id, element) => {
        if (element) rowRefs.current.set(id, element)
        else rowRefs.current.delete(id)
      }
    }),
    [drag, editor, expanded, focused, indentPerLevel, items, onRename, onToggleLock, onToggleVisibility, rows, select, selectedIds, toggleExpand, treeVersion]
  )
  const slotProps = useMemo<LayerTreeRootSlotProps>(
    () => ({
      items,
      expanded,
      visibleRows: rows,
      treeVersion,
      selectedIds,
      focused,
      draggingId: drag.draggingId,
      instruction: drag.instruction,
      instructionTargetId: drag.instructionTargetId,
      actions: { select, toggleExpand, setFocused, setVirtualizer: context.setVirtualizer }
    }),
    [context.setVirtualizer, drag.draggingId, drag.instruction, drag.instructionTargetId, expanded, focused, items, rows, select, selectedIds, setFocused, toggleExpand, treeVersion]
  )

  return (
    <LayerTreeProvider value={context}>
      <div {...props} className={props.className ?? 'flex min-h-0 flex-1 flex-col overflow-hidden'} data-slot="root">
        {typeof children === 'function' ? children(slotProps) : children}
      </div>
    </LayerTreeProvider>
  )
})

LayerTreeRoot.displayName = 'LayerTreeRoot'
