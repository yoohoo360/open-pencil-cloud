---
title: SDK Getting Started
description: Set up @open-pencil/react with createEditor, EditorProvider, and a canvas.
---

# SDK Getting Started

## Installation

```bash
bun add @open-pencil/core @open-pencil/react canvaskit-wasm react react-dom
```

The SDK lives in the monorepo today and is also published as `@open-pencil/react`.

```ts
import { createEditor } from '@open-pencil/core/editor'
import { EditorProvider, useCanvas } from '@open-pencil/react'
```

## Mental model

There are three layers:

1. `@open-pencil/core` — framework-agnostic editor engine
2. `@open-pencil/react` — React hooks and headless primitives
3. your app — styling, routing, file flows, product-specific UI

## Minimal setup

### 1. Create an editor

```ts
import { createEditor } from '@open-pencil/core/editor'

const editor = createEditor({
  width: 1200,
  height: 800
})
```

### 2. Provide it to React

```tsx
import { EditorProvider } from '@open-pencil/react'
import type { Editor } from '@open-pencil/core/editor'
import type { ReactNode } from 'react'

export function EditorShell({ editor, children }: { editor: Editor; children: ReactNode }) {
  return <EditorProvider editor={editor}>{children}</EditorProvider>
}
```

### 3. Attach a canvas

```tsx
import { useRef } from 'react'
import { CanvasRoot, useCanvas, useEditor } from '@open-pencil/react'

export function EditorCanvas() {
  const editor = useEditor()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  useCanvas(canvasRef, editor)

  return (
    <CanvasRoot>
      {({ canvasRef: rootRef }) => (
        <canvas ref={rootRef ?? canvasRef} className="size-full" />
      )}
    </CanvasRoot>
  )
}
```

## Next steps

- Browse headless primitives under API Reference
- Wire commands with `useEditorCommands()`
- Build property panels with `usePosition`, `useLayout`, `useFillControls`, and friends
