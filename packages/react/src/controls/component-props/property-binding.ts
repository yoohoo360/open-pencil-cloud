import type {
  ComponentPropertyDefinition,
  ComponentPropertyReferenceField,
  ComponentPropertyType,
  SceneNode
} from '@open-pencil/scene-graph'

import { setNodePropertyReference } from '#react/controls/component-props/binding'
import {
  canBindInstanceSwapProperty,
  canBindSlotProperty,
  canBindTextProperty,
  canBindVisibleProperty,
  propertyDefinitionOwners,
  propertyDefinitionsOfType,
  propertyIdForField
} from '#react/controls/component-props/model'
import { useEditor } from '#react/editor/context'
import { useSceneComputed } from '#react/internal/scene-computed/use'

const FIELD_BINDING: Record<
  ComponentPropertyReferenceField,
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
  },
  INSTANCE_SWAP: {
    type: 'INSTANCE_SWAP',
    apply: 'Apply instance swap property',
    detach: 'Detach instance swap property',
    canBind: canBindInstanceSwapProperty
  },
  SLOT_CONTENT: {
    type: 'SLOT',
    apply: 'Apply slot property',
    detach: 'Detach slot property',
    canBind: canBindSlotProperty
  }
}

export function boundReferenceForField(
  node: SceneNode | null | undefined,
  field: ComponentPropertyReferenceField,
  owners: SceneNode[]
): { propertyId: string; name: string; field: ComponentPropertyReferenceField } | undefined {
  if (!node) return
  const fields: ComponentPropertyReferenceField[] =
    field === 'INSTANCE_SWAP' ? ['INSTANCE_SWAP', 'SLOT_CONTENT'] : [field]
  const definitions = owners.flatMap((owner) => owner.componentPropertyDefinitions)
  for (const candidate of fields) {
    const propertyId = propertyIdForField(node, candidate)
    if (!propertyId) continue
    const slots = definitions.filter((item) => item.type === 'SLOT')
    const definition =
      definitions.find((item) => item.id === propertyId) ??
      (candidate === 'SLOT_CONTENT'
        ? (slots.find((item) => item.name === node.name) ??
          (slots.length === 1 ? slots[0] : undefined))
        : undefined)
    // Prefer the deduped owner definition id so bind/unbind targets the property the panel lists.
    const listed =
      definition &&
      propertyDefinitionsOfType(owners, definition.type).find(
        (item) => item.name === definition.name
      )
    return {
      propertyId: listed?.id ?? definition?.id ?? propertyId,
      name: listed?.name ?? definition?.name ?? propertyId,
      field: candidate
    }
  }
}

function listedProperties(
  owners: SceneNode[],
  field: ComponentPropertyReferenceField,
  type: ComponentPropertyType
): ComponentPropertyDefinition[] {
  if (field !== 'INSTANCE_SWAP') return propertyDefinitionsOfType(owners, type)
  const byId = new Map<string, ComponentPropertyDefinition>()
  for (const definition of [
    ...propertyDefinitionsOfType(owners, 'INSTANCE_SWAP'),
    ...propertyDefinitionsOfType(owners, 'SLOT')
  ]) {
    byId.set(definition.id, definition)
  }
  return [...byId.values()]
}

export function useComponentPropertyBinding(field: ComponentPropertyReferenceField) {
  const editor = useEditor()
  const config = FIELD_BINDING[field]
  const node = useSceneComputed(() => editor.getSelectedNode() ?? null)
  const owners = useSceneComputed(() =>
    node ? propertyDefinitionOwners(node, (id) => editor.graph.getNode(id)) : []
  )
  const properties = listedProperties(owners, field, config.type)
  const bound = boundReferenceForField(node, field, owners)
  const boundPropertyId = bound?.propertyId
  const boundName = bound?.name
  const boundField = bound?.field ?? field
  const boundType: ComponentPropertyType =
    boundField === 'SLOT_CONTENT' ? 'SLOT' : boundField === 'INSTANCE_SWAP' ? 'INSTANCE_SWAP' : config.type
  const active = owners.length > 0 && node !== null && config.canBind(node)

  function fieldForProperty(propertyId: string): ComponentPropertyReferenceField {
    const definition = properties.find((item) => item.id === propertyId)
    return definition?.type === 'SLOT' ? 'SLOT_CONTENT' : field
  }

  function bind(propertyId: string) {
    if (!node) return
    const nextField = fieldForProperty(propertyId)
    if (boundPropertyId === propertyId) {
      setNodePropertyReference(editor, node.id, boundField, null, config.detach)
      return
    }
    if (bound && bound.field !== nextField) {
      setNodePropertyReference(editor, node.id, bound.field, null, config.detach)
    }
    setNodePropertyReference(editor, node.id, nextField, propertyId, config.apply)
  }

  function unbind() {
    if (!node) return
    setNodePropertyReference(editor, node.id, boundField, null, config.detach)
  }

  return { active, properties, boundPropertyId, boundName, boundType, bind, unbind }
}

export function useVisibilityPropertyBinding() {
  return useComponentPropertyBinding('VISIBLE')
}

export function useTextPropertyBinding() {
  return useComponentPropertyBinding('TEXT')
}

export function useInstanceSwapPropertyBinding() {
  return useComponentPropertyBinding('INSTANCE_SWAP')
}

export function useSlotPropertyBinding() {
  return useComponentPropertyBinding('SLOT_CONTENT')
}
