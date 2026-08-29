import { PencilLine } from 'lucide-react'
import { useCallback, useEffect, useRef } from 'react'

import { useCanvas } from '#react/canvas/surface/use'
import { useCanvasInput } from '#react/canvas/useCanvasInput'
import { useEditorStore } from '#react/app/editor/store'
import { toolCursor } from '#react/editor/tool-cursor'

export function EditorCanvas({ paneId }: { paneId?: string }) {
  const store = useEditorStore()
  const sceneCanvasRef = useRef<HTMLCanvasElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isActivePane = !paneId || store.activePaneId === paneId

  const activatePane = useCallback(() => {
    if (paneId) store.setActivePane(paneId)
  }, [paneId, store])

  const getRenderState = paneId ? () => store.getPaneRenderState(paneId) : undefined
  const onViewportResize = paneId
    ? (width: number, height: number) => store.resizePane(paneId, width, height)
    : undefined

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

  const { cursorOverride, cleanupInteractions } = useCanvasInput(
    canvasRef,
    store,
    hitTestSectionTitle,
    hitTestComponentLabel,
    hitTestFrameTitle,
    undefined,
    activatePane,
    () => isActivePane
  )

  useEffect(() => {
    if (!isActivePane) cleanupInteractions()
  }, [cleanupInteractions, isActivePane])

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
    </div>
  )
}
