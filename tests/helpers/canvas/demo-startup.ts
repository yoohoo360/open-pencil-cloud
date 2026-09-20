import { SceneGraph } from '@open-pencil/scene-graph'

import { createDemoShapes } from '@/app/demo/document'
import type { EditorStore } from '@/app/editor/session'

export async function replaceGraphDuringDemoSwitch(store: EditorStore) {
  const switchPage = store.switchPage
  const snapshot = () => ({
    selectedIds: [...store.state.selectedIds],
    zoom: store.state.zoom,
    panX: store.state.panX,
    panY: store.state.panY
  })
  let expected: ReturnType<typeof snapshot> | undefined
  store.switchPage = async (...args) => {
    const result = await switchPage(...args)
    const replacement = new SceneGraph()
    const page = replacement.addPage('Replacement document')
    const node = replacement.createNode('RECTANGLE', page.id, { width: 100, height: 100 })
    store.replaceGraph(replacement)
    await switchPage(page.id)
    store.select([node.id])
    store.zoomToLevel(0.75)
    expected = snapshot()
    return result
  }
  try {
    await createDemoShapes(store)
    if (!expected) throw new Error('Demo did not reach its final page switch')
    return { expected, actual: snapshot() }
  } finally {
    store.switchPage = switchPage
  }
}
