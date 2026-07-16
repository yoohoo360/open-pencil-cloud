---
title: React SDK
description: Build OpenPencil-powered editors with headless React hooks and primitives.
---

# React SDK

`@open-pencil/react` exists so OpenPencil can be more than a standalone design app.

The goal is to make OpenPencil a toolkit you can embed into other products, internal tools, and workflow-specific editors — not just a single default UI.

The OpenPencil app is one composition of that toolkit. The SDK is how you build a different one.

It gives you:

- React editor context via `EditorProvider` / `useEditor`
- CanvasKit-backed canvas rendering
- selection, commands, menu, property-panel, and variables hooks
- headless structural primitives like `PageListRoot`, `PropertyListRoot`, and `ToolbarRoot`
- built-in i18n primitives for menus, panels, dialogs, and custom locale pickers

::: info Migration note
OpenPencil previously shipped `@open-pencil/vue`. That package has been replaced by `@open-pencil/react`. API names largely match (`useEditor`, `useI18n`, `CanvasRoot`, …); use `EditorProvider` instead of `provideEditor`. Some older API reference pages may still show Vue examples — prefer the React patterns below and in Getting Started.
:::

## Start here

<SdkCardGroup>
  <SdkCard title="Getting Started" to="/programmable/sdk/getting-started" description="Install the package, create an editor instance, and mount the core primitives." />
  <SdkCard title="Architecture" to="/programmable/sdk/architecture" description="See how hooks, primitives, and editor context fit together." />
  <SdkCard title="Guides" to="/programmable/sdk/guides/custom-editor-shell" description="Build custom shells, property panels, and navigation panels." />
  <SdkCard title="API Reference" to="/programmable/sdk/api/" description="Browse components, hooks, and advanced public APIs." />
</SdkCardGroup>

## Why the SDK exists

Different products and teams need different editing surfaces.

Sometimes you want a full design editor. Sometimes you want a focused canvas inside another app. Sometimes you want an internal workflow tool, a template editor, or an AI-assisted editing surface built around a narrow use case.

The SDK is the layer that makes those possible.

## Design principles

- **Headless first**: logic and structure, not app styling
- **Composable over wrapper**: use hooks when there is no meaningful structural coordination
- **Intentional public API**: stable exports from `packages/react/src/index.ts`
- **Framework-aware**: React integration over `@open-pencil/core`

## How to think about the package

The SDK has two main layers:

1. **Hooks** for editor state and actions
2. **Headless primitives** for structure that needs coordination (canvas root, trees, toolbars)

Your app owns styling, layout chrome, and product-specific behavior.
