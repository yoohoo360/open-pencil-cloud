import { isInternalOnlyPage } from '#react/components/assets-panel/page'

import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'

const DIVIDER_NAME = /^[-–—*\s]+$/

export function listVisiblePages(graph: SceneGraph): SceneNode[] {
  return graph.getPages().filter((page) => !isInternalOnlyPage(page))
}

export function isDividerPage(page: Pick<SceneNode, 'name' | 'childIds'>): boolean {
  return page.childIds.length === 0 && DIVIDER_NAME.test(page.name)
}

export function moveVisiblePage(graph: SceneGraph, pageId: string, visibleIndex: number): boolean {
  const pages = listVisiblePages(graph)
  const currentIndex = pages.findIndex((page) => page.id === pageId)
  if (currentIndex === -1) return false

  const nextIndex = Math.max(0, Math.min(visibleIndex, pages.length - 1))
  if (nextIndex === currentIndex) return false

  const dest = pages[nextIndex]
  if (!dest) return false
  const rootIndex = graph.getChildren(graph.rootId).findIndex((node) => node.id === dest.id)
  if (rootIndex === -1) return false

  graph.insertChildAt(pageId, graph.rootId, rootIndex)
  return true
}
