import type { ComponentPropertyReferenceField } from '@open-pencil/scene-graph'

import {
  findFirstUnboundDescendant,
  withPropertyReference
} from '#react/controls/component-props/model'
import { useEditor } from '#react/editor/context'

type Editor = ReturnType<typeof useEditor>

export function setNodePropertyReference(
  editor: Editor,
  nodeId: string,
  field: ComponentPropertyReferenceField,
  propertyId: string | null,
  label: string
): boolean {
  const node = editor.graph.getNode(nodeId)
  if (!node) return false
  const previous = [...node.componentPropertyReferences]
  const next = withPropertyReference(previous, field, propertyId)
  const unchanged =
    previous.length === next.length &&
    previous.every(
      (reference, index) =>
        reference.field === next[index]?.field && reference.propertyId === next[index]?.propertyId
    )
  if (unchanged) return false
  editor.graph.updateNode(nodeId, { componentPropertyReferences: next })
  editor.undo.push({
    label,
    forward: () => {
      editor.graph.updateNode(nodeId, { componentPropertyReferences: structuredClone(next) })
      editor.requestRender()
    },
    inverse: () => {
      editor.graph.updateNode(nodeId, { componentPropertyReferences: structuredClone(previous) })
      editor.requestRender()
    }
  })
  editor.requestRender()
  return true
}

export function bindFirstUnboundDescendant(
  editor: Editor,
  rootId: string,
  field: ComponentPropertyReferenceField,
  propertyId: string
): boolean {
  const root = editor.graph.getNode(rootId)
  if (!root) return false
  const target = findFirstUnboundDescendant(root, field, (id) => editor.graph.getChildren(id), true)
  if (!target) return false
  editor.graph.updateNode(target.id, {
    componentPropertyReferences: withPropertyReference(
      target.componentPropertyReferences,
      field,
      propertyId
    )
  })
  return true
}
