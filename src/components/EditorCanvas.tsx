import { useRef, useState, type ComponentType } from 'react'
import { AUTO_LAYOUT_PADDING_EDITOR_OFFSET_X, AUTO_LAYOUT_PADDING_EDITOR_OFFSET_Y } from '@open-pencil/core/constants'
import { ContextMenuPortal, Root as ContextMenuRoot, ContextMenuTrigger } from '@radix-ui/react-context-menu'
import { PopoverContent, PopoverPortal, Root as PopoverRoot } from '@radix-ui/react-popover'

import { toolCursor, useCanvas, useCanvasDrop, useCanvasInput, useCanvasVirtualReference, useTextEdit, useEditorEvent } from '@open-pencil/react'
import { useCollabInjected } from '@/app/collab/use'
import { useEditorStore } from '@/app/editor/active-store'
import { useCanvasCollaborationAwareness } from '@/app/editor/canvas/collaboration-awareness'
import { createCanvasContextSelection } from '@/app/editor/canvas/context-selection'
import { fadeOutGlobalLoader } from '@/app/editor/canvas/loader-overlay'

import IconLucidePanelBottom from '~icons/lucide/panel-bottom'
import IconLucidePanelLeft from '~icons/lucide/panel-left'
import IconLucidePanelRight from '~icons/lucide/panel-right'
import IconLucidePanelTop from '~icons/lucide/panel-top'
import IconLucidePencilLine from '~icons/lucide/pencil-line'

import { CanvasMenu } from './canvas/CanvasMenu'
import { NumberField } from './inputs/NumberField'

type PaddingSide = 'top' | 'right' | 'bottom' | 'left'
type PaddingEdit = { nodeId: string; side: PaddingSide; value: number; previous: number }

const paddingSideIcons: Record<PaddingSide, ComponentType<{ className?: string }>> = {
  top: IconLucidePanelTop,
  right: IconLucidePanelRight,
  bottom: IconLucidePanelBottom,
  left: IconLucidePanelLeft
}

