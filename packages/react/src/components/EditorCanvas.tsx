import { formatVersionTimestamp } from '#react/app/document/version-history/format'
import { useCanvasCollaborationAwareness } from '#react/app/editor/canvas/collaboration-awareness'
import { createCanvasContextSelection } from '#react/app/editor/canvas/context-selection'
import { useEditorStore } from '#react/app/editor/store'
import { useCanvasDrop } from '#react/canvas/drop/use'
import { useCanvas } from '#react/canvas/surface/use'
import { useTextEdit } from '#react/canvas/text-edit/use'
import { useCanvasInput } from '#react/canvas/useCanvasInput'
import { CanvasMenu } from '#react/components/canvas/CanvasMenu'
import { CommentPins } from '#react/components/Comments/CommentPins'
import { useOptionalComments } from '#react/components/Comments/context'
import { useOptionalCollabPanelContext } from '#react/components/CollabPanel/context'
import { useOptionalVersionHistory } from '#react/components/VersionHistory/context'
import { toolCursor } from '#react/editor/tool-cursor'
import { useI18n } from '#react/i18n'
import { PencilLine } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'

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
  const history = useOptionalVersionHistory()
  const comments = useOptionalComments()
  const { dialogs, locale } = useI18n()
  const previewing = Boolean(store.state.historyPreviewId)
  const commenting = Boolean(comments?.open) && !previewing
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
    () => isActivePane && !previewing
  )
  useTextEdit(canvasRef, store, { isEnabled: () => isActivePane && !previewing && !commenting })
  useCanvasDrop(canvasRef, store, activatePane)

  useEffect(() => {
    if (!isActivePane) cleanupInteractions()
  }, [cleanupInteractions, isActivePane])
  useEffect(() => () => cleanupInteractions(), [cleanupInteractions])

  const cursor =
    commenting && store.state.activeTool !== 'HAND'
      ? 'crosshair'
      : toolCursor(store.state.activeTool, cursorOverride)

  function onCanvasPointerDownCapture(event: PointerEvent<HTMLDivElement>) {
    activatePane()
    if (!commenting || !comments) return
    if (event.button !== 0 || store.state.activeTool === 'HAND') return
    const target = event.target
    if (
      target instanceof Element &&
      (target.closest('[data-comment-pin]') || target.closest('textarea, input, button, [role="dialog"]'))
    ) {
      return
    }
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const world = store.screenToCanvas(event.clientX - rect.left, event.clientY - rect.top)
    event.preventDefault()
    event.stopPropagation()
    comments.startDraft(world.x, world.y)
  }

  return (
    <div
      data-test-id="canvas-area"
      data-pane-id={paneId}
      data-active-pane={isActivePane ? 'true' : 'false'}
      className="canvas-area relative min-h-0 min-w-0 flex-1 overflow-hidden"
      onPointerDownCapture={onCanvasPointerDownCapture}
      onFocusCapture={activatePane}
      onWheelCapture={activatePane}
      onDragEnterCapture={activatePane}
      onContextMenuCapture={(event) => {
        event.preventDefault()
        activatePane()
        if (previewing || commenting) return
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
      {comments?.open ? <CommentPins /> : null}
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
      {contextMenu && !previewing ? (
        <CanvasMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)} />
      ) : null}
      {previewing && history?.previewVersion ? (
        <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center">
          <div className="pointer-events-auto flex items-center gap-2 rounded-lg border border-border bg-panel px-3 py-1.5 shadow-sm">
            <span className="text-[11px] text-muted">
              {dialogs.viewingVersion({
                date: formatVersionTimestamp(history.previewVersion.created_at, locale)
              })}
            </span>
            <button
              type="button"
              className="text-[11px] font-medium text-accent hover:underline"
              onClick={() => void history.restoreSelected()}
            >
              {dialogs.restoreVersion}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
