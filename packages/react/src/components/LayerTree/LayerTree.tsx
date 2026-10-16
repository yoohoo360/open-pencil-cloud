import { isSidebarTreeLoading } from '#react/app/document/page-loading/controller'
import { nodeIcon } from '#react/app/editor/icons'
import { useEditorStoreApi, type EditorStore } from '#react/app/editor/store'
import { CanvasMenu } from '#react/components/canvas/CanvasMenu'
import { DropIndicator } from '#react/components/LayerTree/DropIndicator'
import {
  ancestorIdsToExpand,
  collectVisibleLayerIds,
  collectVisibleLayerRows,
  layerChildren,
  layerSelectionForTarget,
  layerSelectionModeFromEvent,
  type LayerSelectionMode,
  type VisibleLayerRow
} from '#react/components/LayerTree/model'
import { useLayerDrag } from '#react/components/LayerTree/useLayerDrag'
import { useI18n } from '#react/i18n'
import { useOverlayScrollbar } from '#react/internal/overlay-scrollbar/use'
import theme from '#react/theme/layer-tree'
import { ChevronRight } from 'lucide-react'
import {
  memo,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type MouseEvent,
  type UIEvent
} from 'react'
import { tv } from 'tailwind-variants'

const styles = tv(theme)()

/** Must match Vue `LAYER_TREE_ROW_HEIGHT` for virtual offsets. */
const ROW_HEIGHT = 24
const INDENT_PER_LEVEL = 16
const VIRTUAL_OVERSCAN = 8

type LayerTreeView = {
  sceneVersion: number
  pageId: string
  selectedIds: ReadonlySet<string>
  selectedKey: string
  renameNodeId: string | null
}

function loadingSnapshot(store: EditorStore) {
  return `${store.state.loading}:${store.state.pageLoading.visible}:${store.state.pageLoading.detail ?? ''}`
}

function sceneSnapshot(store: EditorStore) {
  return `${store.state.sceneVersion}:${store.state.currentPageId}:${[...store.state.selectedIds].join(',')}:${store.state.renameNodeId ?? ''}`
}

function readTreeView(store: EditorStore): LayerTreeView {
  const selectedIds = store.state.selectedIds
  return {
    sceneVersion: store.state.sceneVersion,
    pageId: store.state.currentPageId,
    selectedIds,
    selectedKey: [...selectedIds].join(','),
    renameNodeId: store.state.renameNodeId
  }
}

function scheduleIdle(callback: () => void): () => void {
  if (typeof window === 'undefined') {
    callback()
    return () => undefined
  }
  const ric = window.requestIdleCallback?.bind(window)
  if (ric) {
    const handle = ric(() => callback(), { timeout: 2_000 })
    return () => window.cancelIdleCallback?.(handle)
  }
  const handle = window.setTimeout(callback, 0)
  return () => window.clearTimeout(handle)
}

