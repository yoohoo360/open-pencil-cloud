import { createBrowserRouter } from 'react-router'

import { EditorView } from './views/EditorView'

export const router = createBrowserRouter([
  { path: '/', element: <EditorView /> },
  { path: '/demo', element: <EditorView isDemo /> },
  { path: '/share/:roomId', element: <EditorView /> }
])
