import { nodeIcon } from '#react/app/editor/icons'
import { useEditorStore } from '#react/app/editor/store'
import { CanvasMenu } from '#react/components/canvas/CanvasMenu'
import { DropIndicator } from '#react/components/LayerTree/DropIndicator'
import { useLayerDrag } from '#react/components/LayerTree/useLayerDrag'
import { useOverlayScrollbar } from '#react/internal/overlay-scrollbar/use'
import { useSceneComputed } from '#react/internal/scene-computed/use'
import theme from '#react/theme/layer-tree'
import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { tv } from 'tailwind-variants'

const INDENT_PER_LEVEL = 16

function LayerRow({
  id,
  depth,
  draggingId,
  instruction,
  instructionTargetId,
  setupItem
}: {
  id: string
  depth: number
  draggingId: string | null
  instruction: ReturnType<typeof useLayerDrag>['instruction']
  instructionTargetId: string | null
  setupItem: ReturnType<typeof useLayerDrag>['setupItem']
}) {
  const store = useEditorStore()
  const node = useSceneComputed(() => store.graph.getNode(id) ?? null)
  const children = useSceneComputed(() =>
    store.graph.getChildren(id).filter((child) => !child.internalOnly)
  )
  const renaming = store.state.renameNodeId === id
  const rowRef = useRef<HTMLDivElement>(null)
  const hasChildren = children.length > 0
  const level = depth + 1

  useEffect(
    () => setupItem(rowRef.current, { id, level, hasChildren }),
    [hasChildren, id, level, setupItem]
  )

  if (!node) return null
  const selected = store.state.selectedIds.has(id)
  const Icon = nodeIcon(node)
  const childDropTarget = instructionTargetId === id && instruction?.type === 'make-child'
  const styles = tv(theme)({
    selected,
    dragging: draggingId === id,
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
        data-test-id="layers-item"
        data-slot="row"
        data-node-id={id}
        data-selected={selected || undefined}
        data-dragging={draggingId === id || undefined}
        data-drop-position={childDropTarget ? 'child' : undefined}
        className={styles.row()}
        style={{ paddingLeft: `${depth * INDENT_PER_LEVEL}px` }}
        onClick={() => store.select([id])}
      >
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
      {children.map((child) => (
        <LayerRow
          key={child.id}
          id={child.id}
          depth={depth + 1}
          draggingId={draggingId}
          instruction={instruction}
          instructionTargetId={instructionTargetId}
          setupItem={setupItem}
        />
      ))}
    </div>
  )
}

export function LayerTree({ className }: { className?: string }) {
  const store = useEditorStore()
  const children = useSceneComputed(() =>
    store.graph.getChildren(store.state.currentPageId).filter((child) => !child.internalOnly)
  )
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const scrollRef = useOverlayScrollbar<HTMLDivElement>()
  const { draggingId, instruction, instructionTargetId, setupItem } = useLayerDrag(
    store,
    INDENT_PER_LEVEL
  )

  function onContextMenu(event: MouseEvent) {
    event.preventDefault()
    const target = event.target
    if (!(target instanceof Element)) return
    const row = target.closest('[data-node-id]')
    const id = row instanceof HTMLElement ? row.dataset.nodeId : undefined
    if (id && !store.state.selectedIds.has(id)) store.select([id])
    setContextMenu({ x: event.clientX, y: event.clientY })
  }

  return (
    <div
      ref={scrollRef}
      data-test-id="layers-tree"
      className={`scrollbar-overlay min-h-0 flex-1 overflow-y-auto px-1 pb-2 ${className ?? ''}`}
      onContextMenu={onContextMenu}
    >
      {children.map((child) => (
        <LayerRow
          key={child.id}
          id={child.id}
          depth={0}
          draggingId={draggingId}
          instruction={instruction}
          instructionTargetId={instructionTargetId}
          setupItem={setupItem}
        />
      ))}
      {contextMenu ? (
        <CanvasMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)} />
      ) : null}
    </div>
  )
}
