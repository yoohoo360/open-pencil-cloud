import { memo } from 'react'

import { CanvasRoot, CanvasSurface, EditorProvider, createEditor } from '@open-pencil/react'

const editor = createEditor()

export const App = memo(function App() {
  return (
    <EditorProvider editor={editor}>
      <div style={{ width: '100vw', height: '100vh' }}>
        <CanvasRoot>
          <CanvasSurface style={{ width: '100%', height: '100%' }} />
        </CanvasRoot>
      </div>
    </EditorProvider>
  )
})

App.displayName = 'App'
export default App
