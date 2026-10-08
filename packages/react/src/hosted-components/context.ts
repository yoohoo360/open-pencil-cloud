import type { HostedComponentContext } from '#react/hosted-components/types'

import type { Editor } from '@open-pencil/core/editor'
import type { SceneNode } from '@open-pencil/scene-graph'

const PLUGIN_NAMESPACE = 'open-pencil'

function readPluginData(node: SceneNode, key: string): string {
  return (
    node.pluginData.find((entry) => entry.pluginId === PLUGIN_NAMESPACE && entry.key === key)
      ?.value ?? ''
  )
}

function writePluginData(
  editor: Editor,
  node: SceneNode,
  key: string,
  value: string
): void {
  const pluginData = node.pluginData.filter(
    (entry) => !(entry.pluginId === PLUGIN_NAMESPACE && entry.key === key)
  )
  if (value !== '') {
    pluginData.push({ pluginId: PLUGIN_NAMESPACE, key, value })
  }
  editor.graph.updateNode(node.id, { pluginData })
}

export function createHostedComponentContext(editor: Editor): HostedComponentContext {
  return {
    editor,
    get graph() {
      return editor.graph
    },
    getNode: (id) => editor.graph.getNode(id),
    updateNode: (id, patch) => {
      editor.graph.updateNode(id, patch)
    },
    createNode: (type, parentId, props) => editor.graph.createNode(type, parentId, props),
    deleteNode: (id) => {
      editor.graph.deleteNode(id)
    },
    reorderChild: (childId, parentId, index) => {
      editor.graph.reorderChild(childId, parentId, index)
    },
    getPluginData: (nodeId, key) => {
      const node = editor.graph.getNode(nodeId)
      return node ? readPluginData(node, key) : ''
    },
    setPluginData: (nodeId, key, value) => {
      const node = editor.graph.getNode(nodeId)
      if (!node) return
      writePluginData(editor, node, key, value)
    },
    requestRender: () => {
      editor.requestRender()
    },
    select: (ids) => {
      editor.select(ids)
    },
    getSelectedIds: () => [...editor.state.selectedIds]
  }
}
