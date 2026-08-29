import type { Editor } from '@open-pencil/core/editor'

import { addRemoteComponent, getLib } from '#react/graph/remote-lib'

export function createInstanceFromComponent(
  editor: Editor,
  componentId: string,
  x?: number,
  y?: number,
  parentId?: string,
  sourceLibraryKey?: string
) {
  const parent = parentId ?? editor.state.currentPageId
  if (!sourceLibraryKey) {
    return editor.createInstanceFromComponent(componentId, x, y, parent)
  }

  const importGraph = getLib(editor.graph, sourceLibraryKey)?.graph
  if (!importGraph) return null
  const sourceComponent = importGraph.getNode(componentId)
  if (sourceComponent?.type !== 'COMPONENT') return null

  const remoteSet = sourceComponent.parentId
    ? importGraph.getNode(sourceComponent.parentId)
    : undefined
  addRemoteComponent(
    editor.graph,
    sourceLibraryKey,
    sourceComponent,
    remoteSet?.type === 'COMPONENT_SET' ? remoteSet : undefined
  )

  const instanceId = editor.createInstanceFromComponent(sourceComponent.id, x, y, parent)
  if (instanceId) editor.graph.updateNode(instanceId, { sourceLibraryKey })
  return instanceId
}
