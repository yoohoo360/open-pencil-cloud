import type { SceneGraph } from '../index'
import { getInstanceOverride, setInstanceOverride } from '../instance-overrides'
import { findInstanceAncestor } from '../instances.override'
import { instanceMainComponent } from '../instances/main-component'
import { randomHex } from '../random'
import type {
  ComponentPropertyDefinition,
  ComponentPropertyReferenceField,
  ComponentPropertyType,
  SceneNode
} from '../types'

export interface ComponentPropertyTarget {
  node: SceneNode
  field: ComponentPropertyReferenceField
  source: SceneNode
}

const FIELD_FOR_TYPE: Partial<Record<ComponentPropertyType, ComponentPropertyReferenceField>> = {
  TEXT: 'TEXT',
  BOOLEAN: 'VISIBLE',
  INSTANCE_SWAP: 'INSTANCE_SWAP',
  SLOT: 'SLOT_CONTENT'
}

const TYPE_FOR_FIELD: Record<ComponentPropertyReferenceField, ComponentPropertyType> = {
  TEXT: 'TEXT',
  VISIBLE: 'BOOLEAN',
  INSTANCE_SWAP: 'INSTANCE_SWAP',
  SLOT_CONTENT: 'SLOT'
}

export function componentPropertyOwners(graph: SceneGraph, instance: SceneNode): SceneNode[] {
  if (instance.type !== 'INSTANCE') return []
  const component = instanceMainComponent(graph, instance)
  if (!component) return []
  const parent = component.parentId ? graph.getNode(component.parentId) : null
  return parent?.type === 'COMPONENT_SET' ? [parent, component] : [component]
}

/**
 * Drop duplicate definitions from historical corruption: same id twice, or the same
 * display name copied onto both a component set and one of its variants.
 */
export function uniqueComponentPropertyDefinitions(
  definitions: readonly ComponentPropertyDefinition[]
): ComponentPropertyDefinition[] {
  const byId = new Map<string, ComponentPropertyDefinition>()
  const names = new Set<string>()
  for (const definition of definitions) {
    if (byId.has(definition.id) || names.has(definition.name)) continue
    byId.set(definition.id, definition)
    names.add(definition.name)
  }
  return [...byId.values()]
}

export function componentPropertyDefinitions(
  graph: SceneGraph,
  instance: SceneNode
): ComponentPropertyDefinition[] {
  // Component-set first, then the variant: set-owned defs win on name collisions.
  return uniqueComponentPropertyDefinitions(
    componentPropertyOwners(graph, instance).flatMap((owner) => owner.componentPropertyDefinitions)
  )
}

/**
 * Historical docs can bind layers to an older property id while the panel / assignments use a
 * newer set- or variant-owned id of the same property. Treat those ids as one property.
 */
export function componentPropertyReferenceIds(
  graph: SceneGraph,
  instance: SceneNode,
  propertyId: string
): ReadonlySet<string> {
  const ids = new Set<string>([propertyId])
  if (instance.type !== 'INSTANCE') return ids
  const owners = componentPropertyOwners(graph, instance)
  const allDefinitions = owners.flatMap((owner) => owner.componentPropertyDefinitions)
  const unique = uniqueComponentPropertyDefinitions(allDefinitions)
  const knownIds = new Set(allDefinitions.map((definition) => definition.id))

  let definition =
    unique.find((item) => item.id === propertyId) ??
    allDefinitions.find((item) => item.id === propertyId)

  const component = instanceMainComponent(graph, instance)
  if (!definition && component) {
    let orphanField: ComponentPropertyReferenceField | undefined
    let orphanNodeName: string | undefined
    const visitOrphan = (node: SceneNode): boolean => {
      for (const reference of node.componentPropertyReferences) {
        if (reference.propertyId !== propertyId) continue
        orphanField = reference.field
        orphanNodeName = node.name
        return true
      }
      for (const child of graph.getChildren(node.id)) {
        if (visitOrphan(child)) return true
      }
      return false
    }
    visitOrphan(component)
    if (orphanField) {
      const type = TYPE_FOR_FIELD[orphanField]
      const sameType = unique.filter((item) => item.type === type)
      definition =
        sameType.length === 1
          ? sameType[0]
          : sameType.find((item) => item.name === orphanNodeName)
    }
  }

  if (!definition) return ids

  for (const item of allDefinitions) {
    if (item.name === definition.name && item.type === definition.type) ids.add(item.id)
  }

  const field = FIELD_FOR_TYPE[definition.type]
  if (!field || !component) return ids

  const sameType = unique.filter((item) => item.type === definition.type)
  const visit = (node: SceneNode): void => {
    for (const reference of node.componentPropertyReferences) {
      if (reference.field !== field || knownIds.has(reference.propertyId)) continue
      if (
        (sameType.length === 1 && sameType[0]?.id === definition.id) ||
        node.name === definition.name
      ) {
        ids.add(reference.propertyId)
      }
    }
    for (const child of graph.getChildren(node.id)) visit(child)
  }
  visit(component)
  return ids
}

