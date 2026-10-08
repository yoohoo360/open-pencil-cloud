export type InstanceOverrideField = string

export interface InstanceOverrideState {
  self: Map<InstanceOverrideField, unknown>
  descendants: Map<string, Map<InstanceOverrideField, unknown>>
}

export function createInstanceOverrideState(): InstanceOverrideState {
  return { self: new Map(), descendants: new Map() }
}

function fieldsFromUnknown(value: unknown): Map<InstanceOverrideField, unknown> {
  if (value instanceof Map) {
    const result = new Map<InstanceOverrideField, unknown>()
    for (const [field, fieldValue] of value) {
      if (typeof field === 'string') result.set(field, fieldValue)
    }
    return result
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return new Map()
  }
  return new Map(Object.entries(value as Record<string, unknown>))
}

export interface SerializedOverrideValue {
  defined: boolean
  value?: unknown
}

export interface SerializedInstanceOverrideState {
  self: Array<[InstanceOverrideField, SerializedOverrideValue]>
  descendants: Array<[string, Array<[InstanceOverrideField, SerializedOverrideValue]>]>
}

function serializeOverrideValue(value: unknown): SerializedOverrideValue {
  return value === undefined ? { defined: false } : { defined: true, value }
}

function deserializeOverrideValue(value: unknown): { valid: boolean; value: unknown } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { valid: false, value: undefined }
  }
  if (!('defined' in value) || typeof value.defined !== 'boolean') {
    return { valid: false, value: undefined }
  }
  if (value.defined) {
    return 'value' in value
      ? { valid: true, value: value['value'] }
      : { valid: false, value: undefined }
  }
  return { valid: true, value: undefined }
}

function deserializeEntries(value: unknown): Map<InstanceOverrideField, unknown> {
  const result = new Map<InstanceOverrideField, unknown>()
  if (!Array.isArray(value)) return result
  for (const entry of value) {
    if (!Array.isArray(entry) || entry.length !== 2 || typeof entry[0] !== 'string') continue
    const decoded = deserializeOverrideValue(entry[1])
    if (decoded.valid) result.set(entry[0], decoded.value)
  }
  return result
}

export function deserializeInstanceOverrideState(state: unknown): InstanceOverrideState {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    return createInstanceOverrideState()
  }
  const self =
    'self' in state ? deserializeEntries(state.self) : new Map<InstanceOverrideField, unknown>()
  const descendants = new Map<string, Map<InstanceOverrideField, unknown>>()
  if ('descendants' in state && Array.isArray(state.descendants)) {
    for (const entry of state.descendants) {
      if (!Array.isArray(entry) || entry.length !== 2 || typeof entry[0] !== 'string') continue
      descendants.set(entry[0], deserializeEntries(entry[1]))
    }
  } else if (
    'descendants' in state &&
    state.descendants &&
    typeof state.descendants === 'object' &&
    !Array.isArray(state.descendants)
  ) {
    for (const [nodeId, fields] of Object.entries(
      state.descendants as Record<string, unknown>
    )) {
      descendants.set(nodeId, fieldsFromUnknown(fields))
    }
  }
  if (
    'self' in state &&
    state.self &&
    typeof state.self === 'object' &&
    !Array.isArray(state.self) &&
    !(state.self instanceof Map) &&
    self.size === 0
  ) {
    for (const [field, value] of fieldsFromUnknown(state.self)) self.set(field, value)
  }
  return { self, descendants }
}

/**
 * Coerce JSON / structured-clone damage / partial imports into real Maps.
 * Mutates `state` in place when it is a plain object so graph nodes stay fixed.
 */
export function ensureInstanceOverrideState(state: unknown): InstanceOverrideState {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    return createInstanceOverrideState()
  }

  const record = state as {
    self?: unknown
    descendants?: unknown
  }

  // Canonical serialized form used by clipboard / JSON round-trips.
  if (Array.isArray(record.self) || Array.isArray(record.descendants)) {
    return deserializeInstanceOverrideState(state)
  }

  if (
    record.self instanceof Map &&
    record.descendants instanceof Map
  ) {
    let needsFix = false
    for (const fields of record.descendants.values()) {
      if (!(fields instanceof Map)) {
        needsFix = true
        break
      }
    }
    if (!needsFix) return state as InstanceOverrideState
  }

  const self = fieldsFromUnknown(record.self)
  const descendants = new Map<string, Map<InstanceOverrideField, unknown>>()
  if (record.descendants instanceof Map) {
    for (const [nodeId, fields] of record.descendants) {
      if (typeof nodeId !== 'string') continue
      descendants.set(nodeId, fieldsFromUnknown(fields))
    }
  } else if (record.descendants && typeof record.descendants === 'object') {
    for (const [nodeId, fields] of Object.entries(
      record.descendants as Record<string, unknown>
    )) {
      descendants.set(nodeId, fieldsFromUnknown(fields))
    }
  }

  const target = state as InstanceOverrideState
  target.self = self
  target.descendants = descendants
  return target
}

