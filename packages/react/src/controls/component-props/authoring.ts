import type { VariantConflict } from '@open-pencil/core/editor'
import type { ComponentPropertyDefinition, ComponentPropertyType, SceneNode } from '@open-pencil/scene-graph'

import { bindFirstUnboundDescendant } from '#react/controls/component-props/binding'
import {
  applySlotDraft,
  findFirstUnboundDescendant,
  orderedVariantValues,
  resolveVariantAuthoringChange,
  uniquePropertyName,
  type SlotPropertyDraft,
  type VariantDefinitionControl
} from '#react/controls/component-props/model'
import { useEditor } from '#react/editor/context'
import { useSceneComputed } from '#react/internal/scene-computed/use'

function variantContext(node: SceneNode | null, graph: ReturnType<typeof useEditor>['graph']) {
  if (node?.type === 'COMPONENT_SET') return { componentSet: node, variant: null }
  if (node?.type !== 'COMPONENT' || !node.parentId) return null
  const parent = graph.getNode(node.parentId)
  return parent?.type === 'COMPONENT_SET' ? { componentSet: parent, variant: node } : null
}

export function useVariantAuthoring() {
  const editor = useEditor()
  const context = useSceneComputed(() => {
    const selected = editor.getSelectedNodes()
    return selected.length === 1 ? variantContext(selected[0] ?? null, editor.graph) : null
  })
  const active = context !== null
  const componentSet = context?.componentSet ?? null
  const variant = context?.variant ?? null
  const definitions = useSceneComputed<VariantDefinitionControl[]>(() => {
    const componentSetId = componentSet?.id
    if (!componentSetId) return []
    const values = editor.collectVariantOptions(componentSetId)
    return editor.getComponentSetPropertyDefs(componentSetId).map((definition) => ({
      id: definition.id,
      name: definition.name,
      type: definition.type,
      defaultValue: definition.defaultValue,
      description: definition.description,
      preferredValues: definition.preferredValues,
      slotMinLayers: definition.slotMinLayers,
      slotMaxLayers: definition.slotMaxLayers,
      onlyPreferredInstances: definition.onlyPreferredInstances,
      emptySlotByDefault: definition.emptySlotByDefault,
      fillCounterAxisByDefault: definition.fillCounterAxisByDefault,
      values:
        definition.type === 'VARIANT'
          ? orderedVariantValues(definition.variantOptions, values.get(definition.name))
          : []
    }))
  })
  const diagnostics = useSceneComputed<VariantConflict[]>(() => {
    const componentSetId = componentSet?.id
    return componentSetId ? editor.getComponentSetVariantConflicts(componentSetId) : []
  })

  function addProperty(type: ComponentPropertyType, name: string, initialValue: string) {
    const componentSetId = componentSet?.id
    if (!componentSetId) return
    const uniqueName = uniquePropertyName(
      definitions.map((definition) => definition.name),
      name.trim()
    )
    const field =
      type === 'TEXT'
        ? 'TEXT'
        : type === 'BOOLEAN'
          ? 'VISIBLE'
          : type === 'INSTANCE_SWAP'
            ? 'INSTANCE_SWAP'
            : type === 'SLOT'
              ? 'SLOT'
              : null
    let value = initialValue
    if (type === 'INSTANCE_SWAP' && !value) {
      for (const variant of editor.graph.getChildren(componentSetId)) {
        if (variant.type !== 'COMPONENT') continue
        const nested = findFirstUnboundDescendant(
          variant,
          field ?? 'SLOT',
          (id) => editor.graph.getChildren(id),
          true
        )
        if (nested?.componentId) {
          value = nested.componentId
          break
        }
      }
    }
    const propertyId = editor.addPropertyDefinition(componentSetId, uniqueName, type, value)
    if (propertyId && field && type !== 'SLOT') {
      for (const variant of editor.graph.getChildren(componentSetId)) {
        if (variant.type === 'COMPONENT') {
          bindFirstUnboundDescendant(editor, variant.id, field, propertyId)
        }
      }
    }
    return propertyId
  }

  function patchDefinitions(
    componentSetId: string,
    label: string,
    mutate: (definitions: ComponentPropertyDefinition[]) => ComponentPropertyDefinition[]
  ) {
    const previous = structuredClone(editor.getComponentSetPropertyDefs(componentSetId))
    const next = mutate(previous)
    editor.graph.updateNode(componentSetId, { componentPropertyDefinitions: next })
    editor.undo.push({
      label,
      forward: () => {
        editor.graph.updateNode(componentSetId, {
          componentPropertyDefinitions: structuredClone(next)
        })
        editor.requestRender()
      },
      inverse: () => {
        editor.graph.updateNode(componentSetId, {
          componentPropertyDefinitions: structuredClone(previous)
        })
        editor.requestRender()
      }
    })
    editor.requestRender()
    return true
  }

  function addSlotProperty(draft: SlotPropertyDraft) {
    const propertyId = addProperty('SLOT', draft.name, '')
    const componentSetId = componentSet?.id
    if (!propertyId || !componentSetId) return propertyId
    patchDefinitions(componentSetId, 'Add property', (definitions) =>
      definitions.map((definition) =>
        definition.id === propertyId
          ? applySlotDraft(definition, { ...draft, name: definition.name })
          : definition
      )
    )
    return propertyId
  }

  function updateSlotProperty(propertyId: string, draft: SlotPropertyDraft) {
    const componentSetId = componentSet?.id
    if (!componentSetId) return false
    const current = editor
      .getComponentSetPropertyDefs(componentSetId)
      .find((definition) => definition.id === propertyId)
    if (!current || current.type !== 'SLOT') return false
    return patchDefinitions(componentSetId, `Change ${draft.name.trim() || current.name}`, (definitions) =>
      definitions.map((definition) =>
        definition.id === propertyId ? applySlotDraft(definition, draft) : definition
      )
    )
  }

  function renameProperty(propertyId: string, name: string) {
    const componentSetId = componentSet?.id
    return componentSetId
      ? editor.renamePropertyDefinition(componentSetId, propertyId, name)
      : false
  }

  function removeProperty(propertyId: string) {
    const componentSetId = componentSet?.id
    return componentSetId ? editor.removePropertyDefinition(componentSetId, propertyId) : false
  }

  function reorderProperties(propertyIds: string[]) {
    const componentSetId = componentSet?.id
    return componentSetId ? editor.reorderPropertyDefinitions(componentSetId, propertyIds) : false
  }

  function renameValue(propertyId: string, previousValue: string, value: string) {
    const componentSetId = componentSet?.id
    return componentSetId
      ? editor.renameVariantValue(componentSetId, propertyId, previousValue, value)
      : false
  }

  function reorderValues(propertyId: string, values: string[]) {
    const componentSetId = componentSet?.id
    return componentSetId ? editor.reorderVariantValues(componentSetId, propertyId, values) : false
  }

  function setPropertyDefaultValue(propertyId: string, value: string) {
    const componentSetId = componentSet?.id
    if (!componentSetId) return false
    const definitions = editor.getComponentSetPropertyDefs(componentSetId)
    const definition = definitions.find((item) => item.id === propertyId)
    if (!definition || definition.type === 'VARIANT' || definition.defaultValue === value) {
      return false
    }
    const previous = structuredClone(definitions)
    const next = definitions.map((item) =>
      item.id === propertyId ? { ...item, defaultValue: value } : item
    )
    editor.graph.updateNode(componentSetId, { componentPropertyDefinitions: next })
    editor.undo.push({
      label: `Change ${definition.name}`,
      forward: () => {
        editor.graph.updateNode(componentSetId, {
          componentPropertyDefinitions: structuredClone(next)
        })
        editor.requestRender()
      },
      inverse: () => {
        editor.graph.updateNode(componentSetId, {
          componentPropertyDefinitions: structuredClone(previous)
        })
        editor.requestRender()
      }
    })
    editor.requestRender()
    return true
  }

  function applyVariantValue(propertyId: string, value: string) {
    const variantId = variant?.id
    const componentSetId = componentSet?.id
    const definition = definitions.find((item) => item.id === propertyId)
    const live = variantId ? editor.graph.getNode(variantId) : null
    if (!variantId || !componentSetId || !definition || live?.type !== 'COMPONENT') {
      return { kind: 'invalid' as const }
    }
    const currentValues = Object.fromEntries(
      definitions
        .filter((item) => item.type === 'VARIANT')
        .map((item) => [item.name, live.componentPropertyValues[item.name] ?? ''])
    )
    const resolved = resolveVariantAuthoringChange(
      variantId,
      currentValues,
      definition.name,
      value,
      (values) => editor.findVariantByValues(componentSetId, values)
    )
    if (resolved.kind === 'select') {
      editor.select([resolved.id])
      return { kind: 'selected' as const, componentId: resolved.id }
    }
    return editor.setVariantPropertyValue(variantId, propertyId, resolved.value)
  }

  function addVariant() {
    const componentSetId = componentSet?.id
    return componentSetId ? editor.addVariant(componentSetId) : undefined
  }

  function duplicateVariant() {
    const source = variant ?? editor.getDefaultVariantForComponentSet(componentSet?.id ?? '')
    return source ? editor.duplicateVariant(source.id) : undefined
  }

  function removeVariant() {
    return variant ? editor.removeVariant(variant.id) : false
  }

  return {
    active,
    componentSet,
    variant,
    definitions,
    diagnostics,
    addProperty,
    addSlotProperty,
    updateSlotProperty,
    renameProperty,
    removeProperty,
    reorderProperties,
    renameValue,
    reorderValues,
    setPropertyDefaultValue,
    applyVariantValue,
    addVariant,
    duplicateVariant,
    removeVariant
  }
}
