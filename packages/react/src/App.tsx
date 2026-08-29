import { useMemo, useRef } from 'react'
import { Link, Navigate, Route, Routes } from 'react-router-dom'

import { createEditor } from '@open-pencil/core/editor'
import { OpenPencilProvider, useCanvas, useEditor } from '@open-pencil/react'

function CanvasSurface() {
  const editor = useEditor()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useCanvas(canvasRef, editor)
  return <canvas ref={canvasRef} className="canvas" />
}

function createDemoEditor() {
  const editor = createEditor()
  editor.createShape('FRAME', 100, 100, 640, 400)
  editor.createShape('RECTANGLE', 180, 180, 240, 140)
  editor.createShape('ELLIPSE', 500, 250, 120, 120)
  editor.zoomToFit()
  return editor
}

export function App() {
  const editor = useMemo(() => createDemoEditor(), [])
  return (
    <Routes>
      <Route
        path="/"
        element={
          <main className="route-home">
            <h1>OpenPencil React Example</h1>
            <p>React Router is ready. Open the editor route to render the canvas.</p>
            <Link className="route-link" to="/editor">
              Go to editor
            </Link>
          </main>
        }
      />
      <Route
        path="/editor"
        element={
          <OpenPencilProvider editor={editor}>
            <main className="app">
              <CanvasSurface />
            </main>
          </OpenPencilProvider>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
