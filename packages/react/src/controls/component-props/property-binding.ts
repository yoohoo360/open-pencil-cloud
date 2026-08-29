import type { ComponentPropertyReferenceField, ComponentPropertyType } from '@open-pencil/scene-graph'

import { setNodePropertyReference } from '#react/controls/component-props/binding'
import {
  canBindTextProperty,
  canBindVisibleProperty,
  propertyDefinitionOwners,
  propertyDefinitionsOfType,
  propertyIdForField
} from '#react/controls/component-props/model'
import { useEditor } from '#react/editor/context'
import { useSceneComputed } from '#react/internal/scene-computed/use'

const FIELD_BINDING: Record<
  'VISIBLE' | 'TEXT',
  { type: ComponentPropertyType; apply: string; detach: string; canBind: typeof canBindTextProperty }
> = {
  VISIBLE: {
    type: 'BOOLEAN',
    apply: 'Apply boolean property',
    detach: 'Detach boolean property',
    canBind: canBindVisibleProperty
  },
  TEXT: {
    type: 'TEXT',
    apply: 'Apply text property',
    detach: 'Detach text property',
    canBind: canBindTextProperty
  }
}

export function useComponentPropertyBinding(field: Extract<ComponentPropertyReferenceField, 'VISIBLE' | 'TEXT'>) {
  const editor = useEditor()
  const config = FIELD_BINDING[field]
  const node = useSceneComputed(() => editor.getSelectedNode() ?? null)
  const owners = useSceneComputed(() =>
    node ? propertyDefinitionOwners(node, (id) => editor.graph.getNode(id)) : []
  )
  const properties = propertyDefinitionsOfType(owners, config.type)
  const boundPropertyId = node ? propertyIdForField(node, field) : undefined
  const active = owners.length > 0 && node !== null && config.canBind(node)

  function bind(propertyId: string) {
    if (!node) return
    if (boundPropertyId === propertyId) {
      setNodePropertyReference(editor, node.id, field, null, config.detach)
      return
    }
    setNodePropertyReference(editor, node.id, field, propertyId, config.apply)
  }

  function unbind() {
    if (!node) return
    setNodePropertyReference(editor, node.id, field, null, config.detach)
  }

  return { active, properties, boundPropertyId, bind, unbind }
}

export function useVisibilityPropertyBinding() {
  return useComponentPropertyBinding('VISIBLE')
}

export function useTextPropertyBinding() {
  return useComponentPropertyBinding('TEXT')
}
