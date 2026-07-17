import { createEditor } from '@open-pencil/core/editor'
import { EditorProvider, useEditor } from '../../src/context/editorContext'
import { useSceneSnapshot } from '../../src/store/useEditorStore'
import { ToolbarRoot } from '../../src/Toolbar/ToolbarRoot'
import { ToolbarItem } from '../../src/Toolbar/ToolbarItem'
import { CanvasRoot } from '../../src/Canvas/CanvasRoot'
import { CanvasSurface } from '../../src/Canvas/CanvasSurface'
import { LayerTreeRoot } from '../../src/LayerTree/LayerTreeRoot'
import { LayerTreeItem } from '../../src/LayerTree/LayerTreeItem'

import type { Tool } from '@open-pencil/core/editor'

const TOOL_LIST: Tool[] = [
  'SELECT',
  'FRAME',
  'RECTANGLE',
  'ELLIPSE',
  'LINE',
  'POLYGON',
  'STAR',
  'TEXT',
  'PEN',
  'HAND'
]

function NodeProperties() {
  const editor = useEditor()
  const node = useSceneSnapshot((e) => e.getSelectedNode() ?? null)

  function update(patch: Record<string, number>) {
    if (!node) return
    editor.updateNodeWithUndo(node.id, patch as Parameters<typeof editor.updateNodeWithUndo>[1], 'Update property')
  }

  if (!node) {
    return (
      <div className="section">
        <p className="muted">No selection</p>
      </div>
    )
  }

  return (
    <div className="section">
      <h3>{node.type}</h3>
      <label>
        X{' '}
        <input
          type="number"
          value={Math.round(node.x)}
          onChange={(e) => update({ x: +e.target.value })}
        />
      </label>
      <label>
        Y{' '}
        <input
          type="number"
          value={Math.round(node.y)}
          onChange={(e) => update({ y: +e.target.value })}
        />
      </label>
      <label>
        W{' '}
        <input
          type="number"
          value={Math.round(node.width)}
          onChange={(e) => update({ width: +e.target.value })}
        />
      </label>
      <label>
        H{' '}
        <input
          type="number"
          value={Math.round(node.height)}
          onChange={(e) => update({ height: +e.target.value })}
        />
      </label>
    </div>
  )
}

function Pages() {
  const editor = useEditor()
  const pages = useSceneSnapshot((e) => e.graph.getPages())
  const currentPageId = useSceneSnapshot((e) => e.state.currentPageId)

  return (
    <div className="section">
      <h3>Pages</h3>
      {pages.map((page) => (
        <div
          key={page.id}
          className={`list-item${page.id === currentPageId ? ' active' : ''}`}
          onClick={() => editor.switchPage(page.id)}
        >
          {page.name}
        </div>
      ))}
    </div>
  )
}

function Layers() {
  return (
    <LayerTreeRoot>
      {(ctx) => (
        <div className="section">
          <h3>Layers</h3>
          {ctx.items.map((layer) => (
            <LayerTreeItem key={layer.id} node={layer}>
              {({ node, isSelected, padLeft, select }) => (
                <div
                  className={`list-item${isSelected ? ' active' : ''}`}
                  style={{ paddingLeft: padLeft + 8 }}
                  onClick={(e) => select(e.metaKey || e.ctrlKey)}
                >
                  {node.name}
                </div>
              )}
            </LayerTreeItem>
          ))}
        </div>
      )}
    </LayerTreeRoot>
  )
}

function EditorShell() {
  const editor = useEditor()

  return (
    <div className="layout">
      <ToolbarRoot>
        {() => (
          <div className="toolbar">
            {TOOL_LIST.map((tool) => (
              <ToolbarItem key={tool} tool={tool}>
                {({ active, select }) => (
                  <button className={active ? 'active' : ''} onClick={select}>
                    {tool}
                  </button>
                )}
              </ToolbarItem>
            ))}
          </div>
        )}
      </ToolbarRoot>

      <div className="main">
        <div className="panel left">
          <Pages />
          <Layers />
        </div>

        <CanvasRoot onReady={() => editor.zoomToFit()}>
          {() => <CanvasSurface className="canvas-area" style={{ width: '100%', height: '100%', display: 'block' }} />}
        </CanvasRoot>

        <div className="panel right">
          <NodeProperties />
        </div>
      </div>
    </div>
  )
}

const editor = createEditor()

editor.createShape('FRAME', 100, 100, 400, 300)
editor.createShape('RECTANGLE', 150, 150, 120, 80)
editor.createShape('ELLIPSE', 350, 200, 100, 100)

export default function App() {
  return (
    <EditorProvider editor={editor}>
      <EditorShell />
    </EditorProvider>
  )
}
