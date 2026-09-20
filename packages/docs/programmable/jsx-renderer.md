---
title: JSX Renderer
description: Create editable designs using the same declarative authoring library as OpenPencil agents.
---

# JSX Renderer

OpenPencil's design JSX creates scene nodes, not browser DOM. You can use readable component trees, JavaScript expressions, and reusable functions to construct editable designs.

## Creating Designs

The `render` tool accepts JSX strings in AI chat and MCP. In application or headless library code, import `Frame`, `Text`, `renderTree`, and other authoring exports from `@open-pencil/core/design-jsx`. The scripting environment determines which APIs are exposed to `eval`; package exports are not automatically globals there.

The [shared design-authoring reference](../reference/design-authoring) contains executable examples, layout guidance, and the supported syntax inventory. It is generated from the same source used by chat, ACP, codegen prompts, and the installable agent skill.

## Elements

Use frames and text for composition, shape nodes for artwork, and real components and instances for reusable editor content. A JavaScript function alone does not create component identity. See the [element inventory](../reference/design-authoring#supported-syntax-inventory).

## Style Props

Use Hug/Fill and flex or grid for content-driven sizing. Bind semantic variables instead of copying values. See [composition and layout](../reference/design-authoring#composition-and-layout), [paint and text](../reference/design-authoring#paint-text-and-artwork), and [variables and components](../reference/design-authoring#variables-and-components).

## Exporting to JSX

```sh
openpencil export design.fig -f jsx                   # OpenPencil format
openpencil export design.fig -f jsx --style tailwind  # Tailwind classes
```

Exported OpenPencil JSX can be edited and rendered back into the document. Check supported features and actual rendering before claiming round-trip fidelity. See [CLI exports](./cli/exporting).

## Visual Diffing

JSX makes structural design changes reviewable as code. Use `get_jsx` and `diff_jsx` to inspect changes, then verify the actual rendered result; a clean structural diff does not prove visual equivalence.