const LayerRow = memo(function LayerRow({
  id,
  depth,
  hasChildren,
  expanded,
  focusedId,
  selectedIds,
  selectedKey,
  renameNodeId,
  sceneVersion,
  draggingId,
  instruction,
  instructionTargetId,
  setupItem,
  onSelect,
  onToggleExpand
}: {
  id: string
  depth: number
  hasChildren: boolean
  expanded: boolean
  focusedId: string | null
  selectedIds: ReadonlySet<string>
  selectedKey: string
  renameNodeId: string | null
  sceneVersion: number
  draggingId: string | null
  instruction: ReturnType<typeof useLayerDrag>['instruction']
  instructionTargetId: string | null
  setupItem: ReturnType<typeof useLayerDrag>['setupItem']
  onSelect: (id: string, mode: LayerSelectionMode) => void
  onToggleExpand: (id: string) => void
}) {
  const store = useEditorStoreApi()
  const { panels } = useI18n()
  // Parent invalidates via deferred sceneVersion — no per-row canvas subscriptions.
  void sceneVersion
  void selectedKey
  const node = store.graph.getNode(id) ?? null
  const rowRef = useRef<HTMLDivElement>(null)
  const level = depth + 1
  const selected = selectedIds.has(id)
  const renaming = renameNodeId === id

  useEffect(
    () => setupItem(rowRef.current, { id, level, hasChildren, expanded }),
    [expanded, hasChildren, id, level, setupItem]
  )

  if (!node) return null
  const currentNode = node
  const Icon = nodeIcon(currentNode)
  const childDropTarget = instructionTargetId === id && instruction?.type === 'make-child'

  function commitRename(value: string) {
    const name = value.trim()
    if (name && name !== currentNode.name) store.renameNode(id, name)
    store.state.renameNodeId = null
    store.notify()
  }

  function onRenameKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      commitRename(event.currentTarget.value)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      store.state.renameNodeId = null
      store.notify()
    }
  }

  return (
    <div
      ref={rowRef}
      role="treeitem"
      aria-level={level}
      aria-selected={selected}
      aria-expanded={hasChildren ? expanded : undefined}
      data-test-id="layers-item"
      data-slot="row"
      data-node-id={id}
      data-focused={focusedId === id || undefined}
      data-selected={selected || undefined}
      data-expanded={expanded || undefined}
      data-dragging={draggingId === id || undefined}
      data-drop-position={childDropTarget ? 'child' : undefined}
      className={styles.row()}
      style={{
        height: ROW_HEIGHT,
        boxSizing: 'border-box',
        paddingLeft: `${depth * INDENT_PER_LEVEL}px`
      }}
      onClick={(event) => onSelect(id, layerSelectionModeFromEvent(event))}
    >
      {hasChildren ? (
        <button
          type="button"
          data-slot="disclosure"
          data-expanded={expanded || undefined}
          aria-label={expanded ? panels.collapseLayer : panels.expandLayer}
          className={styles.disclosure()}
          onClick={(event) => {
            event.stopPropagation()
            onToggleExpand(id)
          }}
        >
          <ChevronRight className="size-3" />
        </button>
      ) : (
        <span data-slot="disclosure-placeholder" className={styles.disclosurePlaceholder()} />
      )}
      <Icon data-slot="icon" className={styles.icon()} />
      {renaming ? (
        <input
          autoFocus
          data-test-id="layers-item-input"
          defaultValue={currentNode.name}
          className="min-w-0 flex-1 cursor-text rounded border border-accent bg-transparent px-0.5 text-[11px] text-surface outline-none"
          onClick={(event) => event.stopPropagation()}
          onBlur={(event) => commitRename(event.currentTarget.value)}
          onKeyDown={onRenameKeyDown}
        />
      ) : (
        <span data-slot="label" className={styles.label()}>
          {currentNode.name}
        </span>
      )}
      <DropIndicator
        active={instructionTargetId === id}
        instruction={instruction}
        level={level}
        indent={INDENT_PER_LEVEL}
      />
    </div>
  )
})

/**
 * Layer tree: idle-deferred after page load, expand-lazy children, fixed-row
 * virtual list so large pages do not mount every row.
 */
