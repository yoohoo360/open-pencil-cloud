import { hydrateBuiltinInstance } from '#react/controls/builtin-text/hydrate'
import { BUILTIN_LIBRARY_KEY, copyBuiltinImages } from '#react/graph/builtin'
import { addRemoteComponent, getLib } from '#react/graph/remote-lib'

import type { Editor } from '@open-pencil/core/editor'
import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'

const materializing = new Set<string>()

function walkReferencedComponents(
  graph: SceneGraph,
  root: SceneNode,
  visit: (componentId: string) => void
) {
  const seen = new Set<string>()
  function walk(node: SceneNode) {
    if (seen.has(node.id)) return
    seen.add(node.id)
    if (node.type === 'INSTANCE' && node.componentId) visit(node.componentId)
    for (const childId of node.childIds) {
      const child = graph.getNode(childId)
      if (child) walk(child)
    }
  }
  walk(root)
}

export function materializeComponent(
  editor: Editor,
  componentId: string,
  sourceLibraryKey?: string
): string | null {
  if (!sourceLibraryKey) return editor.graph.getNode(componentId)?.id ?? componentId
  const key = `${sourceLibraryKey}:${componentId}`
  if (materializing.has(key)) return editor.graph.getNode(componentId)?.id ?? componentId
  materializing.add(key)
  try {
    const importGraph = getLib(editor.graph, sourceLibraryKey)?.graph
    const sourceComponent = importGraph?.getNode(componentId)
    if (!importGraph || sourceComponent?.type !== 'COMPONENT') {
      return editor.graph.getNode(componentId)?.id ?? null
    }
    walkReferencedComponents(importGraph, sourceComponent, (nestedId) => {
      materializeComponent(editor, nestedId, sourceLibraryKey)
    })
    const remoteSet = sourceComponent.parentId
      ? importGraph.getNode(sourceComponent.parentId)
      : undefined
    addRemoteComponent(
      editor.graph,
      sourceLibraryKey,
      sourceComponent,
      remoteSet?.type === 'COMPONENT_SET' ? remoteSet : undefined
    )
    if (sourceLibraryKey === BUILTIN_LIBRARY_KEY) copyBuiltinImages(editor.graph)
    return sourceComponent.id
  } finally {
    materializing.delete(key)
  }
}

export function createInstanceFromComponent(
  editor: Editor,
  componentId: string,
  x?: number,
  y?: number,
  parentId?: string,
  sourceLibraryKey?: string
) {
  const parent = parentId ?? editor.state.currentPageId
  const resolvedId = materializeComponent(editor, componentId, sourceLibraryKey)
  if (!resolvedId) return null
  const instanceId = editor.createInstanceFromComponent(resolvedId, x, y, parent)
  if (instanceId && sourceLibraryKey) editor.graph.updateNode(instanceId, { sourceLibraryKey })
  if (instanceId && sourceLibraryKey === BUILTIN_LIBRARY_KEY) {
    copyBuiltinImages(editor.graph)
    hydrateBuiltinInstance(editor, instanceId)
  }
  return instanceId
}
