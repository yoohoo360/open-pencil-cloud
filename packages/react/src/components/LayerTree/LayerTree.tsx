import { useState, type MouseEvent } from 'react'

import { nodeIcon } from '#react/app/editor/icons'
import { useEditorStore } from '#react/app/editor/store'
import { CanvasMenu } from '#react/components/canvas/CanvasMenu'
import { useSceneComputed } from '#react/internal/scene-computed/use'

function LayerRow({ id, depth }: { id: string; depth: number }) {
  const store = useEditorStore()
  const node = useSceneComputed(() => store.graph.getNode(id) ?? null)
  const children = useSceneComputed(() => store.graph.getChildren(id))
  if (!node) return null
  const selected = store.state.selectedIds.has(id)
  const Icon = nodeIcon(node)

  return (
    <div>
      <button
        type="button"
        data-test-id="layers-item"
        data-node-id={id}
        data-selected={selected || undefined}
        className="flex w-full items-center gap-1.5 rounded px-2 py-0.5 text-left text-[11px] text-surface hover:bg-hover data-selected:bg-panel-selected-muted"
        style={{ paddingLeft: `${8 + depth * 12}px` }}
        onClick={() => store.select([id])}
      >
        <Icon className="size-3 shrink-0 text-muted" />
        <span className="truncate">{node.name}</span>
      </button>
      {children.map((child) => (
        <LayerRow key={child.id} id={child.id} depth={depth + 1} />
      ))}
    </div>
  )
}

export function LayerTree({ className }: { className?: string }) {
  const store = useEditorStore()
  const children = useSceneComputed(() => store.graph.getChildren(store.state.currentPageId))
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

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
      data-test-id="layers-tree"
      className={`min-h-0 flex-1 overflow-y-auto px-1 pb-2 ${className ?? ''}`}
      onContextMenu={onContextMenu}
    >
      {children.map((child) => (
        <LayerRow key={child.id} id={child.id} depth={0} />
      ))}
      {contextMenu ? (
        <CanvasMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)} />
      ) : null}
    </div>
  )
}
