import { useState } from 'react'

import type { EditorToolDef, Tool } from '@open-pencil/core/editor'

const CATEGORY_COUNT = 3

export function isToolbarToolActive(tool: EditorToolDef, activeTool: Tool): boolean {
  return tool.key === activeTool || (tool.flyout?.includes(activeTool) ?? false)
}

export function getToolbarToolSelection(
  tool: EditorToolDef,
  activeTool: Tool,
  flyoutSelections?: ReadonlyMap<Tool, Tool>
): Tool {
  if (tool.flyout?.includes(activeTool)) return activeTool
  return flyoutSelections?.get(tool.key) ?? tool.key
}

export function useToolbarState() {
  const [mobileCategory, setMobileCategory] = useState(0)
  const [slideDirection, setSlideDirection] = useState(1)
  const hasPrev = mobileCategory > 0
  const hasNext = mobileCategory < CATEGORY_COUNT - 1

  function goPrev() {
    if (!hasPrev) return
    setSlideDirection(-1)
    setMobileCategory((value) => value - 1)
  }

  function goNext() {
    if (!hasNext) return
    setSlideDirection(1)
    setMobileCategory((value) => value + 1)
  }

  return {
    mobileCategory,
    slideDirection,
    hasPrev,
    hasNext,
    isActive: isToolbarToolActive,
    activeKeyForTool: getToolbarToolSelection,
    goPrev,
    goNext
  }
}
