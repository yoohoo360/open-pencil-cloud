import { useMemo } from 'react'

import { OpenPencilProvider } from '#react/editor/context'
import { EditorWorkspace } from '#react/editor/EditorWorkspace'
import { createEditorStore, EditorStoreProvider } from '#react/app/editor/store'

function createDemoStore() {
  const store = createEditorStore()
  store.createShape('FRAME', 100, 100, 640, 400)
  store.createShape('RECTANGLE', 180, 180, 240, 140)
  store.createShape('ELLIPSE', 500, 250, 120, 120)
  store.zoomToFit()
  return store
}

export default function CanvasView() {
  const store = useMemo(() => createDemoStore(), [])

  return (
    <EditorStoreProvider store={store}>
      <OpenPencilProvider editor={store}>
        <main className="flex h-full min-h-0 w-full flex-col bg-canvas">
          <EditorWorkspace />
        </main>
      </OpenPencilProvider>
    </EditorStoreProvider>
  )
}
