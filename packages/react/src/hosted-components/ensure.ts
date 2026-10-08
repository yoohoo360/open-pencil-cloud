import { listHostedComponents } from '#react/hosted-components/registry'
import { addLib, getLib } from '#react/graph/remote-lib'

import type { SceneGraph } from '@open-pencil/scene-graph'

/** Ensure every registered hosted component library exists on the document graph. */
export function ensureHostedLibraries(graph: SceneGraph): boolean {
  let created = false
  for (const def of listHostedComponents()) {
    const existing = getLib(graph, def.libraryKey)
    if (existing) {
      def.onLibraryPresent?.(graph, existing.graph)
      def.copyLibraryAssets?.(graph)
      continue
    }
    addLib(graph, def.libraryKey, def.libraryName ?? def.displayName, '', def.createCatalog())
    def.copyLibraryAssets?.(graph)
    created = true
  }
  return created
}
