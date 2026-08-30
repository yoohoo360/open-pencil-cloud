import { useCanvasCollaborationAwareness } from '#react/app/editor/canvas/collaboration-awareness'
import { createCanvasContextSelection } from '#react/app/editor/canvas/context-selection'
import { useEditorStore } from '#react/app/editor/store'
import { useOptionalCollabPanelContext } from '#react/components/CollabPanel/context'
import { useCanvasDrop } from '#react/canvas/drop/use'
import { useCanvas } from '#react/canvas/surface/use'
import { useTextEdit } from '#react/canvas/text-edit/use'
import { useCanvasInput } from '#react/canvas/useCanvasInput'
import { CanvasMenu } from '#react/components/canvas/CanvasMenu'
import { toolCursor } from '#react/editor/tool-cursor'
import { PencilLine } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export function EditorCanvas({ paneId }: { paneId?: string }) {
  const store = useEditorStore()
  const sceneCanvasRef = useRef<HTMLCanvasElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isActivePane = !paneId || store.activePaneId === paneId
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const { selectAtContextPoint } = useMemo(
    () => createCanvasContextSelection(canvasRef, store),
    [store]
  )

  const activatePane = useCallback(() => {
    if (paneId) store.setActivePane(paneId)
  }, [paneId, store])

  const getRenderState = useCallback(
    () => (paneId ? store.getPaneRenderState(paneId) : store.state),
    [paneId, store]
  )
  const onViewportResize = useCallback(
    (width: number, height: number) => {
      if (paneId) store.resizePane(paneId, width, height)
    },
    [paneId, store]
  )

  useCanvas(sceneCanvasRef, store, {
    layer: 'scene',
    showRulers: false,
    getRenderState,
    onViewportResize
  })
  const { hitTestSectionTitle, hitTestComponentLabel, hitTestFrameTitle } = useCanvas(
    canvasRef,
    store,
    {
      layer: 'overlays',
      getRenderState,
      onViewportResize
    }
  )

  const collab = useOptionalCollabPanelContext()
  const { updateCursor } = useCanvasCollaborationAwareness(store, collab)

  useEffect(() => {
    return store.onEditorEvent('selection:changed', (ids) => collab?.updateSelection(ids))
  }, [collab, store])

  const { cursorOverride, cleanupInteractions } = useCanvasInput(
    canvasRef,
    store,
    hitTestSectionTitle,
    hitTestComponentLabel,
    hitTestFrameTitle,
    updateCursor,
    activatePane,
    () => isActivePane
  )
  useTextEdit(canvasRef, store, { isEnabled: () => isActivePane })
  useCanvasDrop(canvasRef, store, activatePane)

  useEffect(() => {
    if (!isActivePane) cleanupInteractions()
  }, [cleanupInteractions, isActivePane])
  useEffect(() => () => cleanupInteractions(), [cleanupInteractions])

  const cursor = toolCursor(store.state.activeTool, cursorOverride)

  return (
    <div
      data-test-id="canvas-area"
      data-pane-id={paneId}
      data-active-pane={isActivePane ? 'true' : 'false'}
      className="canvas-area relative min-h-0 min-w-0 flex-1 overflow-hidden"
      onPointerDownCapture={activatePane}
      onFocusCapture={activatePane}
      onWheelCapture={activatePane}
      onDragEnterCapture={activatePane}
      onContextMenuCapture={(event) => {
        event.preventDefault()
        activatePane()
        selectAtContextPoint(event.nativeEvent)
        setContextMenu({ x: event.clientX, y: event.clientY })
      }}
    >
      <canvas
        ref={sceneCanvasRef}
        data-pane-id={paneId}
        data-test-id="scene-canvas-element"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 size-full outline-none"
      />
      <canvas
        ref={canvasRef}
        data-pane-id={paneId}
        data-test-id="canvas-element"
        tabIndex={-1}
        style={{ cursor }}
        className="absolute inset-0 block size-full touch-none outline-none"
      />
      {store.state.loading ? (
        <div
          data-test-id="canvas-loading"
          className="absolute inset-0 z-50 flex items-center justify-center bg-canvas"
        >
          <PencilLine className="size-8 text-surface opacity-45" />
          <div className="absolute bottom-1/2 left-1/2 h-0.5 w-25 -translate-x-1/2 translate-y-10 overflow-hidden rounded-full bg-surface/8">
            <div className="h-full w-2/5 animate-pulse rounded-full bg-surface/25" />
          </div>
        </div>
      ) : null}
      {contextMenu ? (
        <CanvasMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)} />
      ) : null}
    </div>
  )
}
