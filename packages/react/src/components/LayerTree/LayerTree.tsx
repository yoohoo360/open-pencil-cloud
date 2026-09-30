import { isSidebarTreeLoading } from '#react/app/document/page-loading/controller'
import { nodeIcon } from '#react/app/editor/icons'
import { useEditorStoreApi, type EditorStore } from '#react/app/editor/store'
import { CanvasMenu } from '#react/components/canvas/CanvasMenu'
import { DropIndicator } from '#react/components/LayerTree/DropIndicator'
import {
  ancestorIdsToExpand,
  collectVisibleLayerIds,
  layerChildren,
  layerSelectionForTarget,
  layerSelectionModeFromEvent,
  type LayerSelectionMode
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
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type MouseEvent
} from 'react'
import { tv } from 'tailwind-variants'

const styles = tv(theme)()

const INDENT_PER_LEVEL = 16

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

/** Scroll so the row sits near the middle of the tree viewport. */
function scrollRowIntoContainer(container: HTMLElement, row: HTMLElement) {
  const containerRect = container.getBoundingClientRect()
  const rowRect = row.getBoundingClientRect()
  const rowCenter = rowRect.top + rowRect.height / 2
  const viewCenter = containerRect.top + containerRect.height / 2
  container.scrollTop += rowCenter - viewCenter
}

const LayerRow = memo(function LayerRow({
  id,
  depth,
  expandedIds,
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
  expandedIds: ReadonlySet<string>
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
  const children = layerChildren(store.graph, id)
  const rowRef = useRef<HTMLDivElement>(null)
  const hasChildren = children.length > 0
  const expanded = hasChildren && expandedIds.has(id)
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
    <div>
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
        style={{ paddingLeft: `${depth * INDENT_PER_LEVEL}px` }}
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
      {expanded
        ? children.map((child) => (
            <LayerRow
              key={child.id}
              id={child.id}
              depth={depth + 1}
              expandedIds={expandedIds}
              focusedId={focusedId}
              selectedIds={selectedIds}
              selectedKey={selectedKey}
              renameNodeId={renameNodeId}
              sceneVersion={sceneVersion}
              draggingId={draggingId}
              instruction={instruction}
              instructionTargetId={instructionTargetId}
              setupItem={setupItem}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
            />
          ))
        : null}
    </div>
  )
})

/**
 * Layer tree rebuilds are transition-priority so canvas paints / tools stay ahead
 * of mounting or diffing large layer rows after scene mutations.
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
  // Defer layer rebuild when leaving loading so the first canvas paint wins
  // the main thread over mounting dozens of top-level rows.
  const layersBlocked = useDeferredValue(loading) || loading

  const liveSceneKey = useSyncExternalStore(
    store.subscribe,
    () => sceneSnapshot(store),
    () => 'ssr'
  )
  const [view, setView] = useState(() => readTreeView(store))
  useEffect(() => {
    startTransition(() => {
      setView(readTreeView(store))
    })
  }, [liveSceneKey, store])

  const pageId = view.pageId
  const children = layersBlocked ? [] : layerChildren(store.graph, pageId)
  const selectedIds = view.selectedIds
  const selectedKey = view.selectedKey
  const renameNodeId = view.renameNodeId
  const sceneVersion = view.sceneVersion

  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set())
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [revealToken, setRevealToken] = useState(0)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
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

  // Drop expand state on page change so we only mount top-level rows after a switch.
  useEffect(() => {
    setExpandedIds(new Set())
    setFocusedId(null)
    anchorId.current = null
    focusId.current = null
  }, [pageId])

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

  // After paint: expand/scroll must not block canvas frames.
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
    const id = focusedId
    const scroll = () => {
      const container = treeRef.current
      const row = container?.querySelector(`[data-node-id="${CSS.escape(id)}"]`)
      if (container && row instanceof HTMLElement) scrollRowIntoContainer(container, row)
      return Boolean(container && row)
    }
    if (scroll()) return
    const frame = requestAnimationFrame(() => {
      scroll()
    })
    return () => cancelAnimationFrame(frame)
  }, [focusedId, expandedIds, layersBlocked, revealToken])

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

  return (
    <div
      ref={setTreeRef}
      role="tree"
      tabIndex={0}
      data-test-id="layers-tree"
      data-loading={layersBlocked ? 'true' : undefined}
      className={`scrollbar-overlay min-h-0 flex-1 overflow-y-auto px-1 pb-2 outline-none ${className ?? ''}`}
      onContextMenu={layersBlocked ? undefined : onContextMenu}
      onKeyDown={layersBlocked ? undefined : onTreeKeyDown}
    >
      {layersBlocked ? (
        <div
          data-test-id="layers-loading"
          className="flex items-center justify-center px-2 py-6 text-[11px] text-muted"
        >
          {panels.loading}
        </div>
      ) : (
        children.map((child) => (
          <LayerRow
            key={child.id}
            id={child.id}
            depth={0}
            expandedIds={expandedIds}
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
        ))
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