/** Assignment stored under any historical id for this property. */
export function instanceComponentPropertyAssignment(
  graph: SceneGraph,
  instance: SceneNode,
  propertyId: string
): string | undefined {
  if (instance.type !== 'INSTANCE') return undefined
  for (const id of componentPropertyReferenceIds(graph, instance, propertyId)) {
    if (Object.hasOwn(instance.componentPropertyAssignments, id)) {
      return instance.componentPropertyAssignments[id]
    }
  }
}

export function resolveComponentPropertyValue(graph: SceneGraph, value: string): SceneNode | null {
  const direct = graph.getNode(value)
  if (direct?.type === 'COMPONENT') return direct
  if (direct?.type === 'COMPONENT_SET') {
    const componentId = direct.childIds.find((id) => graph.getNode(id)?.type === 'COMPONENT')
    return componentId ? (graph.getNode(componentId) ?? null) : null
  }
  for (const node of graph.getAllNodes()) {
    if (
      node.type === 'COMPONENT' &&
      (node.componentKey === value || node.sourceLibraryKey === value || node.source.id === value)
    ) {
      return node
    }
  }
  return null
}

export function findComponentPropertyTarget(
  graph: SceneGraph,
  instance: SceneNode,
  propertyId: string
): ComponentPropertyTarget | null {
  return findComponentPropertyTargets(graph, instance, propertyId)[0] ?? null
}

export function findComponentPropertyTargets(
  graph: SceneGraph,
  instance: SceneNode,
  propertyId: string
): ComponentPropertyTarget[] {
  if (instance.type !== 'INSTANCE' || !instance.componentId) return []
  const component = graph.getNode(instance.componentId)
  if (!component) return []
  const referenceIds = componentPropertyReferenceIds(graph, instance, propertyId)
  const targets: ComponentPropertyTarget[] = []
  const visit = (sourceParent: SceneNode, instanceParent: SceneNode): void => {
    // Only identities that belong to this source parent count. Sibling nested instances
    // often share a main-component id; treating that as a source link throws falsely.
    // Duplicate historical links keep the last child, matching instance sync.
    const sourceChildIds = new Set(sourceParent.childIds)
    const bySource = new Map<string, SceneNode>()
    for (const child of graph.getChildren(instanceParent.id)) {
      const mapped = getInstanceOverride(
        instance.instanceOverrides,
        instance.id,
        child.id,
        'sourceComponentId'
      )
      const sourceId = typeof mapped === 'string' ? mapped : child.componentId
      if (!sourceId || !sourceChildIds.has(sourceId)) continue
      bySource.set(sourceId, child)
    }
    for (const childId of sourceParent.childIds) {
      const source = graph.getNode(childId)
      const target = bySource.get(childId)
      if (!source || !target) continue
      const reference = source.componentPropertyReferences.find((candidate) =>
        referenceIds.has(candidate.propertyId)
      )
      if (reference) targets.push({ node: target, field: reference.field, source })
      visit(source, target)
    }
  }
  visit(component, instance)
  return targets
}

function applyTextProperty(
  graph: SceneGraph,
  owner: SceneNode,
  targets: ComponentPropertyTarget[],
  value: string
): void {
  for (const item of targets) {
    if (item.field !== 'TEXT' || item.node.type !== 'TEXT') continue
    graph.updateNode(item.node.id, { text: value })
    if (findInstanceAncestor(graph, item.node.id)) {
      setInstanceOverride(owner.instanceOverrides, owner.id, item.node.id, 'text', value)
    }
  }
}

function applyBooleanProperty(
  graph: SceneGraph,
  owner: SceneNode,
  targets: ComponentPropertyTarget[],
  value: string
): void {
  for (const item of targets) {
    if (item.field !== 'VISIBLE') continue
    const instance = findInstanceAncestor(graph, item.node.id)
    graph.updateNode(item.node.id, { visible: value === 'true' })
    if (instance) {
      setInstanceOverride(
        owner.instanceOverrides,
        owner.id,
        item.node.id,
        'visible',
        value === 'true'
      )
    }
  }
}

