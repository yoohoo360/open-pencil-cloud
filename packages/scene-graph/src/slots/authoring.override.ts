import type { SceneGraph } from '../index'
import type { ComponentPropertyDefinition, SceneNode, SlotSettings } from '../types'
import { slotPropertyId } from './frames.override'

/** The settings a new slot starts with: no limits, any layer allowed. */
export const DEFAULT_SLOT_SETTINGS: SlotSettings = {
  allowPreferredValuesOnly: false,
  displayEmptyByDefault: false,
  stretchChildOnInsert: false
}

/**
 * The main component a layer belongs to, which defines the slots inside it. Layers of an
 * instance are not authored there, so a layer under an instance has none.
 */
export function slotOwner(graph: SceneGraph, node: SceneNode): SceneNode | undefined {
  let current = node.parentId ? graph.getNode(node.parentId) : undefined
  while (current && current.type !== 'CANVAS') {
    if (current.type === 'COMPONENT') return current
    if (current.type === 'INSTANCE') return undefined
    current = current.parentId ? graph.getNode(current.parentId) : undefined
  }
  return undefined
}

/** Whether a frame inside a main component can become a slot. */
export function canCreateSlot(graph: SceneGraph, node: SceneNode): boolean {
  return node.type === 'FRAME' && !slotPropertyId(node) && !!slotOwner(graph, node)
}

function uniqueSlotName(owner: SceneNode, base: string, exceptId?: string): string {
  const taken = new Set(
    owner.componentPropertyDefinitions
      .filter((definition) => definition.id !== exceptId)
      .map((definition) => definition.name)
  )
  if (!taken.has(base)) return base
  let index = 2
  while (taken.has(`${base} ${index}`)) index++
  return `${base} ${index}`
}

/**
 * Make a frame of a main component a slot: define a SLOT property, named after the frame, on
 * the component and bind the frame's children to it. Instances pick up the slot on their next
 * sync.
 */
export function createSlotProperty(
  graph: SceneGraph,
  frameId: string,
  id: string
): ComponentPropertyDefinition | null {
  const frame = graph.getNode(frameId)
  const owner = frame && canCreateSlot(graph, frame) ? slotOwner(graph, frame) : undefined
  if (!frame || !owner) return null
  const definition: ComponentPropertyDefinition = {
    id,
    name: uniqueSlotName(owner, frame.name.trim() || 'Slot'),
    type: 'SLOT',
    defaultValue: '',
    preferredValues: [],
    slotSettings: { ...DEFAULT_SLOT_SETTINGS }
  }
  graph.updateNode(owner.id, {
    componentPropertyDefinitions: [...owner.componentPropertyDefinitions, definition]
  })
  graph.updateNode(frame.id, {
    componentPropertyReferences: [
      ...frame.componentPropertyReferences,
      { propertyId: id, field: 'SLOT_CONTENT' }
    ]
  })
  return definition
}

/** What a slot's settings panel can change. */
export type SlotPropertyPatch = Partial<
  Pick<ComponentPropertyDefinition, 'name' | 'description' | 'preferredValues'>
> & { slotSettings?: Partial<SlotSettings> }

/** Set and variant components that share a slot property of this name or id. */
function slotDefinitionHosts(graph: SceneGraph, owner: SceneNode): SceneNode[] {
  if (owner.type === 'COMPONENT_SET') {
    return [
      owner,
      ...owner.childIds
        .map((id) => graph.getNode(id))
        .filter((node): node is SceneNode => node?.type === 'COMPONENT')
    ]
  }
  if (owner.type !== 'COMPONENT') return [owner]
  const parent = owner.parentId ? graph.getNode(owner.parentId) : undefined
  if (parent?.type !== 'COMPONENT_SET') return [owner]
  return [
    parent,
    ...parent.childIds
      .map((id) => graph.getNode(id))
      .filter((node): node is SceneNode => node?.type === 'COMPONENT')
  ]
}

function applySlotPatch(
  current: ComponentPropertyDefinition,
  patch: SlotPropertyPatch
): ComponentPropertyDefinition {
  const { slotSettings, ...fields } = patch
  return {
    ...current,
    ...fields,
    slotSettings: { ...DEFAULT_SLOT_SETTINGS, ...current.slotSettings, ...slotSettings }
  }
}