export function serializeInstanceOverrideState(
  state: InstanceOverrideState
): SerializedInstanceOverrideState {
  const normalized = ensureInstanceOverrideState(state)
  return {
    self: [...normalized.self].map(([field, value]) => [field, serializeOverrideValue(value)]),
    descendants: [...normalized.descendants].map(([nodeId, fields]) => [
      nodeId,
      [...fields].map(([field, value]) => [field, serializeOverrideValue(value)])
    ])
  }
}

export function cloneInstanceOverrideState(state: InstanceOverrideState): InstanceOverrideState {
  const normalized = ensureInstanceOverrideState(state)
  return {
    self: new Map(
      [...normalized.self].map(([field, value]) => [field, structuredClone(value)])
    ),
    descendants: new Map(
      [...normalized.descendants].map(([id, fields]) => [
        id,
        new Map([...fields].map(([field, value]) => [field, structuredClone(value)]))
      ])
    )
  }
}

export interface InstanceOverrideReferenceMapper {
  node: (id: string) => string
  variable: (id: string) => string
}

/** Remap runtime identities only; ordinary strings and source-format payloads stay opaque. */
export function remapInstanceOverrideState(
  state: InstanceOverrideState,
  references: InstanceOverrideReferenceMapper
): InstanceOverrideState {
  const remapValue = (field: string, value: unknown): unknown => {
    if (typeof value !== 'string') return structuredClone(value)
    if (field === 'componentId' || field === 'sourceComponentId') return references.node(value)
    if (field.startsWith('boundVariables/')) return references.variable(value)
    return value
  }
  const fields = (entries: ReadonlyMap<string, unknown>) =>
    new Map([...entries].map(([field, value]) => [field, remapValue(field, value)]))
  const descendants = new Map<string, Map<string, unknown>>()
  for (const [id, entries] of state.descendants) {
    const mapped = references.node(id)
    if (descendants.has(mapped)) throw new Error(`Duplicate remapped override target ${mapped}`)
    descendants.set(mapped, fields(entries))
  }
  return { self: fields(state.self), descendants }
}

export function getInstanceOverride(
  state: InstanceOverrideState,
  instanceId: string,
  nodeId: string,
  field: InstanceOverrideField
): unknown {
  const normalized = ensureInstanceOverrideState(state)
  return nodeId === instanceId
    ? normalized.self.get(field)
    : normalized.descendants.get(nodeId)?.get(field)
}

export function hasInstanceOverride(
  state: InstanceOverrideState,
  instanceId: string,
  nodeId: string,
  field: InstanceOverrideField
): boolean {
  const normalized = ensureInstanceOverrideState(state)
  const fields =
    nodeId === instanceId ? normalized.self : normalized.descendants.get(nodeId)
  return fields?.has(field) ?? false
}

export function setInstanceOverride(
  state: InstanceOverrideState,
  instanceId: string,
  nodeId: string,
  field: InstanceOverrideField,
  value: unknown = true
): void {
  const normalized = ensureInstanceOverrideState(state)
  if (nodeId === instanceId) {
    normalized.self.set(field, value)
    return
  }
  const fields = normalized.descendants.get(nodeId) ?? new Map<string, unknown>()
  fields.set(field, value)
  normalized.descendants.set(nodeId, fields)
}

export function deleteInstanceOverride(
  state: InstanceOverrideState,
  instanceId: string,
  nodeId: string,
  field: InstanceOverrideField
): boolean {
  const normalized = ensureInstanceOverrideState(state)
  const fields =
    nodeId === instanceId ? normalized.self : normalized.descendants.get(nodeId)
  if (!fields?.delete(field)) return false
  if (nodeId !== instanceId && fields.size === 0) normalized.descendants.delete(nodeId)
  return true
}

export function clearInstanceOverrides(state: InstanceOverrideState): void {
  const normalized = ensureInstanceOverrideState(state)
  normalized.self.clear()
  normalized.descendants.clear()
}

export function forEachInstanceOverride(
  state: InstanceOverrideState,
  callback: (nodeId: string, field: InstanceOverrideField, value: unknown) => void
): void {
  const normalized = ensureInstanceOverrideState(state)
  for (const [field, value] of normalized.self) callback('', field, value)
  for (const [nodeId, fields] of normalized.descendants) {
    for (const [field, value] of fields) callback(nodeId, field, value)
  }
}
