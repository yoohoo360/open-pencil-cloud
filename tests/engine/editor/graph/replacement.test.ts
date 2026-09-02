import { expect, mock, test } from 'bun:test'

import { SceneGraph } from '@open-pencil/scene-graph'

import type { SkiaRenderer } from '#core/canvas/renderer'
import { createEditor } from '#core/editor'

test('graph replacement clears tiled state even when page IDs are reused', () => {
  const editor = createEditor()
  const renderer = {
    tiledScene: { invalidateStructure: mock() },
    measureTextNode: undefined
  } as SkiaRenderer
  editor.setCanvasKit({} as Parameters<typeof editor.setCanvasKit>[0], renderer)
  const replacement = new SceneGraph()

  editor.replaceGraph(replacement)

  expect(renderer.tiledScene.invalidateStructure).toHaveBeenCalledTimes(1)
  expect(editor.graph).toBe(replacement)
})