/**
 * Frames bound to this slot under a host, including historical ids that still name the same
 * slot (set vs variant copies, or a stale binding left after Figma paste).
 */
function boundSlotFrames(
  graph: SceneGraph,
  host: SceneNode,
  propertyId: string,
  linkedId: string,
  previousName: string
): SceneNode[] {
  // Slot frames live on the variant that defines them; do not walk into nested components
  // from a component set or the set would rewrite those frames to the set-owned id.
  if (host.type === 'COMPONENT_SET') return []
  const knownIds = new Set(
    host.componentPropertyDefinitions.filter((item) => item.type === 'SLOT').map((item) => item.id)
  )
  const frames: SceneNode[] = []
  const visit = (node: SceneNode): void => {
    for (const child of graph.getChildren(node.id)) {
      const bound = slotPropertyId(child)
      const matches =
        bound === propertyId ||
        bound === linkedId ||
        (bound !== undefined &&
          !knownIds.has(bound) &&
          child.name === previousName &&
          child.type === 'FRAME')
      if (matches && child.type === 'FRAME') frames.push(child)
      if (child.type !== 'INSTANCE' && child.type !== 'COMPONENT') visit(child)
    }
  }
  visit(host)
  return frames
}

/**
 * Resolve a slot definition on a main component / set when the selection still carries a
 * historical binding id (common after Figma clipboard paste of a component set).
 */
export function resolveSlotDefinition(
  owner: SceneNode,
  propertyId: string,
  frame?: SceneNode,
  graph?: SceneGraph
): ComponentPropertyDefinition | undefined {
  const slots = owner.componentPropertyDefinitions.filter(
    (definition) => definition.type === 'SLOT'
  )
  const direct = slots.find((definition) => definition.id === propertyId)
  if (direct) return direct
  let boundFrame = frame
  if (!boundFrame && graph) {
    const visit = (node: SceneNode): SceneNode | undefined => {
      for (const child of graph.getChildren(node.id)) {
        if (slotPropertyId(child) === propertyId) return child
        if (child.type !== 'INSTANCE') {
          const found = visit(child)
          if (found) return found
        }
      }
    }
    boundFrame = visit(owner)
  }
  if (boundFrame) {
    const byName = slots.find((definition) => definition.name === boundFrame.name)
    if (byName) return byName
  }
  if (slots.length === 1) return slots[0]
}

/** Change a slot property's name, description, preferred components, or limits. */
export function updateSlotProperty(
  graph: SceneGraph,
  ownerId: string,
  propertyId: string,
  patch: SlotPropertyPatch
): boolean {
  const owner = graph.getNode(ownerId)
  if (!owner) return false
  const current =
    resolveSlotDefinition(owner, propertyId, undefined, graph) ??
    owner.componentPropertyDefinitions.find(
      (definition) => definition.id === propertyId && definition.type === 'SLOT'
    )
  if (!current) return false

  const previousName = current.name
  const nextName =
    typeof patch.name === 'string'
      ? uniqueSlotName(owner, patch.name.trim() || previousName, current.id)
      : previousName
  const nextPatch: SlotPropertyPatch = { ...patch, name: nextName }

  for (const host of slotDefinitionHosts(graph, owner)) {
    const linked = host.componentPropertyDefinitions.find(
      (definition) =>
        definition.type === 'SLOT' &&
        (definition.id === current.id ||
          definition.id === propertyId ||
          definition.name === previousName)
    )
    if (!linked) continue
    const updated = applySlotPatch(linked, nextPatch)
    graph.updateNode(host.id, {
      componentPropertyDefinitions: host.componentPropertyDefinitions.map((definition) =>
        definition.id === linked.id ? { ...updated, id: linked.id } : definition
      )
    })
    for (const frame of boundSlotFrames(graph, host, propertyId, linked.id, previousName)) {
      const references = frame.componentPropertyReferences.map((reference) =>
        reference.field === 'SLOT_CONTENT' ? { ...reference, propertyId: linked.id } : reference
      )
      graph.updateNode(frame.id, {
        componentPropertyReferences: references,
        ...(patch.name !== undefined ? { name: nextName } : {})
      })
    }
  }
  return true
}
