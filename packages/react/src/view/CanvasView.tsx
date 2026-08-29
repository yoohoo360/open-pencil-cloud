import { useMemo } from 'react'

import { OpenPencilProvider } from '#react/editor/context'
import { EditorWorkspace } from '#react/editor/EditorWorkspace'
import { createEditorStore, EditorStoreProvider, type EditorStore } from '#react/app/editor/store'

function addDemoButtonSet(store: EditorStore) {
  const pageId = store.state.currentPageId
  const set = store.graph.createNode('COMPONENT_SET', pageId, {
    name: 'Button',
    x: 80,
    y: 520,
    width: 360,
    height: 160,
    componentPropertyDefinitions: [
      {
        id: 'prop:type',
        name: 'Type',
        type: 'VARIANT',
        defaultValue: 'Primary',
        variantOptions: ['Primary', 'Default']
      },
      {
        id: 'prop:label',
        name: 'Label',
        type: 'TEXT',
        defaultValue: 'Button'
      },
      {
        id: 'prop:show-icon',
        name: 'Show icon',
        type: 'BOOLEAN',
        defaultValue: 'true'
      }
    ]
  })
  const primary = store.graph.createNode('COMPONENT', set.id, {
    name: 'Type=Primary',
    x: 0,
    y: 0,
    width: 140,
    height: 40,
    componentPropertyValues: { Type: 'Primary' }
  })
  store.graph.createNode('RECTANGLE', primary.id, {
    name: 'Icon',
    x: 8,
    y: 12,
    width: 16,
    height: 16,
    componentPropertyReferences: [{ propertyId: 'prop:show-icon', field: 'VISIBLE' }]
  })
  store.graph.createNode('TEXT', primary.id, {
    name: 'Label',
    text: 'Primary',
    x: 32,
    width: 80,
    height: 20,
    componentPropertyReferences: [{ propertyId: 'prop:label', field: 'TEXT' }]
  })
  const fallback = store.graph.createNode('COMPONENT', set.id, {
    name: 'Type=Default',
    x: 180,
    y: 0,
    width: 140,
    height: 40,
    componentPropertyValues: { Type: 'Default' }
  })
  store.graph.createNode('RECTANGLE', fallback.id, {
    name: 'Icon',
    x: 8,
    y: 12,
    width: 16,
    height: 16,
    componentPropertyReferences: [{ propertyId: 'prop:show-icon', field: 'VISIBLE' }]
  })
  store.graph.createNode('TEXT', fallback.id, {
    name: 'Label',
    text: 'Default',
    x: 32,
    width: 80,
    height: 20,
    componentPropertyReferences: [{ propertyId: 'prop:label', field: 'TEXT' }]
  })
  const instance = store.graph.createInstance(primary.id, pageId, {
    x: 480,
    y: 520,
    name: 'Button instance'
  })
  if (instance) store.select([instance.id])
}

function createDemoStore() {
  const store = createEditorStore()
  store.createShape('FRAME', 100, 100, 640, 400)
  store.createShape('RECTANGLE', 180, 180, 240, 140)
  store.createShape('ELLIPSE', 500, 250, 120, 120)
  const textId = store.createShape('TEXT', 180, 340, 280, 48)
  store.updateNode(textId, {
    name: 'Headline',
    text: 'Headline',
    fontFamily: 'Inter',
    fontSize: 32,
    fontWeight: 700
  })
  addDemoButtonSet(store)
  store.zoomToFit()
  return store
}

export default function CanvasView() {
  const store = useMemo(() => createDemoStore(), [])

  return (
    <EditorStoreProvider store={store}>
      <OpenPencilProvider editor={store}>
        <main className="flex h-full min-h-0 w-full flex-col bg-canvas">
          <EditorWorkspace />
        </main>
      </OpenPencilProvider>
    </EditorStoreProvider>
  )
}
