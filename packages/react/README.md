# @open-pencil/react

Headless React 19 SDK for building OpenPencil-powered editors.

`@open-pencil/react` sits on top of `@open-pencil/core` and provides:

- React editor context via `EditorProvider` / `useEditor()`
- canvas integration via `useCanvas()`, `useCanvasInput()`, and `useTextEdit()`
- selection, command, panel, variables, and i18n hooks
- headless structural primitives like `CanvasRoot`, `LayerTreeRoot`, `PageListRoot`, and `ToolbarRoot`

The SDK is headless by design: it provides logic and structure, while your app owns styling and product-specific UI. Components use `memo` / `useMemo` for derived UI state.

## Install

```bash
bun add @open-pencil/react @open-pencil/core react react-dom canvaskit-wasm
```

## Quick start

```tsx
import { createRoot } from 'react-dom/client'
import { CanvasRoot, CanvasSurface, EditorProvider, createEditor } from '@open-pencil/react'

const editor = createEditor()

createRoot(document.getElementById('app')!).render(
  <EditorProvider editor={editor}>
    <CanvasRoot>
      <CanvasSurface style={{ width: '100%', height: '100%' }} />
    </CanvasRoot>
  </EditorProvider>
)
```

See the package `example/` directory for a runnable Vite app.
