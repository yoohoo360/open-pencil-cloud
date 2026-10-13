import type { SceneNode } from '@open-pencil/scene-graph'

import type { SkiaRenderer } from '#core/canvas/renderer'
import { deleteSkiaObject } from '#core/canvas/skia-object.override'
import { changesShaping } from '#core/canvas/text/paragraph-inputs'

export function invalidateScenePicture(r: SkiaRenderer): void {
  deleteSkiaObject(r.scenePicture)
  r.scenePicture = null
  r.scenePictureVersion = -1
  r.scenePictureFontGeneration = -1
  deleteSkiaObject(r.sceneBacking?.image)
  r.sceneBacking = null
  deleteSkiaObject(r.sceneBackingBuild?.surface)
  r.sceneBackingBuild = null
}

export function clearSubtreePictureCache(r: SkiaRenderer): void {
  for (const entry of r.subtreePictureCache.values()) deleteSkiaObject(entry.picture)
  r.subtreePictureCache.clear()
  r.subtreePictureCachePageId = null
  r.subtreePictureCacheSceneVersion = -1
  r.subtreePictureCachePositionPreviewVersion = -1
  r.subtreePictureCacheFontGeneration = -1
}

export function invalidateAllPictures(r: SkiaRenderer): void {
  r.textPreparationCache.clear()
  invalidateScenePicture(r)
  r.tiledScene.invalidateStructure()
  for (const pic of r.nodePictureCache.values()) deleteSkiaObject(pic)
  r.nodePictureCache.clear()
  r.nodePictureCacheGenerations.clear()
  r.nodePictureCacheDependencies.clear()
  r.effectRasterCache.clear()
  clearSubtreePictureCache(r)
}

export function invalidateNodePicture(
  r: SkiaRenderer,
  nodeId: string,
  changedKeys?: readonly (keyof SceneNode)[]
): void {
  r.textPreparationCache.deleteNode(nodeId, {
    keepShaping: changedKeys !== undefined && !changesShaping(changedKeys)
  })
  r.effectRasterCache.delete(nodeId)
  r.effectRasterCache.deleteDependencies(nodeId)
  for (const [ownerId, dependencyIds] of r.nodePictureCacheDependencies) {
    if (!dependencyIds.includes(nodeId)) continue
    deleteSkiaObject(r.nodePictureCache.get(ownerId))
    r.nodePictureCache.delete(ownerId)
    r.nodePictureCacheGenerations.delete(ownerId)
    r.nodePictureCacheDependencies.delete(ownerId)
  }
  const pic = r.nodePictureCache.get(nodeId)
  if (pic) {
    deleteSkiaObject(pic)
    r.nodePictureCache.delete(nodeId)
    r.nodePictureCacheGenerations.delete(nodeId)
    r.nodePictureCacheDependencies.delete(nodeId)
  }
  const subtree = r.subtreePictureCache.get(nodeId)
  if (subtree) {
    deleteSkiaObject(subtree.picture)
    r.subtreePictureCache.delete(nodeId)
  }
}

export function flashNode(r: SkiaRenderer, nodeId: string): void {
  r._flashes.push({ nodeId, startTime: performance.now() })
}

export function aiMarkActive(r: SkiaRenderer, nodeIds: string[]): void {
  for (const id of nodeIds) r._aiActiveNodes.add(id)
}

export function aiMarkDone(r: SkiaRenderer, nodeIds: string[]): void {
  const now = performance.now()
  for (const id of nodeIds) {
    if (r._aiActiveNodes.delete(id)) {
      r._aiDoneFlashes.push({ nodeId: id, startTime: now })
    }
  }
}

export function aiFlashDone(r: SkiaRenderer, nodeIds: string[]): void {
  const now = performance.now()
  for (const id of nodeIds) {
    r._aiDoneFlashes.push({ nodeId: id, startTime: now })
  }
}

export function aiClearActive(r: SkiaRenderer): void {
  r._aiActiveNodes.clear()
}

export function aiClearAll(r: SkiaRenderer): void {
  r._aiActiveNodes.clear()
  r._aiDoneFlashes = []
}

export function hasActiveFlashes(r: SkiaRenderer): boolean {
  return r._flashes.length > 0 || r._aiActiveNodes.size > 0 || r._aiDoneFlashes.length > 0
}
