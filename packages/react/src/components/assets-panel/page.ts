import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'

export const INTERNAL_ONLY_CANVAS_NAME = 'Internal Only Canvas'

export function isInternalOnlyPage(page: SceneNode | null | undefined): boolean {
  return Boolean(page?.internalOnly || page?.name === INTERNAL_ONLY_CANVAS_NAME)
}

export function findAssetPage(node: SceneNode, graph: SceneGraph): SceneNode | null {
  let current: SceneNode | undefined = node
  while (current && current.type !== 'CANVAS') {
    current = current.parentId ? graph.getNode(current.parentId) : undefined
  }
  return current ?? null
}
