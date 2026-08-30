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
  insertable?: boolean
  preferredValues?: string[]
  onlyPreferredInstances?: boolean
  boundLayerNames?: string[]
}

export interface VariantDefinitionControl {
  id: string
  name: string
  type: ComponentPropertyType
  defaultValue: string
  values: string[]
  description?: string
  preferredValues?: string[]
  slotMinLayers?: number
  slotMaxLayers?: number
  onlyPreferredInstances?: boolean
  emptySlotByDefault?: boolean
  fillCounterAxisByDefault?: boolean
}

export interface SlotPropertyDraft {
  name: string
  description: string
  preferredValues: string[]
  slotMinLayers?: number
  slotMaxLayers?: number
  onlyPreferredInstances: boolean
  emptySlotByDefault: boolean
  fillCounterAxisByDefault: boolean
}

export function emptySlotDraft(name: string): SlotPropertyDraft {
  return {
    name,
    description: '',
    preferredValues: [],
    onlyPreferredInstances: false,
    emptySlotByDefault: false,
    fillCounterAxisByDefault: false
  }
}

export function slotDraftFromDefinition(
  definition: Pick<
    ComponentPropertyDefinition,
    | 'name'
    | 'description'
    | 'preferredValues'
    | 'slotMinLayers'
    | 'slotMaxLayers'
    | 'onlyPreferredInstances'
    | 'emptySlotByDefault'
    | 'fillCounterAxisByDefault'
  >
): SlotPropertyDraft {
  return {
    name: definition.name,
    description: definition.description ?? '',
    preferredValues: [...(definition.preferredValues ?? [])],
    slotMinLayers: definition.slotMinLayers,
    slotMaxLayers: definition.slotMaxLayers,
    onlyPreferredInstances: definition.onlyPreferredInstances ?? false,
    emptySlotByDefault: definition.emptySlotByDefault ?? false,
    fillCounterAxisByDefault: definition.fillCounterAxisByDefault ?? false
  }
}

