import { expect, spyOn, test } from 'bun:test'

import { createEditor } from '@open-pencil/core/editor'
import { SceneGraph } from '@open-pencil/scene-graph'

import { fitDemoPagesOnFirstVisit } from '@/app/demo/viewport'

test('fits only the first visit and preserves a custom viewport on return', async () => {
  const editor = createEditor()
  const originalPage = editor.state.currentPageId
  const next = editor.graph.addPage('Next')
  editor.graph.createNode('FRAME', next.id, { x: 1000, y: 1000, width: 100, height: 100 })
  const fit = spyOn(editor, 'zoomToFit')
  const stop = fitDemoPagesOnFirstVisit(editor, [next.id])
  try {
    await editor.switchPage(next.id)
    expect(fit).toHaveBeenCalledTimes(1)
    editor.pan(120, 80)
    const viewport = { panX: editor.state.panX, panY: editor.state.panY, zoom: editor.state.zoom }
    await editor.switchPage(originalPage)
    await editor.switchPage(next.id)
    expect(fit).toHaveBeenCalledTimes(1)
    expect({ panX: editor.state.panX, panY: editor.state.panY, zoom: editor.state.zoom }).toEqual(
      viewport
    )
  } finally {
    stop()
    fit.mockRestore()
    editor.dispose()
  }
})

test('stops fitting after the demo graph is replaced', async () => {
  const editor = createEditor()
  const replacement = new SceneGraph()
  const nextReplacement = replacement.addPage('User document')
  const fit = spyOn(editor, 'zoomToFit')
  const stop = fitDemoPagesOnFirstVisit(editor, [nextReplacement.id])
  try {
    editor.replaceGraph(replacement)
    await editor.switchPage(nextReplacement.id)
    expect(fit).not.toHaveBeenCalled()
  } finally {
    stop()
    fit.mockRestore()
    editor.dispose()
  }
})
