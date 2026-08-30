import type { Editor } from '@open-pencil/core/editor'

import { addRemoteComponent, getLib } from '#react/graph/remote-lib'

export function materializeComponent(
  editor: Editor,
  componentId: string,
  sourceLibraryKey?: string
): string | null {
  if (!sourceLibraryKey) return editor.graph.getNode(componentId)?.id ?? componentId
  const importGraph = getLib(editor.graph, sourceLibraryKey)?.graph
  const sourceComponent = importGraph?.getNode(componentId)
  if (sourceComponent?.type !== 'COMPONENT') {
    return editor.graph.getNode(componentId)?.id ?? null
  }
  const remoteSet = sourceComponent.parentId
    ? importGraph?.getNode(sourceComponent.parentId)
    : undefined
  addRemoteComponent(
    editor.graph,
    sourceLibraryKey,
    sourceComponent,
    remoteSet?.type === 'COMPONENT_SET' ? remoteSet : undefined
  )
  return sourceComponent.id
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
  return instanceId
}
