import { nodeIcon } from '#react/app/editor/icons'
import { useEditorStore } from '#react/app/editor/store'
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
import { useSceneComputed } from '#react/internal/scene-computed/use'
import theme from '#react/theme/layer-tree'
import { ChevronRight } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent
} from 'react'
import { tv } from 'tailwind-variants'

const INDENT_PER_LEVEL = 16

function LayerRow({
  id,
  depth,
  expandedIds,
  focusedId,
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
  draggingId: string | null
  instruction: ReturnType<typeof useLayerDrag>['instruction']
  instructionTargetId: string | null
  setupItem: ReturnType<typeof useLayerDrag>['setupItem']
  onSelect: (id: string, mode: LayerSelectionMode) => void
  onToggleExpand: (id: string) => void
}) {
  const store = useEditorStore()
  const { panels } = useI18n()
  const node = useSceneComputed(() => store.graph.getNode(id) ?? null)
  const children = useSceneComputed(() => layerChildren(store.graph, id))
  const renaming = store.state.renameNodeId === id
  const rowRef = useRef<HTMLDivElement>(null)
  const hasChildren = children.length > 0
  const expanded = hasChildren && expandedIds.has(id)
  const level = depth + 1

  useEffect(
    () => setupItem(rowRef.current, { id, level, hasChildren, expanded }),
    [expanded, hasChildren, id, level, setupItem]
  )

  useEffect(() => {
    if (focusedId !== id) return
    rowRef.current?.scrollIntoView({ block: 'nearest' })
  }, [focusedId, id])

  if (!node) return null
  const selected = store.state.selectedIds.has(id)
  const Icon = nodeIcon(node)
  const childDropTarget = instructionTargetId === id && instruction?.type === 'make-child'
  const styles = tv(theme)({
    selected,
    dragging: draggingId === id,
    expanded,
    childDropTarget
  })

  function commitRename(value: string) {
    const name = value.trim()
    if (name && name !== node.name) store.updateNodeWithUndo(id, { name }, 'Rename')
    store.state.renameNodeId = null
    store.notify()
  }

  function onRenameKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      commitRename(event.currentTarget.value)
    }
    if (event.key === 'Escape') {
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
            defaultValue={node.name}
            className="min-w-0 flex-1 cursor-text rounded border border-accent bg-transparent px-0.5 text-[11px] text-surface outline-none"
            onClick={(event) => event.stopPropagation()}
            onBlur={(event) => commitRename(event.currentTarget.value)}
            onKeyDown={onRenameKeyDown}
          />
        ) : (
          <span data-slot="label" className={styles.label()}>
            {node.name}
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
}

export function LayerTree({ className }: { className?: string }) {
  const store = useEditorStore()
  const children = useSceneComputed(() => layerChildren(store.graph, store.state.currentPageId))
  const selectedIds = useSceneComputed(() => store.state.selectedIds)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set())
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const anchorId = useRef<string | null>(null)
  const focusId = useRef<string | null>(null)
  const expandedIdsRef = useRef(expandedIds)
  expandedIdsRef.current = expandedIds
  const scrollRef = useOverlayScrollbar<HTMLDivElement>()

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

  useEffect(() => {
    const ancestors = ancestorIdsToExpand(store.graph, selectedIds, store.state.currentPageId)
    if (ancestors.length === 0) return
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
  }, [selectedIds, store])

  function visibleIds() {
    return collectVisibleLayerIds(store.graph, store.state.currentPageId, expandedIdsRef.current)
  }

  function applySelect(id: string, mode: LayerSelectionMode) {
    const next = layerSelectionForTarget(
      visibleIds(),
      store.state.selectedIds,
      anchorId.current,
      id,
      mode
    )
    if (!mode.range) anchorId.current = id
    focusId.current = id
    setFocusedId(id)
    store.select([...next])
    scrollRef.current?.focus({ preventScroll: true })
  }

  function toggleExpand(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

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
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
      return

    const ids = visibleIds()
    const current = currentKeyboardId(ids)
    if (!current) return
    const index = ids.indexOf(current)
    const node = store.graph.getNode(current)
    const childIds = node ? layerChildren(store.graph, current).map((child) => child.id) : []
    const hasChildren = childIds.length > 0
    const expanded = expandedIds.has(current)

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      const nextId = ids[event.key === 'ArrowDown' ? index + 1 : index - 1]
      if (!nextId) return
      event.preventDefault()
      event.stopPropagation()
      applySelect(nextId, layerSelectionModeFromEvent(event))
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
      ref={scrollRef}
      role="tree"
      tabIndex={0}
      data-test-id="layers-tree"
      className={`scrollbar-overlay min-h-0 flex-1 overflow-y-auto px-1 pb-2 outline-none ${className ?? ''}`}
      onContextMenu={onContextMenu}
      onKeyDown={onTreeKeyDown}
    >
      {children.map((child) => (
        <LayerRow
          key={child.id}
          id={child.id}
          depth={0}
          expandedIds={expandedIds}
          focusedId={focusedId}
          draggingId={draggingId}
          instruction={instruction}
          instructionTargetId={instructionTargetId}
          setupItem={setupItem}
          onSelect={applySelect}
          onToggleExpand={toggleExpand}
        />
      ))}
      {contextMenu ? (
        <CanvasMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)} />
      ) : null}
    </div>
  )
}
