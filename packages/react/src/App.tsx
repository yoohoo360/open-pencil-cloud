import { Link, Navigate, Route, Routes } from 'react-router-dom'

import CanvasView from './view/CanvasView'

export function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <main className="grid h-full w-full place-content-center gap-3 text-center">
            <h1 className="m-0 text-2xl text-surface">OpenPencil React Example</h1>
            <p className="m-0 text-muted">Open the editor route to render the workspace.</p>
            <Link className="text-surface underline" to="/editor">
              Go to editor
            </Link>
          </main>
        }
      />
      <Route path="/editor" element={<CanvasView />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
