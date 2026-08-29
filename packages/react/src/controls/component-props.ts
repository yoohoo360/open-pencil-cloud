import type { VariantConflict } from '@open-pencil/core/editor'
import type {
  ComponentPropertyDefinition,
  ComponentPropertyType,
  SceneNode
} from '@open-pencil/scene-graph'

import { MIXED, type MixedValue } from '#react/controls/mixed'
import { useEditor } from '#react/editor/context'
import { useSceneComputed } from '#react/internal/scene-computed/use'

export interface ComponentPropertyOption {
  value: string
  label: string
  missing?: boolean
  disabled?: boolean
}

export interface ComponentPropertyControl {
  id: string
  name: string
  type: ComponentPropertyType
  value: MixedValue<string>
  options: ComponentPropertyOption[]
}

export interface VariantDefinitionControl {
  id: string
  name: string
  values: string[]
}

export function compatibleComponentPropertyDefinitions(
  definitions: ComponentPropertyDefinition[][]
): ComponentPropertyDefinition[] {
  if (definitions.length === 0) return []
  const first = definitions[0]
  const signature = (items: ComponentPropertyDefinition[]) =>
    items.map((item) => `${item.id}:${item.type}`).join('\u0000')
  const expected = signature(first)
  return definitions.every((items) => signature(items) === expected) ? first : []
}

export function mergedComponentPropertyValue(values: string[]): MixedValue<string> {
  const first = values[0] ?? ''
  return values.every((value) => value === first) ? first : MIXED
}

export function instanceSwapOptions(
  components: SceneNode[],
  definition: ComponentPropertyDefinition,
  value: string
): ComponentPropertyOption[] {
  const preferred = new Set(definition.preferredValues ?? [])
  const options: ComponentPropertyOption[] = components
    .filter((node) => node.type === 'COMPONENT')
    .map((node) => ({
      value: node.id,
      label: node.name,
      preferred:
        preferred.has(node.componentKey ?? '') || preferred.has(node.sourceLibraryKey ?? '')
    }))
    .sort(
      (left, right) =>
        Number(right.preferred) - Number(left.preferred) || left.label.localeCompare(right.label)
    )
    .map(({ value: optionValue, label }) => ({ value: optionValue, label }))
  if (value && !options.some((option) => option.value === value)) {
    options.push({ value, label: value, missing: true })
  }
  return options
}

function variantOptions(editor: ReturnType<typeof useEditor>, instance: SceneNode, name: string) {
  return editor.getVariantOptionAvailability(instance.id, name).map(({ value, available }) => ({
    value,
    label: value,
    disabled: !available
  }))
}

export function useComponentProperties() {
  const editor = useEditor()
  const instances = useSceneComputed(() =>
    editor.getSelectedNodes().filter((node) => node.type === 'INSTANCE')
  )
  const selectedCount = editor.state.selectedIds.size
  const definitionSets = useSceneComputed(() =>
    instances.map((instance) => editor.getInstanceComponentPropertyDefinitions(instance.id))
  )
  const definitions = compatibleComponentPropertyDefinitions(definitionSets)
  const active =
    instances.length > 0 && instances.length === selectedCount && definitions.length > 0
  const controls = useSceneComputed<ComponentPropertyControl[]>(() => {
    if (!active || instances.length === 0) return []
    const firstInstance = instances[0]
    return definitions.map((definition) => {
      const values = instances.map((instance) =>
        editor.getInstanceComponentPropertyValue(instance.id, definition)
      )
      const value = mergedComponentPropertyValue(values)
      let options: ComponentPropertyOption[] = []
      if (definition.type === 'VARIANT') {
        options = variantOptions(editor, firstInstance, definition.name)
      } else if (definition.type === 'INSTANCE_SWAP') {
        options = instanceSwapOptions(
          [...editor.graph.getAllNodes()],
          definition,
          value === MIXED ? '' : value
        )
      }
      return {
        id: definition.id,
        name: definition.name,
        type: definition.type,
        value,
        options
      }
    })
  })

  function setValue(propertyId: string, value: string) {
    if (!active) return
    const targets = [...instances]
    const definition = definitions.find((item) => item.id === propertyId)
    if (!definition) return
    const label = `Change ${definition.name}`
    const run = () => {
      for (const instance of targets) {
        editor.setInstanceComponentProperty(instance.id, propertyId, value)
      }
    }
    if (targets.length > 1) editor.undo.runBatch(label, run)
    else run()
  }

  return { active, controls, setValue }
}

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
    return editor
      .getComponentSetPropertyDefs(componentSetId)
      .filter(
        (definition): definition is ComponentPropertyDefinition => definition.type === 'VARIANT'
      )
      .map((definition) => ({
        id: definition.id,
        name: definition.name,
        values: [...(values.get(definition.name) ?? [])]
      }))
  })
  const diagnostics = useSceneComputed<VariantConflict[]>(() => {
    const componentSetId = componentSet?.id
    return componentSetId ? editor.getComponentSetVariantConflicts(componentSetId) : []
  })

  function addProperty(name: string, initialValue: string) {
    const componentSetId = componentSet?.id
    if (componentSetId) editor.addPropertyDefinition(componentSetId, name, 'VARIANT', initialValue)
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

  function setVariantValue(propertyId: string, value: string) {
    const variantId = variant?.id
    return variantId
      ? editor.setVariantPropertyValue(variantId, propertyId, value)
      : { kind: 'invalid' as const }
  }

  function addVariant() {
    const componentSetId = componentSet?.id
    return componentSetId ? editor.addVariant(componentSetId) : undefined
  }

  function duplicateVariant() {
    const source =
      variant ?? editor.getDefaultVariantForComponentSet(componentSet?.id ?? '')
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
    renameProperty,
    removeProperty,
    reorderProperties,
    renameValue,
    reorderValues,
    setVariantValue,
    addVariant,
    duplicateVariant,
    removeVariant
  }
}
