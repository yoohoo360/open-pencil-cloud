# @open-pencil/react

Headless React SDK for building OpenPencil-powered editors.

`@open-pencil/react` sits on top of `@open-pencil/core` and provides:

- React editor context via `EditorProvider` / `useEditor`
- canvas integration hooks (`useCanvas`, `useCanvasInput`, `useTextEdit`)
- selection, command, panel, variables, and i18n hooks
- headless structural primitives like `CanvasRoot`, `LayerTreeRoot`, `PageListRoot`, and `ToolbarRoot`

The SDK is headless by design: it provides logic and structure, while your app owns styling and product-specific UI.

## Install

```bash
bun add @open-pencil/react @open-pencil/core canvaskit-wasm react react-dom
```

## Quick start

```tsx
import { createEditor } from '@open-pencil/core/editor'
import { EditorProvider, CanvasRoot } from '@open-pencil/react'

const editor = createEditor({
  width: 1200,
  height: 800
})

editor.createShape('RECTANGLE', 100, 100, 200, 150)
editor.zoomToFit()

export function App() {
  return (
    <EditorProvider editor={editor}>
      <div className="h-screen">
        <CanvasRoot>{({ canvasRef }) => <canvas ref={canvasRef} />}</CanvasRoot>
      </div>
    </EditorProvider>
  )
}
```

## Migration from `@open-pencil/vue`

| Vue | React |
|-----|-------|
| `provideEditor(editor)` | `<EditorProvider editor={editor}>` |
| `useEditor()` | `useEditor()` |
| `useI18n()` | `useI18n()` |
| `v-slot` / scoped slots | render props / `children` as function |

Vue and React SDKs can coexist in the same monorepo during migration.
