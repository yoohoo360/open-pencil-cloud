import {
  AUTO_LAYOUT_PADDING_EDITOR_OFFSET_X,
  AUTO_LAYOUT_PADDING_EDITOR_OFFSET_Y
} from '@open-pencil/core/constants'
import * as ContextMenu from '@radix-ui/react-context-menu'
import * as Popover from '@radix-ui/react-popover'
import IconLucidePanelBottom from '~icons/lucide/panel-bottom'
import IconLucidePanelLeft from '~icons/lucide/panel-left'
import IconLucidePanelRight from '~icons/lucide/panel-right'
import IconLucidePanelTop from '~icons/lucide/panel-top'
import IconLucidePencilLine from '~icons/lucide/pencil-line'
import {
  memo,
  useCallback,
  useMemo,
  useRef,
  type ComponentType,
  type MouseEvent as ReactMouseEvent
} from 'react'

import {
  toolCursor,
  useCanvas,
  useCanvasDrop,
  useCanvasInput,
  useCanvasVirtualReference,
  useSceneComputed,
  useTextEdit
} from '@open-pencil/react'
import { useCollabInjected } from '@/app/collab/use'
import { useEditorStore } from '@/app/editor/active-store'
import { useCanvasCollaborationAwareness } from '@/app/editor/canvas/collaboration-awareness'
import { createCanvasContextSelection } from '@/app/editor/canvas/context-selection'
import { fadeOutGlobalLoader } from '@/app/editor/canvas/loader-overlay'
import CanvasMenu from '@/components/canvas/CanvasMenu'
import NumberField from '@/components/inputs/NumberField'
import { useReactiveValue } from '@/shared/useVueRefValue'

const paddingSideIcons = {
  top: IconLucidePanelTop,
  right: IconLucidePanelRight,
  bottom: IconLucidePanelBottom,
  left: IconLucidePanelLeft
} satisfies Record<'top' | 'right' | 'bottom' | 'left', ComponentType>

export const EditorCanvas = memo(function EditorCanvas() {
  const store = useEditorStore()
  const collab = useCollabInjected()
  const sceneCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

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

  const {
    cursorOverride,
    autoLayoutPaddingEdit,
    updateAutoLayoutPaddingEdit,
    commitAutoLayoutPaddingEdit,
    cancelAutoLayoutPaddingEdit
  } = useCanvasInput(
    canvasRef,
    store,
    hitTestSectionTitle,
    hitTestComponentLabel,
    hitTestFrameTitle,
    updateCursor
  )

  useTextEdit(canvasRef, store)
  const { isDraggingOver } = useCanvasDrop(canvasRef, store)

  const paddingEdit = useReactiveValue(autoLayoutPaddingEdit)
  const cursorOverrideValue = useReactiveValue(cursorOverride)
  const loading = useSceneComputed(() => store.state.loading)

  const paddingEditorAnchor = useMemo(() => {
    const edit = paddingEdit
    if (!edit) return null
    const node = store.graph.getNode(edit.nodeId)
    if (!node) return null
    const abs = store.graph.getAbsolutePosition(node.id)
    if (edit.side === 'top') {
      return { x: abs.x + node.width / 2, y: abs.y + node.paddingTop / 2 }
    }
    if (edit.side === 'bottom') {
      return {
        x: abs.x + node.width / 2,
        y: abs.y + node.height - node.paddingBottom / 2
      }
    }
    if (edit.side === 'left') {
      return { x: abs.x + node.paddingLeft / 2, y: abs.y + node.height / 2 }
    }
    return {
      x: abs.x + node.width - node.paddingRight / 2,
      y: abs.y + node.height / 2
    }
  }, [paddingEdit, store.graph, store.state.sceneVersion])

  const virtualReference = useCanvasVirtualReference(canvasRef, store, paddingEditorAnchor)

  const PaddingEditorIcon = paddingEdit ? paddingSideIcons[paddingEdit.side] : IconLucidePanelTop

  const cursor = toolCursor(store.state.activeTool, cursorOverrideValue)

  const anchorRect = virtualReference?.getBoundingClientRect()

  const onContextMenu = useCallback(
    (event: ReactMouseEvent) => {
      selectAtContextPoint(event.nativeEvent)
    },
    [selectAtContextPoint]
  )

  return (
    <ContextMenu.Root modal={false}>
      <ContextMenu.Trigger asChild>
        <div
          data-test-id="canvas-area"
          className="canvas-area relative min-h-0 min-w-0 flex-1 overflow-hidden"
          onContextMenu={onContextMenu}
        >
          <canvas
            ref={sceneCanvasRef}
            data-test-id="scene-canvas-element"
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 size-full outline-none"
          />
          <canvas
            ref={canvasRef}
            data-test-id="canvas-element"
            tabIndex={-1}
            style={{ cursor }}
            className="absolute inset-0 block size-full touch-none outline-none"
          />
          {isDraggingOver ? (
            <div className="pointer-events-none absolute inset-0 z-40 border-2 border-dashed border-accent/60 bg-accent/5 transition-opacity duration-150" />
          ) : null}
          <Popover.Root open={Boolean(paddingEdit)}>
            {paddingEdit && anchorRect ? (
              <Popover.Anchor asChild>
                <span
                  aria-hidden="true"
                  className="pointer-events-none fixed size-px"
                  style={{ left: anchorRect.left, top: anchorRect.top }}
                />
              </Popover.Anchor>
            ) : null}
            <Popover.Portal>
              {paddingEdit && anchorRect ? (
                <Popover.Content
                  side="top"
                  align="center"
                  sideOffset={AUTO_LAYOUT_PADDING_EDITOR_OFFSET_Y}
                  alignOffset={AUTO_LAYOUT_PADDING_EDITOR_OFFSET_X}
                  collisionPadding={8}
                  className="z-50 w-20 rounded-md bg-panel p-1 shadow-lg"
                  data-test-id="auto-layout-padding-editor"
                  onEscapeKeyDown={(event) => {
                    event.preventDefault()
                    cancelAutoLayoutPaddingEdit()
                  }}
                  onOpenAutoFocus={(event) => event.preventDefault()}
                >
                  <NumberField
                    value={paddingEdit.value}
                    min={0}
                    step={1}
                    data-test-id="auto-layout-padding-input"
                    onValueChange={updateAutoLayoutPaddingEdit}
                    onCommit={(value: number) => commitAutoLayoutPaddingEdit(value)}
                    onEditingChange={(editing: boolean) => {
                      if (!editing && autoLayoutPaddingEdit.current) {
                        commitAutoLayoutPaddingEdit(autoLayoutPaddingEdit.current.value)
                      }
                    }}
                    icon={<PaddingEditorIcon className="size-3.5" />}
                  />
                </Popover.Content>
              ) : null}
            </Popover.Portal>
          </Popover.Root>
          {loading ? (
            <div
              data-test-id="canvas-loading"
              className="absolute inset-0 z-50 flex items-center justify-center bg-canvas transition-opacity duration-300"
            >
              <IconLucidePencilLine className="size-8 text-surface opacity-45" />
              <div className="absolute bottom-1/2 left-1/2 h-0.5 w-25 -translate-x-1/2 translate-y-10 overflow-hidden rounded-full bg-surface/8">
                <div className="h-full w-2/5 animate-[slide_1s_ease-in-out_infinite] rounded-full bg-surface/25" />
              </div>
            </div>
          ) : null}
        </div>
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <CanvasMenu />
      </ContextMenu.Portal>
    </ContextMenu.Root>
  )
})

EditorCanvas.displayName = 'EditorCanvas'
export default EditorCanvas
