import { computeAllLayouts } from '@open-pencil/core/layout'
import { sceneNodesToTailwindJSX } from '@open-pencil/dom-css/export'
import type { SceneGraph } from '@open-pencil/scene-graph'

import { resolveMakeNodeIds } from '#react/app/make/selection'

/** Default user prompt when opening Make with AI. */
export const MAKE_AI_PROMPT = `Turn this Tailwind React JSX into an interactive prototype.

Requirements:
- Keep a default export \`App\` React component.
- Preserve visual structure and Tailwind classes from the baseline.
- Add interactivity with React hooks (useState / useMemo) — no backend, no router package.
- If there are multiple top-level screens/frames, add simple screen switching (state + buttons).
- Layers named like "→ Detail" or "link:Detail" should navigate to that screen.
- Prefer the visual structure and Tailwind classes from the baseline (prototype fidelity first).
- When adding interactive controls that are not in the design, use plain React + Tailwind; do not pull in a component library unless the user asks for one.
- Reply with the full component source in one fenced \`\`\`tsx code block.`

function indentBlock(source: string, spaces: number): string {
  const pad = ' '.repeat(spaces)
  return source
    .split('\n')
    .map((line) => (line.length > 0 ? pad + line : line))
    .join('\n')
}

/**
 * Baseline React (Tailwind) JSX for Make — selection projected through dom-css,
 * wrapped as a default `App` component for AI refinement + browser preview.
 */
export function buildMakeJsxBaseline(
  graph: SceneGraph,
  selectedIds: readonly string[]
): { code: string; nodeIds: string[] } {
  const nodeIds = resolveMakeNodeIds(graph, selectedIds)
  if (nodeIds.length === 0) throw new Error('Select a frame or component to Make')

  for (const id of nodeIds) computeAllLayouts(graph, id)

  const markup = sceneNodesToTailwindJSX(graph, nodeIds).trim()
  if (!markup) throw new Error('Nothing to export as JSX')

  const names = nodeIds.map((id) => graph.getNode(id)?.name?.trim() || id)
  const screenComment =
    names.length > 1
      ? `\n// Screens in selection: ${names.map((name) => JSON.stringify(name)).join(', ')}\n`
      : '\n'

  const code = `import React, { useState } from 'react'
${screenComment}
export default function App() {
  return (
    <div className="min-h-screen bg-neutral-200 flex items-start justify-center p-6">
${indentBlock(markup, 6)}
    </div>
  )
}
`

  return { code, nodeIds }
}
