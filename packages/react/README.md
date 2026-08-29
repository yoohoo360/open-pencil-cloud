# @open-pencil/react

Headless React SDK for building OpenPencil-powered editors with Vite.

## Install

```sh
bun add @open-pencil/react @open-pencil/core canvaskit-wasm react react-dom
```

## Quick start

```tsx
import { useRef } from 'react'
import { createEditor } from '@open-pencil/core/editor'
import { OpenPencilProvider, useCanvas, useEditor } from '@open-pencil/react'

const editor = createEditor()

function Surface() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scopedEditor = useEditor()
  useCanvas(canvasRef, scopedEditor)
  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
}

export function App() {
  return (
    <OpenPencilProvider editor={editor}>
      <div style={{ width: '100vw', height: '100vh' }}>
        <Surface />
      </div>
    </OpenPencilProvider>
  )
}
```

## Package scripts

- `bun run dev` — run the included Vite React demo app in this package root
- `bun run typecheck` — type-check package source
- `bun run build` — build dist bundle and declaration files
- `bun run smoke:dist` — import built dist and assert public API
- `bun run check` — run typecheck, build, and dist smoke