export function applySlotDraft(
  definition: ComponentPropertyDefinition,
  draft: SlotPropertyDraft
): ComponentPropertyDefinition {
  const name = draft.name.trim() || definition.name
  return {
    ...definition,
    name,
    description: draft.description,
    preferredValues: [...draft.preferredValues],
    slotMinLayers: draft.slotMinLayers,
    slotMaxLayers: draft.slotMaxLayers,
    onlyPreferredInstances: draft.onlyPreferredInstances,
    emptySlotByDefault: draft.emptySlotByDefault,
    fillCounterAxisByDefault: draft.fillCounterAxisByDefault
  }
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

export function findNodesBoundToProperty(
  root: SceneNode,
  propertyId: string,
  getChildren: (id: string) => SceneNode[]
): SceneNode[] {
  const found: SceneNode[] = []
  const seen = new Set<string>()
  function walk(node: SceneNode) {
    if (seen.has(node.id)) return
    seen.add(node.id)
    if (node.componentPropertyReferences.some((reference) => reference.propertyId === propertyId)) {
      found.push(node)
    }
    for (const child of getChildren(node.id)) walk(child)
  }
  walk(root)
  return found
}

export function boundLayerNamesForProperty(
  roots: readonly SceneNode[],
  propertyId: string,
  getChildren: (id: string) => SceneNode[]
): string[] {
  const names: string[] = []
  const seen = new Set<string>()
  for (const root of roots) {
    for (const node of findNodesBoundToProperty(root, propertyId, getChildren)) {
      if (node.id === root.id || seen.has(node.name)) continue
      seen.add(node.name)
      names.push(node.name)
    }
  }
  return names
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

export function canBindInstanceSwapProperty(node: SceneNode): boolean {
  return node.type === 'INSTANCE'
}

export function canBindSlotProperty(node: SceneNode): boolean {
  return node.type === 'FRAME'
}

export function resolveInstanceSwapComponentId(
  node: SceneNode,
  getNode: (id: string) => SceneNode | undefined
): string | undefined {
  if (node.type !== 'INSTANCE' || !node.componentId) return undefined
  const target = getNode(node.componentId)
  if (target?.type === 'COMPONENT') return target.id
  if (target?.type === 'INSTANCE') return target.componentId ?? undefined
}

export function findReferencedSwapInstance(
  root: SceneNode,
  propertyId: string,
  getChildren: (id: string) => SceneNode[],
  seen = new Set<string>()
): SceneNode | undefined {
  if (seen.has(root.id)) return
  seen.add(root.id)
  if (
    root.type === 'INSTANCE' &&
    root.componentPropertyReferences.some(
      (reference) =>
        reference.propertyId === propertyId &&
        (reference.field === 'INSTANCE_SWAP' || reference.field === 'SLOT')
    )
  ) {
    return root
  }
  for (const child of getChildren(root.id)) {
    const found = findReferencedSwapInstance(child, propertyId, getChildren, seen)
    if (found) return found
  }
}

export function referencedDescendantSwap(
  root: SceneNode,
  propertyId: string,
  getChildren: (id: string) => SceneNode[],
  getNode: (id: string) => SceneNode | undefined
): string | undefined {
  const nested = findReferencedSwapInstance(root, propertyId, getChildren)
  return nested ? resolveInstanceSwapComponentId(nested, getNode) : undefined
}

export function instanceSwapPropertyValue(
  instance: SceneNode,
  definition: ComponentPropertyDefinition,
  getChildren: (id: string) => SceneNode[],
  getNode: (id: string) => SceneNode | undefined
): string {
  const assigned = instance.componentPropertyAssignments[definition.id]
  if (assigned !== undefined) return assigned
  return (
    referencedDescendantSwap(instance, definition.id, getChildren, getNode) ?? definition.defaultValue
  )
}

export function findFirstUnboundDescendant(
  root: SceneNode,
  field: ComponentPropertyReferenceField,
  getChildren: (id: string) => SceneNode[],
  skipRoot = true,
  seen = new Set<string>()
): SceneNode | undefined {
  if (seen.has(root.id)) return
  seen.add(root.id)
  const matchesField =
    field === 'TEXT'
      ? root.type === 'TEXT'
      : field === 'VISIBLE'
        ? !VISIBILITY_BIND_SKIP.has(root.type)
        : field === 'INSTANCE_SWAP'
          ? root.type === 'INSTANCE'
          : field === 'SLOT'
            ? root.type === 'FRAME'
            : false
  if (
    !skipRoot &&
    matchesField &&
    !root.componentPropertyReferences.some((reference) => reference.field === field)
  ) {
    return root
  }
  for (const child of getChildren(root.id)) {
    const found = findFirstUnboundDescendant(child, field, getChildren, false, seen)
    if (found) return found
  }
}

export function propertyDefinitionOwners(
  node: SceneNode,
  getNode: (id: string) => SceneNode | undefined
): SceneNode[] {
  let current: SceneNode | undefined = node
  let sawInstance = false
  let started = true
  let component: SceneNode | undefined
  const seen = new Set<string>()
  while (current) {
    if (seen.has(current.id)) break
    seen.add(current.id)
    if (!started && current.type === 'INSTANCE') sawInstance = true
    started = false
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

export function ancestorPublishedInstance(
  node: SceneNode,
  getNode: (id: string) => SceneNode | undefined
): SceneNode | undefined {
  let current = node.parentId ? getNode(node.parentId) : undefined
  const seen = new Set<string>()
  while (current) {
    if (seen.has(current.id)) return
    seen.add(current.id)
    if (current.type === 'INSTANCE') return current
    current = current.parentId ? getNode(current.parentId) : undefined
  }
}

export function isSwapPropertyType(type: ComponentPropertyType): boolean {
  return type === 'INSTANCE_SWAP' || type === 'SLOT'
}

export function isSwapReferenceField(field: ComponentPropertyReferenceField): boolean {
  return field === 'INSTANCE_SWAP' || field === 'SLOT'
}

export function instanceSwapOptions(
  components: SceneNode[],
  definition: Pick<ComponentPropertyDefinition, 'preferredValues'>,
  value: string,
  excludeIds: Iterable<string> = []
): ComponentPropertyOption[] {
  const preferred = new Set(definition.preferredValues ?? [])
  const excluded = new Set(excludeIds)
  const options: ComponentPropertyOption[] = components
    .filter((node) => node.type === 'COMPONENT' && !excluded.has(node.id))
    .filter(
      (node) =>
        preferred.size === 0 ||
        preferred.has(node.id) ||
        preferred.has(node.componentKey ?? '') ||
        preferred.has(node.sourceLibraryKey ?? '') ||
        node.id === value
    )
    .map((node) => ({
      value: node.id,
      label: node.name,
      preferred:
        preferred.has(node.id) ||
        preferred.has(node.componentKey ?? '') ||
        preferred.has(node.sourceLibraryKey ?? '')
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
