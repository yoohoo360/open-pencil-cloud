import { expect, mock, test } from 'bun:test'

import type { SkiaRenderer } from '#core/canvas/renderer'
import { invalidateAllPictures, invalidateNodePicture } from '#core/canvas/renderer/state'

function deletable() {
  return { delete: mock() }
}

test('full picture invalidation resets tiled font-dependent resources', () => {
  const scenePicture = deletable()
  const backingImage = deletable()
  const nodePicture = deletable()
  const subtreePicture = deletable()
  const renderer = {
    scenePicture,
    scenePictureVersion: 1,
    scenePictureFontGeneration: 1,
    sceneBacking: { image: backingImage },
    sceneBackingBuild: null,
    nodePictureCache: new Map([['node', nodePicture]]),
    nodePictureCacheGenerations: new Map([['node', 1]]),
    nodePictureCacheDependencies: new Map([['node', []]]),
    effectRasterCache: new Map(),
    subtreePictureCache: new Map([['subtree', { picture: subtreePicture }]]),
    subtreePictureCachePageId: 'page',
    subtreePictureCacheSceneVersion: 1,
    subtreePictureCachePositionPreviewVersion: 1,
    subtreePictureCacheFontGeneration: 1,
    tiledScene: { invalidateStructure: mock() }
  } as SkiaRenderer

  invalidateAllPictures(renderer)

  expect(renderer.tiledScene.invalidateStructure).toHaveBeenCalledTimes(1)
  expect(scenePicture.delete).toHaveBeenCalledTimes(1)
  expect(backingImage.delete).toHaveBeenCalledTimes(1)
  expect(nodePicture.delete).toHaveBeenCalledTimes(1)
  expect(subtreePicture.delete).toHaveBeenCalledTimes(1)
})

test('node picture invalidation removes pictures that depend on a changed child', () => {
  const parentPicture = deletable()
  const childPicture = deletable()
  const renderer = {
    nodePictureCache: new Map([
      ['parent', parentPicture],
      ['child', childPicture]
    ]),
    nodePictureCacheGenerations: new Map([
      ['parent', 1],
      ['child', 1]
    ]),
    nodePictureCacheDependencies: new Map([
      ['parent', ['child']],
      ['child', []]
    ]),
    effectRasterCache: new Map(),
    subtreePictureCache: new Map()
  } as SkiaRenderer

  invalidateNodePicture(renderer, 'child')

  expect(parentPicture.delete).toHaveBeenCalledTimes(1)
  expect(childPicture.delete).toHaveBeenCalledTimes(1)
  expect(renderer.nodePictureCache.size).toBe(0)
})
