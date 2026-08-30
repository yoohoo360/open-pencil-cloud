import type { ComponentPropertyDefinition, SceneNode } from '@open-pencil/scene-graph'

import {
  ancestorPublishedInstance,
  propertyDefinitionOwners,
  propertyIdForField,
  resolveInstanceSwapComponentId
} from '#react/controls/component-props/model'
import { useEditor } from '#react/editor/context'
import { materializeComponent } from '#react/graph/instances'
import { useSceneComputed } from '#react/internal/scene-computed/use'

function swapPropertyId(node: SceneNode) {
  return propertyIdForField(node, 'SLOT') ?? propertyIdForField(node, 'INSTANCE_SWAP')
}

function boundSwapDefinition(
  node: SceneNode,
  editor: ReturnType<typeof useEditor>
): ComponentPropertyDefinition | undefined {
  const propertyId = swapPropertyId(node)
  if (!propertyId) return undefined
  const owner = ancestorPublishedInstance(node, (id) => editor.graph.getNode(id))
  if (owner) {
    return editor
      .getInstanceComponentPropertyDefinitions(owner.id)
      .find((definition) => definition.id === propertyId)
  }
  return propertyDefinitionOwners(node, (id) => editor.graph.getNode(id))
    .flatMap((item) => item.componentPropertyDefinitions)
    .find((definition) => definition.id === propertyId)
}

export function useInstanceSwap() {
  const editor = useEditor()
  const node = useSceneComputed(() => {
    const selected = editor.getSelectedNode()
    return selected?.type === 'INSTANCE' ? selected : null
  })
  const bindable =
    node !== null &&
    propertyDefinitionOwners(node, (id) => editor.graph.getNode(id)).length > 0
  const componentId =
    (node ? resolveInstanceSwapComponentId(node, (id) => editor.graph.getNode(id)) : undefined) ?? ''
  const definition = node ? boundSwapDefinition(node, editor) : undefined

  function swap(nextComponentId: string, sourceLibraryKey?: string) {
    const current = node
      ? resolveInstanceSwapComponentId(node, (id) => editor.graph.getNode(id))
      : undefined
    const resolvedId = materializeComponent(editor, nextComponentId, sourceLibraryKey)
    if (!node || !resolvedId || resolvedId === current) return
    const propertyId = swapPropertyId(node)
    const owner = ancestorPublishedInstance(node, (id) => editor.graph.getNode(id))
    if (propertyId && owner) {
      editor.setInstanceComponentProperty(owner.id, propertyId, resolvedId)
      return
    }
    const previousComponentId = node.componentId
    if (!previousComponentId) return
    const instanceId = node.id
    editor.graph.swapInstanceComponent(instanceId, resolvedId)
    editor.undo.push({
      label: 'Swap instance',
      forward: () => {
        editor.graph.swapInstanceComponent(instanceId, resolvedId)
        editor.requestRender()
      },
      inverse: () => {
        editor.graph.swapInstanceComponent(instanceId, previousComponentId)
        editor.requestRender()
      }
    })
    editor.requestRender()
  }

  return {
    active: bindable,
    componentId,
    preferredValues: definition?.preferredValues,
    onlyPreferredInstances: definition?.onlyPreferredInstances,
    swap
  }
}