function applyInstanceSwapProperty(
  graph: SceneGraph,
  owner: SceneNode,
  targets: ComponentPropertyTarget[],
  target: SceneNode
): void {
  for (const item of targets) {
    if (item.field !== 'INSTANCE_SWAP' || item.node.type !== 'INSTANCE') continue
    graph.swapInstanceComponent(item.node.id, target.id)
    setInstanceOverride(owner.instanceOverrides, owner.id, item.node.id, 'name', target.name)
    setInstanceOverride(owner.instanceOverrides, owner.id, item.node.id, 'componentId', target.id)
    setInstanceOverride(
      owner.instanceOverrides,
      owner.id,
      item.node.id,
      'sourceComponentId',
      item.source.id
    )
    graph.updateNode(owner.id, { instanceOverrides: owner.instanceOverrides })
  }
}

export function applyComponentPropertyValue(
  graph: SceneGraph,
  instanceId: string,
  definition: ComponentPropertyDefinition,
  value: string
): SceneNode | null {
  const instance = graph.getNode(instanceId)
  if (instance?.type !== 'INSTANCE') return null
  if (definition.type === 'VARIANT') return null
  const targets = findComponentPropertyTargets(graph, instance, definition.id)
  const target =
    definition.type === 'INSTANCE_SWAP' ? resolveComponentPropertyValue(graph, value) : null
  if (definition.type === 'INSTANCE_SWAP' && !target) return null
  if (definition.type === 'TEXT') {
    applyTextProperty(graph, instance, targets, value)
  } else if (definition.type === 'BOOLEAN') {
    applyBooleanProperty(graph, instance, targets, value)
  } else if (target) {
    applyInstanceSwapProperty(graph, instance, targets, target)
  }
  graph.updateNode(instance.id, {
    componentPropertyAssignments: {
      ...instance.componentPropertyAssignments,
      [definition.id]: definition.type === 'INSTANCE_SWAP' && target ? target.id : value
    }
  })
  return definition.type === 'INSTANCE_SWAP' ? target : instance
}

function componentSubtree(graph: SceneGraph, componentId: string): SceneNode[] {
  const component = graph.getNode(componentId)
  if (!component) return []
  const nodes = [component]
  const visit = (node: SceneNode): void => {
    for (const child of graph.getChildren(node.id)) {
      nodes.push(child)
      visit(child)
    }
  }
  visit(component)
  return nodes
}

function componentInstances(graph: SceneGraph, componentId: string): SceneNode[] {
  return [...graph.getAllNodes()].filter(
    (node) => node.type === 'INSTANCE' && node.componentId === componentId
  )
}

function removePropertyFromNode(graph: SceneGraph, node: SceneNode, propertyId: string): void {
  if (node.componentPropertyReferences.some((reference) => reference.propertyId === propertyId)) {
    graph.updateNode(node.id, {
      componentPropertyReferences: node.componentPropertyReferences.filter(
        (reference) => reference.propertyId !== propertyId
      )
    })
  }
  if (node.type === 'INSTANCE' && propertyId in node.componentPropertyAssignments) {
    graph.updateNode(node.id, {
      componentPropertyAssignments: Object.fromEntries(
        Object.entries(node.componentPropertyAssignments).filter(([id]) => id !== propertyId)
      )
    })
  }
}

export function removeComponentProperty(
  graph: SceneGraph,
  ownerId: string,
  propertyId: string
): boolean {
  const owner = graph.getNode(ownerId)
  if (!owner || (owner.type !== 'COMPONENT' && owner.type !== 'COMPONENT_SET')) return false
  graph.updateNode(owner.id, {
    componentPropertyDefinitions: owner.componentPropertyDefinitions.filter(
      (definition) => definition.id !== propertyId
    )
  })
  const nodes = [
    ...componentSubtree(graph, owner.id),
    ...componentInstances(graph, owner.id),
    ...(owner.type === 'COMPONENT_SET'
      ? owner.childIds.flatMap((id) => [
          ...componentSubtree(graph, id),
          ...componentInstances(graph, id)
        ])
      : [])
  ]
  for (const node of nodes) removePropertyFromNode(graph, node, propertyId)
  return true
}

/** A new component property ID, in the `prop:` form the editor, plugin API, and design JSX share. */
export function createComponentPropertyId(): string {
  return `prop:${randomHex(8)}`
}
