import { useState } from 'react'

import type { Tool, EditorToolDef } from '@open-pencil/core/editor'

const CATEGORY_COUNT = 3

/**
 * Returns responsive toolbar UI state for mobile category paging.
 */
export function useToolbarState() {
  const [mobileCategory, setMobileCategory] = useState(0)
  const [slideDirection, setSlideDirection] = useState(1)

  const hasPrev = mobileCategory > 0
  const hasNext = mobileCategory < CATEGORY_COUNT - 1

  function isActive(tool: EditorToolDef, activeTool: Tool): boolean {
    if (tool.key === activeTool) return true
    return tool.flyout?.includes(activeTool) ?? false
  }

  function activeKeyForTool(tool: EditorToolDef, activeTool: Tool): Tool {
    if (tool.flyout?.includes(activeTool)) return activeTool
    return tool.key
  }

  function goPrev() {
    if (!hasPrev) return
    setSlideDirection(-1)
    setMobileCategory((c) => c - 1)
  }

  function goNext() {
    if (!hasNext) return
    setSlideDirection(1)
    setMobileCategory((c) => c + 1)
  }

  return {
    mobileCategory,
    slideDirection,
    hasPrev,
    hasNext,
    isActive,
    activeKeyForTool,
    goPrev,
    goNext
  }
}
