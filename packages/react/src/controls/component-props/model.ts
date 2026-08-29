import type {
  ComponentPropertyDefinition,
  ComponentPropertyReference,
  ComponentPropertyReferenceField,
  ComponentPropertyType,
  SceneNode
} from '@open-pencil/scene-graph'

import { MIXED, type MixedValue } from '#react/controls/mixed'

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
  type: ComponentPropertyType
  defaultValue: string
  values: string[]
}

export function orderedVariantValues(
  preferred: string[] | undefined,
  present: Iterable<string> | undefined
): string[] {
  const seen = new Set(present ?? [])
  return [
    ...(preferred ?? []).filter((value) => seen.has(value)),
    ...[...seen].filter((value) => !preferred?.includes(value))
  ]
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

export function referencedDescendantText(
  root: SceneNode,
  propertyId: string,
  getChildren: (id: string) => SceneNode[]
): string | undefined {
  if (
    root.type === 'TEXT' &&
    root.componentPropertyReferences.some(
      (reference) => reference.propertyId === propertyId && reference.field === 'TEXT'
    )
  ) {
    return root.text
  }
  for (const child of getChildren(root.id)) {
    const found = referencedDescendantText(child, propertyId, getChildren)
    if (found !== undefined) return found
  }
}

export function instanceTextPropertyValue(
  instance: SceneNode,
  definition: ComponentPropertyDefinition,
  getChildren: (id: string) => SceneNode[]
): string {
  const assigned = instance.componentPropertyAssignments[definition.id]
  if (assigned !== undefined) return assigned
  return referencedDescendantText(instance, definition.id, getChildren) ?? definition.defaultValue
}

const VISIBILITY_BIND_SKIP = new Set(['COMPONENT', 'COMPONENT_SET', 'PAGE', 'SECTION'])

export function canBindVisibleProperty(node: SceneNode): boolean {
  return !VISIBILITY_BIND_SKIP.has(node.type)
}

export function propertyIdForField(
  node: SceneNode,
  field: ComponentPropertyReferenceField
): string | undefined {
  return node.componentPropertyReferences.find((reference) => reference.field === field)?.propertyId
}

export function visiblePropertyId(node: SceneNode): string | undefined {
  return propertyIdForField(node, 'VISIBLE')
}

export function textPropertyId(node: SceneNode): string | undefined {
  return propertyIdForField(node, 'TEXT')
}

export function canBindTextProperty(node: SceneNode): boolean {
  return node.type === 'TEXT'
}

export function withPropertyReference(
  references: ComponentPropertyReference[],
  field: ComponentPropertyReferenceField,
  propertyId: string | null
): ComponentPropertyReference[] {
  const next = references.filter((reference) => reference.field !== field)
  if (propertyId) next.push({ propertyId, field })
  return next
}

export function referencedDescendantVisible(
  root: SceneNode,
  propertyId: string,
  getChildren: (id: string) => SceneNode[]
): string | undefined {
  if (
    root.componentPropertyReferences.some(
      (reference) => reference.propertyId === propertyId && reference.field === 'VISIBLE'
    )
  ) {
    return String(root.visible)
  }
  for (const child of getChildren(root.id)) {
    const found = referencedDescendantVisible(child, propertyId, getChildren)
    if (found !== undefined) return found
  }
}

export function instanceBooleanPropertyValue(
  instance: SceneNode,
  definition: ComponentPropertyDefinition,
  getChildren: (id: string) => SceneNode[]
): string {
  const assigned = instance.componentPropertyAssignments[definition.id]
  if (assigned !== undefined) return assigned
  return referencedDescendantVisible(instance, definition.id, getChildren) ?? definition.defaultValue
}

export function findFirstUnboundDescendant(
  root: SceneNode,
  field: ComponentPropertyReferenceField,
  getChildren: (id: string) => SceneNode[],
  skipRoot = true
): SceneNode | undefined {
  const matchesField =
    field === 'TEXT'
      ? root.type === 'TEXT'
      : field === 'VISIBLE'
        ? !VISIBILITY_BIND_SKIP.has(root.type)
        : false
  if (
    !skipRoot &&
    matchesField &&
    !root.componentPropertyReferences.some((reference) => reference.field === field)
  ) {
    return root
  }
  for (const child of getChildren(root.id)) {
    const found = findFirstUnboundDescendant(child, field, getChildren, false)
    if (found) return found
  }
}

export function propertyDefinitionOwners(
  node: SceneNode,
  getNode: (id: string) => SceneNode | undefined
): SceneNode[] {
  let current: SceneNode | undefined = node
  let sawInstance = false
  let component: SceneNode | undefined
  while (current) {
    if (current.type === 'INSTANCE') sawInstance = true
    if (current.type === 'COMPONENT' || current.type === 'COMPONENT_SET') {
      component = current
      break
    }
    current = current.parentId ? getNode(current.parentId) : undefined
  }
  if (!component || sawInstance) return []
  if (component.type === 'COMPONENT_SET') return [component]
  const parent = component.parentId ? getNode(component.parentId) : undefined
  return parent?.type === 'COMPONENT_SET' ? [parent, component] : [component]
}

export function propertyDefinitionsOfType(
  owners: SceneNode[],
  type: ComponentPropertyType
): ComponentPropertyDefinition[] {
  const byId = new Map<string, ComponentPropertyDefinition>()
  for (const owner of owners) {
    for (const definition of owner.componentPropertyDefinitions) {
      if (definition.type === type && !byId.has(definition.id)) {
        byId.set(definition.id, definition)
      }
    }
  }
  return [...byId.values()]
}

export function booleanPropertyDefinitions(owners: SceneNode[]): ComponentPropertyDefinition[] {
  return propertyDefinitionsOfType(owners, 'BOOLEAN')
}

export function textPropertyDefinitions(owners: SceneNode[]): ComponentPropertyDefinition[] {
  return propertyDefinitionsOfType(owners, 'TEXT')
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

export function instanceVariantOptions(
  availability: { value: string; available: boolean }[],
  fallbackOptions: string[],
  currentValue: string
): ComponentPropertyOption[] {
  const seen = new Set<string>()
  const options: ComponentPropertyOption[] = []
  for (const item of availability) {
    seen.add(item.value)
    options.push({ value: item.value, label: item.value, disabled: !item.available })
  }
  for (const value of fallbackOptions) {
    if (!value || seen.has(value)) continue
    seen.add(value)
    options.push({ value, label: value })
  }
  if (currentValue && !seen.has(currentValue)) {
    options.push({ value: currentValue, label: currentValue })
  }
  return options
}

export function uniquePropertyName(existing: string[], base: string): string {
  if (!existing.includes(base)) return base
  const numbered = /^(.*) (\d+)$/.exec(base)
  const prefix = numbered?.[1] ?? base
  let index = numbered ? Number(numbered[2]) + 1 : 2
  while (existing.includes(`${prefix} ${index}`)) index += 1
  return `${prefix} ${index}`
}

export function resolveVariantAuthoringChange(
  currentId: string,
  currentValues: Record<string, string>,
  propertyName: string,
  value: string,
  findVariant: (values: Record<string, string>) => { id: string } | undefined
): { kind: 'select'; id: string } | { kind: 'set'; value: string } {
  const existing = findVariant({ ...currentValues, [propertyName]: value })
  if (existing && existing.id !== currentId) return { kind: 'select', id: existing.id }
  return { kind: 'set', value }
}
