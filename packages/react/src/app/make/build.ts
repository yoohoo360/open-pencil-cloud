import type { SceneGraph } from '@open-pencil/scene-graph'

import { buildMakeJsxBaseline } from '#react/app/make/jsx'

export { resolveMakeNodeIds } from '#react/app/make/selection'

export type MakeScreen = {
  id: string
  name: string
  width: number
  height: number
}

export type MakePreviewBuild = {
  /** React (Tailwind) JSX source — baseline or AI-refined. */
  code: string
  screens: MakeScreen[]
  nodeIds: string[]
}

function screensFor(graph: SceneGraph, nodeIds: string[]): MakeScreen[] {
  return nodeIds.map((id) => {
    const node = graph.getNode(id)
    return {
      id,
      name: node?.name?.trim() || id,
      width: Math.max(1, node?.width ?? 1),
      height: Math.max(1, node?.height ?? 1)
    }
  })
}

/** Baseline Make build: React JSX for the esbuild sandbox preview. */
export function buildMakePreview(
  graph: SceneGraph,
  selectedIds: readonly string[]
): MakePreviewBuild {
  const { code, nodeIds } = buildMakeJsxBaseline(graph, selectedIds)
  return {
    code,
    screens: screensFor(graph, nodeIds),
    nodeIds
  }
}

/** Re-preview after the user or AI edits JSX. */
export function previewMakeJsx(code: string, screens: MakeScreen[]): MakePreviewBuild {
  return {
    code,
    screens,
    nodeIds: screens.map((screen) => screen.id)
  }
}
