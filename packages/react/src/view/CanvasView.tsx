import { bindOpenPencilTestImport } from '#react/app/document/test-import'
import { requestLocalFontAccess } from '#react/app/editor/fonts'
import { createEditorStore, EditorStoreProvider, type EditorStore } from '#react/app/editor/store'
import { OpenPencilProvider } from '#react/editor/context'
import { EditorWorkspace } from '#react/editor/EditorWorkspace'
import { useEffect, useMemo } from 'react'

function addDemoIcon(store: EditorStore, name: string, type: 'STAR' | 'ELLIPSE', x: number) {
  const pageId = store.state.currentPageId
  const set = store.graph.createNode('COMPONENT_SET', pageId, {
    name,
    x,
    y: 720,
    width: 24,
    height: 24
  })
  const component = store.graph.createNode('COMPONENT', set.id, {
    name,
    x: 0,
    y: 0,
    width: 24,
    height: 24
  })
  store.graph.createNode(type, component.id, {
    name: 'Glyph',
    x: 0,
    y: 0,
    width: 24,
    height: 24
  })
  return component
}

function addDemoButtonIcon(store: EditorStore, parentId: string, componentId: string) {
  return store.graph.createInstance(componentId, parentId, {
    name: 'Icon',
    x: 8,
    y: 12,
    width: 16,
    height: 16,
    componentPropertyReferences: [
      { propertyId: 'prop:show-icon', field: 'VISIBLE' },
      { propertyId: 'prop:icon', field: 'SLOT_CONTENT' }
    ]
  })
}

function addDemoButtonSet(store: EditorStore) {
  const pageId = store.state.currentPageId
  const star = addDemoIcon(store, 'Star', 'STAR', 80)
  const circle = addDemoIcon(store, 'Circle', 'ELLIPSE', 120)
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
      },
      {
        id: 'prop:icon',
        name: 'Icon',
        type: 'SLOT',
        defaultValue: star.id,
        preferredValues: [star.id, circle.id]
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
  addDemoButtonIcon(store, primary.id, star.id)
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
  addDemoButtonIcon(store, fallback.id, star.id)
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

function addDemoCard(store: EditorStore) {
  const pageId = store.state.currentPageId
  const set = store.graph.createNode('COMPONENT_SET', pageId, {
    name: 'Card',
    x: 80,
    y: 880,
    width: 280,
    height: 200,
    componentPropertyDefinitions: [
      {
        id: 'prop:body',
        name: 'body',
        type: 'SLOT',
        defaultValue: '',
        preferredValues: []
      }
    ]
  })
  const variant = store.graph.createNode('COMPONENT', set.id, {
    name: 'Default',
    x: 0,
    y: 0,
    width: 240,
    height: 160,
    layoutMode: 'VERTICAL',
    itemSpacing: 8,
    paddingTop: 12,
    paddingRight: 12,
    paddingBottom: 12,
    paddingLeft: 12
  })
  store.graph.createNode('TEXT', variant.id, {
    name: 'Title',
    text: 'Card',
    width: 216,
    height: 20
  })
  store.graph.createNode('FRAME', variant.id, {
    name: 'body',
    width: 216,
    height: 100,
    layoutMode: 'VERTICAL',
    itemSpacing: 8,
    fills: [
      {
        type: 'SOLID',
        color: { r: 0.94, g: 0.94, b: 0.96, a: 1 },
        opacity: 1,
        visible: true
      }
    ],
    componentPropertyReferences: [{ propertyId: 'prop:body', field: 'SLOT_CONTENT' }]
  })
  store.graph.createInstance(variant.id, pageId, {
    x: 400,
    y: 880,
    name: 'Card instance'
  })
}

/**
 * Extra page for PingFang / CJK memory stress.
 * Uses `graph.addPage` (not `store.addPage`) so we do not switchPage during demo
 * boot — switching into tens of thousands of texts mid-init freezes the first paint.
 */
async function addDemoTextStressPage(store: EditorStore, count = 20000): Promise<void> {
  const pageId = store.graph.addPage('Text 30k').id
  const chunk = 2_000
  for (let start = 0; start < count; start += chunk) {
    const end = Math.min(start + chunk, count)
    for (let i = start; i < end; i++) {
      const col = i % 100
      const row = (i / 100) | 0
      store.graph.createNode('TEXT', pageId, {
        name: `T${i}`,
        text: i % 5 === 0 ? `你好${i % 50}` : `Hi ${i}`,
        x: col * 80,
        y: row * 24,
        width: 72,
        height: 20,
        fontSize: 12,
        // fontFamily: 'PingFang SC',
        fontWeight: 400
      })
    }
    // Yield so the UI can paint while the stress page fills in.
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 0)
    })
  }
  store.requestRender()
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
  addDemoCard(store)
  store.zoomToFit()
  // Fill the stress page after first paint; never switch to it during boot.
  if (typeof window !== 'undefined') {
    window.setTimeout(() => {
      void addDemoTextStressPage(store)
    }, 0)
  } else {
    void addDemoTextStressPage(store)
  }
  return store
}

export default function CanvasView() {
  const store = useMemo(() => createDemoStore(), [])
  useEffect(() => {
    requestLocalFontAccess().then(() => {
      bindOpenPencilTestImport(store)
    })
  }, [store])

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