export default function EditorCanvas() {
  const store = useEditorStore()
  const collab = useCollabInjected()

  // Mutable refs for canvas elements — no React setState in the hot path
  const sceneCanvasRefObj = useRef<{ value: HTMLCanvasElement | null }>({ value: null })
  const canvasRefObj = useRef<{ value: HTMLCanvasElement | null }>({ value: null })

  const sceneCanvasRef = sceneCanvasRefObj.current
  const canvasRef = canvasRefObj.current

  const { updateCursor } = useCanvasCollaborationAwareness(store, collab)
  const { selectAtContextPoint } = createCanvasContextSelection(canvasRef, store)

  useCanvas(sceneCanvasRef, store, {
    layer: 'scene',
    showRulers: false,
    onReady: fadeOutGlobalLoader
  })

  const { hitTestSectionTitle, hitTestComponentLabel, hitTestFrameTitle } = useCanvas(
    canvasRef,
    store,
    { layer: 'overlays' }
  )

  const canvasInput = useCanvasInput(
    canvasRef,
    store,
    hitTestSectionTitle,
    hitTestComponentLabel,
    hitTestFrameTitle,
    updateCursor
  )

  const {
    cursorOverride,
    autoLayoutPaddingEdit,
    updateAutoLayoutPaddingEdit,
    commitAutoLayoutPaddingEdit,
    cancelAutoLayoutPaddingEdit
  } = canvasInput

  useTextEdit(canvasRef, store)
  const { isDraggingOver: isDraggingOverRef } = useCanvasDrop(canvasRef, store)

  // React render state — only things that need to trigger a React re-render
  const [paddingEdit, setPaddingEdit] = useState<PaddingEdit | null>(null)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [cursor, setCursor] = useState('')
  const [isLoading, setIsLoading] = useState(store.state.loading)

  // Sync reactive refs to React state via render events
  useEditorEvent('render:requested', () => {
    const edit = autoLayoutPaddingEdit.value
    const dragging = isDraggingOverRef.value
    const newCursor = toolCursor(store.state.activeTool, cursorOverride.value)
    setPaddingEdit(edit ?? null)
    setIsDraggingOver(dragging)
    setCursor(newCursor)
    setIsLoading(store.state.loading)
  })

  useEditorEvent('repaint:requested', () => {
    const newCursor = toolCursor(store.state.activeTool, cursorOverride.value)
    setCursor(newCursor)
  })

  // Compute padding anchor for the popover virtual reference
  const paddingEditorAnchorRef = { value: (() => {
    if (!paddingEdit) return null
    const node = store.graph.getNode(paddingEdit.nodeId)
    if (!node) return null
    const abs = store.graph.getAbsolutePosition(node.id)
    if (paddingEdit.side === 'top') return { x: abs.x + node.width / 2, y: abs.y + node.paddingTop / 2 }
    if (paddingEdit.side === 'bottom') return { x: abs.x + node.width / 2, y: abs.y + node.height - node.paddingBottom / 2 }
    if (paddingEdit.side === 'left') return { x: abs.x + node.paddingLeft / 2, y: abs.y + node.height / 2 }
    return { x: abs.x + node.width - node.paddingRight / 2, y: abs.y + node.height / 2 }
  })() }

  const paddingEditorReference = useCanvasVirtualReference(canvasRef, store, paddingEditorAnchorRef)
  const PaddingIcon = paddingEdit ? paddingSideIcons[paddingEdit.side] : IconLucidePanelTop

  return (
    <ContextMenuRoot modal={false}>
      <ContextMenuTrigger asChild onContextMenu={selectAtContextPoint}>
        <div
          data-test-id="canvas-area"
          className="canvas-area relative min-h-0 min-w-0 flex-1 overflow-hidden"
        >
          <canvas
            ref={(el) => { sceneCanvasRef.value = el }}
            data-test-id="scene-canvas-element"
            aria-hidden
            className="pointer-events-none absolute inset-0 size-full outline-none"
          />
          <canvas
            ref={(el) => { canvasRef.value = el }}
            data-test-id="canvas-element"
            tabIndex={-1}
            style={{ cursor }}
            className="absolute inset-0 block size-full touch-none outline-none"
          />

          {isDraggingOver && (
            <div className="pointer-events-none absolute inset-0 z-40 border-2 border-dashed border-accent/60 bg-accent/5" />
          )}

          <PopoverRoot open={!!paddingEdit}>
            <PopoverPortal>
              {paddingEdit && paddingEditorReference.value && (
                <PopoverContent
                  side="top"
                  align="center"
                  sideOffset={AUTO_LAYOUT_PADDING_EDITOR_OFFSET_Y}
                  alignOffset={AUTO_LAYOUT_PADDING_EDITOR_OFFSET_X}
                  collisionPadding={8}
                  className="z-50 w-20 rounded-md bg-panel p-1 shadow-lg"
                  data-test-id="auto-layout-padding-editor"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      e.preventDefault()
                      cancelAutoLayoutPaddingEdit()
                    }
                  }}
                  style={{
                    position: 'fixed',
                    left: paddingEditorReference.value.getBoundingClientRect().left,
                    top: paddingEditorReference.value.getBoundingClientRect().top
                  } as React.CSSProperties}
                >
                  <NumberField
                    value={paddingEdit.value}
                    min={0}
                    step={1}
                    data-test-id="auto-layout-padding-input"
                    onChange={updateAutoLayoutPaddingEdit}
                    onCommit={(value) => commitAutoLayoutPaddingEdit(value)}
                    onEditingChange={(editing) => {
                      if (!editing && paddingEdit) commitAutoLayoutPaddingEdit(paddingEdit.value)
                    }}
                    iconSlot={<PaddingIcon className="size-3.5" />}
                  />
                </PopoverContent>
              )}
            </PopoverPortal>
          </PopoverRoot>

          {isLoading && (
            <div
              data-test-id="canvas-loading"
              className="absolute inset-0 z-50 flex items-center justify-center bg-canvas"
            >
              <IconLucidePencilLine className="size-8 text-surface opacity-45" />
              <div className="absolute bottom-1/2 left-1/2 h-0.5 w-25 -translate-x-1/2 translate-y-10 overflow-hidden rounded-full bg-surface/8">
                <div className="h-full w-2/5 animate-[slide_1s_ease-in-out_infinite] rounded-full bg-surface/25" />
              </div>
            </div>
          )}
        </div>
      </ContextMenuTrigger>

      <ContextMenuPortal>
        <CanvasMenu />
      </ContextMenuPortal>
    </ContextMenuRoot>
  )
}
