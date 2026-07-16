import * as ContextMenu from '@radix-ui/react-context-menu'
import { useEffect } from 'react'

import { CanvasMenu } from '@/react_app/menus/CanvasMenu'
import { EditorBridge } from '@/react_app/shell/EditorBridge'
import {
  CanvasRoot,
  toolCursor,
  useCanvasContext,
  useCanvasDrop,
  useCanvasInput,
  useEditor,
  useEditorVersion,
  useTextEdit
} from '@open-pencil/react'

import type { Editor } from '@open-pencil/core/editor'

type AppEditor = Editor & {
  state: Editor['state'] & {
    loading: boolean
    cursorCanvasX: number
    cursorCanvasY: number
  }
  selectAtPoint: (cx: number, cy: number) => void
}

export interface EditorCanvasCollab {
  updateCursor: (cx: number, cy: number, pageId: string) => void
  updateSelection: (ids: string[]) => void
}

function EditorCanvasInner({ collab }: { collab?: EditorCanvasCollab | null }) {
  const store = useEditor() as AppEditor
  useEditorVersion()
  const { canvasRef, hitTestSectionTitle, hitTestComponentLabel, hitTestFrameTitle } =
    useCanvasContext()

  const { cursorOverride } = useCanvasInput(
    canvasRef,
    store,
    hitTestSectionTitle,
    hitTestComponentLabel,
    hitTestFrameTitle,
    (cx, cy) => {
      store.state.cursorCanvasX = cx
      store.state.cursorCanvasY = cy
      collab?.updateCursor(cx, cy, store.state.currentPageId)
    }
  )

  useTextEdit(canvasRef, store)
  const { isDraggingOver } = useCanvasDrop(canvasRef, store)

  useEffect(() => {
    collab?.updateSelection([...store.state.selectedIds])
  }, [collab, store.state.selectedIds])

  const cursor = toolCursor(store.state.activeTool, cursorOverride)

  function onContextMenu(e: React.MouseEvent) {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const { x: cx, y: cy } = store.screenToCanvas(e.clientX - rect.left, e.clientY - rect.top)
    store.selectAtPoint(cx, cy)
  }

  return (
    <ContextMenu.Root modal={false}>
      <ContextMenu.Trigger asChild onContextMenu={onContextMenu}>
        <div
          data-test-id="canvas-area"
          className="canvas-area relative min-h-0 min-w-0 flex-1 overflow-hidden"
        >
          <canvas
            ref={canvasRef}
            data-test-id="canvas-element"
            style={{ cursor }}
            className="block size-full touch-none"
          />
          {isDraggingOver ? (
            <div className="pointer-events-none absolute inset-0 z-40 border-2 border-dashed border-accent/60 bg-accent/5" />
          ) : null}
          {store.state.loading ? (
            <div
              data-test-id="canvas-loading"
              className="absolute inset-0 z-50 flex items-center justify-center bg-canvas"
            >
              <svg
                className="size-8 text-white opacity-40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15.232 5.232 3.536 3.536m-2.036-5.036a2.5 2.5 0 0 1 3.536 3.536L6.5 21.036H3v-3.572L16.732 3.732Z" />
              </svg>
              <div className="absolute bottom-1/2 left-1/2 h-0.5 w-25 -translate-x-1/2 translate-y-10 overflow-hidden rounded-full bg-white/8">
                <div className="h-full w-2/5 animate-[slide_1s_ease-in-out_infinite] rounded-full bg-white/25" />
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
}

export function EditorCanvas({
  editor,
  collab
}: {
  editor: Editor
  collab?: EditorCanvasCollab | null
}) {
  return (
    <EditorBridge editor={editor}>
      <CanvasRoot
        onReady={() => {
          const loader = document.getElementById('loader')
          if (loader) {
            loader.classList.add('fade-out')
            setTimeout(() => loader.remove(), 300)
          }
        }}
      >
        <EditorCanvasInner collab={collab} />
      </CanvasRoot>
    </EditorBridge>
  )
}
