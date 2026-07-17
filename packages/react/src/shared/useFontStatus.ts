import { DEFAULT_FONT_FAMILY } from '@open-pencil/core/constants'
import { fontManager } from '@open-pencil/core/text'
import type { SceneNode } from '@open-pencil/scene-graph'

import { useSceneComputed } from '../internal/useSceneComputed'

/**
 * Returns missing-font information for a text node getter.
 */
export function useNodeFontStatus(node: () => SceneNode | null | undefined) {
  const missingFonts = useSceneComputed(() => {
    const n = node()
    if (!n || n.type !== 'TEXT') return [] as string[]

    const families = new Set<string>()
    families.add(n.fontFamily || DEFAULT_FONT_FAMILY)
    for (const run of n.styleRuns) {
      if (run.style.fontFamily) families.add(run.style.fontFamily)
    }

    return [...families].filter((f) => !fontManager.isLoaded(f))
  })

  const hasMissingFonts = missingFonts.length > 0

  return { missingFonts, hasMissingFonts }
}
