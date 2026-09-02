# @open-pencil/react

Headless React SDK for building OpenPencil-powered editors.

`@open-pencil/react` sits on top of `@open-pencil/core` and provides:

- React editor injection via `EditorProvider` / `useEditor()`
- canvas integration via `useCanvas()`, `useCanvasInput()`, and `useTextEdit()`
- selection, command, panel, variables, and i18n hooks
- headless structural primitives like `CanvasRoot`, `LayerTreeRoot`, `PageListRoot`, and `ToolbarRoot`

The SDK is headless by design: it provides logic and structure, while your app owns styling and product-specific UI.

## Install

```bash
bun add @open-pencil/react @open-pencil/core canvaskit-wasm react react-dom
```

## Quick start

```tsx
import { createRoot } from 'react-dom/client'
import { createEditor } from '@open-pencil/core/editor'
import { CanvasRoot, EditorProvider } from '@open-pencil/react'

const editor = createEditor({
  width: 1200,
  height: 800
})

editor.createShape('RECTANGLE', 100, 100, 200, 150)
editor.zoomToFit()

createRoot(document.getElementById('root')!).render(
  <EditorProvider editor={editor}>
    <div className="h-screen">
      <CanvasRoot>{({ canvasRef }) => <canvas ref={canvasRef} className="size-full" />}</CanvasRoot>
    </div>
  </EditorProvider>
)
```

## Core concepts

### Editor context

Wrap your tree with `EditorProvider` once near the top.

```tsx
import { EditorProvider } from '@open-pencil/react'
import type { Editor } from '@open-pencil/core/editor'

interface EditorShellProps {
  editor: Editor
  children: React.ReactNode
}

export function EditorShell({ editor, children }: EditorShellProps) {
  return <EditorProvider editor={editor}>{children}</EditorProvider>
}
```

Read it anywhere below with `useEditor()`.

```ts
import { useEditor } from '@open-pencil/react'

const editor = useEditor()
```

### Canvas wiring

At the hook level, the main canvas APIs are:

- `useCanvas()`
- `useCanvasInput()`
- `useTextEdit()`

If you want SDK-provided structure, use headless primitives like `CanvasRoot` and `CanvasSurface`.

### Headless primitives

Main structural primitives include:

- `CanvasRoot`
- `LayerTreeRoot`
- `PageListRoot`
- `PropertyListRoot`
- `PropertySectionRoot`
- `SegmentedControlRoot`
- `ToolbarRoot`
- `ColorPickerRoot`
- `FillPickerRoot`
- `FontPickerRoot`
- `NumberFieldRoot` / `NumberFieldInput` / `NumberFieldValue`
- `BindableValueRoot` / `BindableValueTrigger` / `BindableValuePicker`

These components coordinate structure and state, but do not impose app styling. Vue-style scoped slots are expressed as **render props** (`children={(props) => ...}`).

`NumberField` adds pointer scrubbing, Arrow-key stepping, mixed/bound state attributes, and safe arithmetic expressions such as `+10`, `*2`, `50%`, and `12*8+4`. `BindableValue` composes fields with a generic `BindingProvider` and supports detach-on-edit, read-only, and edit-variable policies. Focusing a bound NumberField is non-destructive; the configured policy begins only on the first value mutation. `AppearanceControlsRoot` exposes selection-derived independent-corner presentation state so consumers do not need parallel expansion heuristics. `PropertyListRoot` is controlled and editor-agnostic; OpenPencil panels connect it to selection and undo through `useEditorPropertyList()`.

## Public API tiers

### Core API

These are the main APIs most SDK consumers should start with.

#### Context and canvas

- `EditorProvider()` / `useEditor()`
- `useCanvas()`
- `useCanvasInput()`
- `useTextEdit()`

#### Selection and commands

- `useSelectionState()`
- `useSelectionCapabilities()`
- `useEditorCommands()`
- `useMenuModel()`

#### Property panels

- `usePosition()`
- `useLayout()`
- `useAppearance()`
- `useMask()`
- `useTypography()`
- `useExport()`
- `useFillControls()`
- `useStrokeControls()`
- `useEffectsControls()`

#### Variables, navigation, and localization

- `useVariablesEditor()`
- `usePageList()`
- `useI18n()`

#### Headless primitives

- `CanvasRoot`
- `LayerTreeRoot`
- `PageListRoot`
- `PropertyListRoot`
- `PropertyListItem`
- `PropertyListAdd` / `PropertyListRemove` / `PropertyListVisibility`
- `PropertySectionRoot` / `PropertySectionHeader` / `PropertySectionTitle`
- `PropertySectionActions` / `PropertySectionContent` / `PropertySectionEmptyAction`
- `SegmentedControlRoot` / `SegmentedControlItem`
- `ToolbarRoot`
- `NumberFieldRoot`
- `NumberFieldInput`
- `NumberFieldValue`
- `NumberFieldLeading`
- `NumberFieldUnit`
- `NumberFieldTrailing`
- `NumberFieldMenu`
- `BindableValueRoot`
- `BindableValueTrigger`
- `BindableValuePicker`

### Advanced API

These exports are intentionally public, but they are lower-level or more specialized.

- `useNodeProps()`
- `useEditorPropertyList()`
- `useSceneComputed()`
- `useColorVariableBinding()`
- `provideBindingProvider()`
- `useBindingProvider()`
- `useNumberBindingProvider()`
- `useFillPicker()`
- `useGradientStops()`
- `useFontPicker()`
- `useOkHCL()`
- `useVariables()`
- `useVariablesDialogState()`
- `useVariablesTable()`
- `usePropScrub()`
- `useLayerDrag()`
- `useInlineRename()`
- `useToolbarState()`
- `useNodeFontStatus()`
- `useCanvasDrop()`
- `extractImageFilesFromClipboard()`
- `useViewportKind()`
- `toolCursor()`

### Primitive context helpers and low-level stores

These are mostly useful when extending SDK primitives rather than building from top-level hooks.

- `useCanvasContext()`
- `useLayerTree()`
- `useToolbar()`
- `usePropertyList()`
- `useNumberField()`
- `locale`
- `localeSetting`
- `setLocale()`
- `AVAILABLE_LOCALES`
- `LOCALE_LABELS`

## Example patterns

### Read selection state

```ts
import { useSelectionState } from '@open-pencil/react'

const { hasSelection, selectedCount, selectedNode } = useSelectionState()
```

### Build a menu

```ts
import { useMenuModel } from '@open-pencil/react'

const { appMenu, canvasMenu } = useMenuModel()
```

### Build a page list

```tsx
import { PageListRoot } from '@open-pencil/react'

export function Pages() {
  return (
    <PageListRoot>
      {({ pages, currentPageId, switchPage }) => (
        <ul>
          {pages.map((page) => (
            <li key={page.id}>
              <button data-active={page.id === currentPageId} onClick={() => switchPage(page.id)}>
                {page.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </PageListRoot>
  )
}
```

## Documentation

For fuller guides and API docs, see the documentation site:

- `packages/docs/programmable/sdk/`

## Migration from Vue

See the repo-root [`MIGRATION.md`](../../MIGRATION.md) for the Vue → React mapping tables, state-management rationale, and non-1:1 trade-offs.
