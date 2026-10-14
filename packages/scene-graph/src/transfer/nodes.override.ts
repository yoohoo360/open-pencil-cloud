import { cloneNodeProps } from '../copy'
import {
  remapInstanceOverrideState,
  type InstanceOverrideState
} from '../instance-overrides'
import type {
  ComponentPropertyDefinition,
  ComponentPropertyReference,
  ComponentPropertyType,
  SceneNode
} from '../types'
import { requireTransferReference as required } from './references'
import type { VariableTransferReferences } from './variables'

export function semanticTransferReferences(node: SceneNode): string[] {
  return [
    ...(node.componentId ? [node.componentId] : []),
    ...Object.values(node.boundVariables),
    ...[
      node.fillStyleId,
      node.strokeStyleId,
      node.textStyleId,
      node.effectStyleId,
      node.gridStyleId
    ].filter((id): id is string => !!id),
    ...node.fillGeometry.flatMap((path) => (path.fillStyleId ? [path.fillStyleId] : [])),
    ...node.strokeGeometry.flatMap((path) => (path.fillStyleId ? [path.fillStyleId] : [])),
    ...Object.entries(node.componentPropertyAssignments).flatMap(([id, value]) => [id, value]),
    ...node.componentPropertyReferences.map((reference) => reference.propertyId),
    ...node.componentPropertyDefinitions.flatMap((definition) => [
      definition.id,
      ...(definition.type === 'INSTANCE_SWAP' && definition.defaultValue
        ? [definition.defaultValue]
        : [])
    ]),
    ...node.instanceOverrides.descendants.keys(),
    ...[
      ...node.instanceOverrides.self,
      ...[...node.instanceOverrides.descendants.values()].flatMap((fields) => [...fields])
    ].flatMap(([field, value]) =>
      typeof value === 'string' &&
      (field === 'componentId' ||
        field === 'sourceComponentId' ||
        field.startsWith('boundVariables/'))
        ? [value]
        : []
    )
  ]
}

export interface NodeTransferReferences extends VariableTransferReferences {
  nodes: ReadonlyMap<string, string>
  styles: ReadonlyMap<string, string>
  properties: ReadonlyMap<string, string>
  propertyTypes: ReadonlyMap<string, ComponentPropertyType>
}

/** Drop override fields whose identities are outside the transferred fragment. */
function transferableOverrides(
  state: InstanceOverrideState,
  refs: NodeTransferReferences
): InstanceOverrideState {
  const fields = (entries: ReadonlyMap<string, unknown>) => {
    const next = new Map<string, unknown>()
    for (const [field, value] of entries) {
      if (typeof value === 'string') {
        if (
          (field === 'componentId' || field === 'sourceComponentId') &&
          !refs.nodes.has(value)
        ) {
          continue
        }
        if (field.startsWith('boundVariables/') && !refs.variables.has(value)) continue
      }
      next.set(field, value)
    }
    return next
  }
  return {
    self: fields(state.self),
    descendants: new Map(
      [...state.descendants]
        .filter(([id]) => refs.nodes.has(id))
        .map(([id, entries]) => [id, fields(entries)])
    )
  }
}

/** Prepare runtime references without rewriting original format identities or ordinary text. */
export function prepareNodeTransfer(
  source: SceneNode,
  refs: NodeTransferReferences
): Partial<SceneNode> {
  const node = (id: string) => required(refs.nodes, id, 'node')
  const variable = (id: string) => required(refs.variables, id, 'variable')
  const property = (id: string) => required(refs.properties, id, 'property')
  // Figma clipboard often references library styles that are not in the fragment.
  // Drop the link (keep local paints) instead of aborting the whole paste.
  const style = (id: string | null | undefined): string | null =>
    id && refs.styles.has(id) ? required(refs.styles, id, 'style') : null
  const propertyValue = (id: string, value: string): string => {
    const type = refs.propertyTypes.get(id)
    if (!type) throw new Error(`Missing property transfer type: ${id}`)
    // INSTANCE_SWAP targets can point at components left out of the clipboard fragment.
    if (type === 'INSTANCE_SWAP' && value) return refs.nodes.get(value) ?? ''
    return value
  }
  const values = (entries: Record<string, string>) =>
    Object.fromEntries(
      Object.entries(entries).map(([id, value]) => [property(id), propertyValue(id, value)])
    )
  const result = cloneNodeProps(source, null)
  // Main-component refs outside the fragment detach rather than aborting paste.
  result.componentId =
    source.componentId && refs.nodes.has(source.componentId) ? node(source.componentId) : null
  result.instanceOverrides = remapInstanceOverrideState(transferableOverrides(source.instanceOverrides, refs), {
    node,
    variable
  })
  result.boundVariables = Object.fromEntries(
    Object.entries(source.boundVariables)
      .filter(([, id]) => refs.variables.has(id))
      .map(([field, id]) => [field, variable(id)])
  )
  result.variableModes = Object.fromEntries(
    Object.entries(source.variableModes)
      .filter(
        ([collection, mode]) => refs.collections.has(collection) && refs.modes.has(mode)
      )
      .map(([collection, mode]) => [
        required(refs.collections, collection, 'collection'),
        required(refs.modes, mode, 'mode')
      ])
  )
  for (const field of [
    'fillStyleId',
    'strokeStyleId',
    'textStyleId',
    'effectStyleId',
    'gridStyleId'
  ] as const) {
    result[field] = style(source[field])
  }
  for (const paths of [result.fillGeometry, result.strokeGeometry]) {
    for (const path of paths ?? []) {
      const mapped = style(path.fillStyleId)
      if (mapped) path.fillStyleId = mapped
      else delete path.fillStyleId
    }
  }
  // Historical docs can carry duplicate defs or refs/assignments for deleted properties.
  // Drop orphans and keep one entry per definition id / reference field so paste stays usable.
  const definitions: ComponentPropertyDefinition[] = []
  const seenDefinitions = new Set<string>()
  for (const definition of source.componentPropertyDefinitions) {
    if (seenDefinitions.has(definition.id) || !refs.properties.has(definition.id)) continue
    seenDefinitions.add(definition.id)
    definitions.push({
      ...structuredClone(definition),
      id: property(definition.id),
      defaultValue: propertyValue(definition.id, definition.defaultValue)
    })
  }
  result.componentPropertyDefinitions = definitions
  const references = new Map<ComponentPropertyReference['field'], ComponentPropertyReference>()
  for (const reference of source.componentPropertyReferences) {
    if (!refs.properties.has(reference.propertyId)) continue
    references.set(reference.field, {
      ...reference,
      propertyId: property(reference.propertyId)
    })
  }
  result.componentPropertyReferences = [...references.values()]
  result.componentPropertyAssignments = values(
    Object.fromEntries(
      Object.entries(source.componentPropertyAssignments).filter(([id]) => refs.properties.has(id))
    )
  )
  // Variant values are keyed by display names, unlike definition-ID assignments.
  result.componentPropertyValues = { ...source.componentPropertyValues }
  return result
}