export function LayerTree({ className }: { className?: string }) {
  const store = useEditorStoreApi()
  const loadingKey = useSyncExternalStore(
    store.subscribe,
    () => loadingSnapshot(store),
    () => 'ssr'
  )
  void loadingKey
  const loading = isSidebarTreeLoading(store)

  const liveSceneKey = useSyncExternalStore(
    store.subscribe,
    // While the page overlay owns the sidebar, ignore scene churn so switchPage
    // selection/page/render notifies do not schedule layer rebuilds.
    () => (isSidebarTreeLoading(store) ? 'loading' : sceneSnapshot(store)),
    () => 'ssr'
  )
  const [view, setView] = useState(() => readTreeView(store))
  useEffect(() => {
    if (liveSceneKey === 'loading') return
    startTransition(() => {
      setView(readTreeView(store))
    })
  }, [liveSceneKey, store])

  const pageId = view.pageId
  const selectedIds = view.selectedIds
  const selectedKey = view.selectedKey
  const renameNodeId = view.renameNodeId
  const sceneVersion = view.sceneVersion

  // Wait for true idle after loading / page switch before mounting rows.
  const [idleReady, setIdleReady] = useState(false)
  useEffect(() => {
    if (loading) {
      setIdleReady(false)
      return
    }
    let cancelled = false
    const cancel = scheduleIdle(() => {
      if (!cancelled) setIdleReady(true)
    })
    return () => {
      cancelled = true
      cancel()
    }
  }, [loading, pageId])

  const layersBlocked = loading || !idleReady

  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set())
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [revealToken, setRevealToken] = useState(0)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)
  const anchorId = useRef<string | null>(null)
  const focusId = useRef<string | null>(null)
  const skipCanvasLayerFocus = useRef(false)
  const expandedIdsRef = useRef(expandedIds)
  expandedIdsRef.current = expandedIds
  const treeRef = useRef<HTMLDivElement | null>(null)
  const bindOverlayScrollbar = useOverlayScrollbar<HTMLDivElement>()
  const setTreeRef = useCallback(
    (node: HTMLDivElement | null) => {
      treeRef.current = node
      bindOverlayScrollbar(node)
    },
    [bindOverlayScrollbar]
  )
  const { panels } = useI18n()

  useEffect(() => {
    setExpandedIds(new Set())
    setFocusedId(null)
    setScrollTop(0)
    anchorId.current = null
    focusId.current = null
  }, [pageId])

  useEffect(() => {
    const node = treeRef.current
    if (!node) return
    const sync = () => setViewportHeight(node.clientHeight)
    sync()
    const observer = new ResizeObserver(sync)
    observer.observe(node)
    return () => observer.disconnect()
  }, [layersBlocked])

  const expandNode = useCallback((id: string) => {
    setExpandedIds((current) => {
      if (current.has(id)) return current
      const next = new Set(current)
      next.add(id)
      return next
    })
  }, [])

  const { draggingId, instruction, instructionTargetId, setupItem } = useLayerDrag(
    store,
    INDENT_PER_LEVEL,
    expandNode
  )

  const visibleRows = useMemo((): VisibleLayerRow[] => {
    if (layersBlocked) return []
    return collectVisibleLayerRows(store.graph, pageId, expandedIds)
  }, [expandedIds, layersBlocked, pageId, sceneVersion, store.graph])

  const totalHeight = visibleRows.length * ROW_HEIGHT
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - VIRTUAL_OVERSCAN)
  const endIndex = Math.min(
    visibleRows.length,
    Math.ceil((scrollTop + Math.max(viewportHeight, ROW_HEIGHT)) / ROW_HEIGHT) + VIRTUAL_OVERSCAN
  )
  const windowRows = visibleRows.slice(startIndex, endIndex)

  useEffect(() => {
    if (layersBlocked) return
    if (skipCanvasLayerFocus.current) {
      skipCanvasLayerFocus.current = false
      return
    }
    const ids = [...selectedIds]
    if (ids.length === 0) return
    const ancestors = ancestorIdsToExpand(store.graph, ids, pageId)
    if (ancestors.length > 0) {
      startTransition(() => {
        setExpandedIds((current) => {
          let changed = false
          const next = new Set(current)
          for (const id of ancestors) {
            if (next.has(id)) continue
            next.add(id)
            changed = true
          }
          return changed ? next : current
        })
      })
    }
    const revealId = ids.at(-1) ?? null
    if (!revealId) return
    focusId.current = revealId
    setFocusedId(revealId)
    setRevealToken((token) => token + 1)
  }, [layersBlocked, pageId, selectedIds, selectedKey, store])

  useEffect(() => {
    if (layersBlocked || !focusedId || revealToken === 0) return
    const index = visibleRows.findIndex((row) => row.id === focusedId)
    const container = treeRef.current
    if (index < 0 || !container) return
    const rowTop = index * ROW_HEIGHT
    const rowCenter = rowTop + ROW_HEIGHT / 2
    const viewCenter = container.scrollTop + container.clientHeight / 2
    if (Math.abs(rowCenter - viewCenter) < container.clientHeight / 3) return
    container.scrollTop = Math.max(0, rowCenter - container.clientHeight / 2)
  }, [focusedId, layersBlocked, revealToken, visibleRows])

  const applySelect = useCallback(
    (id: string, mode: LayerSelectionMode) => {
      const next = layerSelectionForTarget(
        collectVisibleLayerIds(store.graph, store.state.currentPageId, expandedIdsRef.current),
        store.state.selectedIds,
        anchorId.current,
        id,
        mode
      )
      if (!mode.range) anchorId.current = id
      focusId.current = id
      skipCanvasLayerFocus.current = true
      setFocusedId(id)
      store.select([...next])
      treeRef.current?.focus({ preventScroll: true })
    },
    [store]
  )

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  function onContextMenu(event: MouseEvent) {
    event.preventDefault()
    const target = event.target
    if (!(target instanceof Element)) return
    const row = target.closest('[data-node-id]')
    const id = row instanceof HTMLElement ? row.dataset.nodeId : undefined
    if (id && !store.state.selectedIds.has(id)) applySelect(id, { additive: false, range: false })
    setContextMenu({ x: event.clientX, y: event.clientY })
  }

  function currentKeyboardId(ids: string[]) {
    const focused = focusId.current
    if (focused && ids.includes(focused)) return focused
    return ids.find((id) => store.state.selectedIds.has(id)) ?? ids[0] ?? null
  }

  function onTreeKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (store.state.renameNodeId) return
    const ids = collectVisibleLayerIds(store.graph, store.state.currentPageId, expandedIdsRef.current)
    const current = currentKeyboardId(ids)
    if (!current) return
    const index = ids.indexOf(current)
    const node = store.graph.getNode(current)
    const childIds = layerChildren(store.graph, current).map((child) => child.id)
    const hasChildren = childIds.length > 0
    const expanded = expandedIdsRef.current.has(current)

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      event.stopPropagation()
      const nextIndex = event.key === 'ArrowDown' ? index + 1 : index - 1
      const nextId = ids[nextIndex]
      if (nextId) applySelect(nextId, layerSelectionModeFromEvent(event))
      return
    }

    if (event.key === 'Enter' || event.key === 'F2') {
      event.preventDefault()
      store.state.renameNodeId = current
      store.notify()
      return
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault()
      event.stopPropagation()
      if (hasChildren && !expanded) {
        expandNode(current)
        return
      }
      const firstChild = childIds[0]
      if (firstChild) applySelect(firstChild, { additive: false, range: false })
      return
    }

    if (event.key !== 'ArrowLeft') return
    event.preventDefault()
    event.stopPropagation()
    if (hasChildren && expanded) {
      toggleExpand(current)
      return
    }
    const parentId = node?.parentId
    if (parentId && parentId !== store.state.currentPageId)
      applySelect(parentId, { additive: false, range: false })
  }

  function onScroll(event: UIEvent<HTMLDivElement>) {
    setScrollTop(event.currentTarget.scrollTop)
  }

  return (
    <div
      ref={setTreeRef}
      role="tree"
      tabIndex={0}
      data-test-id="layers-scroll"
      data-loading={layersBlocked ? 'true' : undefined}
      className={`scrollbar-overlay min-h-0 flex-1 overflow-y-auto px-1 pb-2 outline-none ${className ?? ''}`}
      onContextMenu={layersBlocked ? undefined : onContextMenu}
      onKeyDown={layersBlocked ? undefined : onTreeKeyDown}
      onScroll={layersBlocked ? undefined : onScroll}
    >
      {layersBlocked ? (
        <div
          data-test-id="layers-loading"
          className="flex items-center justify-center px-2 py-6 text-[11px] text-muted"
        >
          {panels.loading}
        </div>
      ) : (
        <div style={{ height: totalHeight, position: 'relative' }}>
          {windowRows.map((row, offset) => {
            const index = startIndex + offset
            return (
              <div
                key={row.id}
                style={{
                  position: 'absolute',
                  top: index * ROW_HEIGHT,
                  left: 0,
                  right: 0,
                  height: ROW_HEIGHT
                }}
              >
                <LayerRow
                  id={row.id}
                  depth={row.depth}
                  hasChildren={row.hasChildren}
                  expanded={row.hasChildren && expandedIds.has(row.id)}
                  focusedId={focusedId}
                  selectedIds={selectedIds}
                  selectedKey={selectedKey}
                  renameNodeId={renameNodeId}
                  sceneVersion={sceneVersion}
                  draggingId={draggingId}
                  instruction={instruction}
                  instructionTargetId={instructionTargetId}
                  setupItem={setupItem}
                  onSelect={applySelect}
                  onToggleExpand={toggleExpand}
                />
              </div>
            )
          })}
        </div>
      )}
      {contextMenu ? (
        <CanvasMenu
          x={contextMenu.x}
          y={contextMenu.y}
          source="layers"
          onClose={() => setContextMenu(null)}
        />
      ) : null}
    </div>
  )
}
