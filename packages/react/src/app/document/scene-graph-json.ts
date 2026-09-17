import { decodeUtf8, encodeUtf8 } from '#react/polyfills/utf8'
import {
  computeImageHash,
  deserializeInstanceOverrideState,
  serializeInstanceOverrideState,
  SceneGraph,
  type DocumentColorSpace,
  type EnabledLibraryBinding,
  type NodeType,
  type SceneNode,
  type SourceMetadata,
  type Variable,
  type VariableCollection
} from '@open-pencil/scene-graph'
import {
  createDefaultNode,
  createDefaultSourceMetadata
} from '@open-pencil/scene-graph/node-defaults'

export const SCENE_GRAPH_JSON_FORMAT = 'openpencil-scene-graph'
export const SCENE_GRAPH_JSON_VERSION = 1
export const CONTENT_HASH_PATTERN = /^[0-9a-f]{40}$/

const DERIVED_NODE_FIELDS = new Set<string>([
  'textPicture',
  'derivedLayout',
  'fillGeometry',
  'strokeGeometry',
  'derivedTextGlyphs'
])

/** Zeros that are not the type default and must survive omit-0 compaction. */
const PRESERVE_ZERO_KEYS = new Set(['width', 'height', 'opacity'])

const NODE_TYPES = new Set<NodeType>([
  'CANVAS',
  'FRAME',
  'RECTANGLE',
  'ROUNDED_RECTANGLE',
  'ELLIPSE',
  'TEXT',
  'LINE',
  'STAR',
  'POLYGON',
  'VECTOR',
  'BOOLEAN_OPERATION',
  'GROUP',
  'SECTION',
  'COMPONENT',
  'COMPONENT_SET',
  'INSTANCE',
  'CONNECTOR',
  'SHAPE_WITH_TEXT'
])

export type SceneGraphJsonDocument = {
  format: typeof SCENE_GRAPH_JSON_FORMAT
  version: typeof SCENE_GRAPH_JSON_VERSION
  rootId?: string
  documentColorSpace?: DocumentColorSpace
  figKiwiVersion?: number | null
  figSchemaHash?: string | null
  nodes?: Record<string, unknown>
  variables?: Record<string, Variable>
  variableCollections?: Record<string, VariableCollection>
  activeMode?: Record<string, string>
  enabledLibraries?: Record<string, EnabledLibraryBinding>
  images?: string[]
}

export type EncodedSceneGraph = {
  document: SceneGraphJsonDocument
  binaries: Map<string, Uint8Array>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNodeType(value: unknown): value is NodeType {
  return typeof value === 'string' && NODE_TYPES.has(value as NodeType)
}

function isDocumentColorSpace(value: unknown): value is DocumentColorSpace {
  return value === 'srgb' || value === 'display-p3'
}

export function isContentHash(value: string): boolean {
  return CONTENT_HASH_PATTERN.test(value)
}

export function looksLikeJsonObject(bytes: Uint8Array): boolean {
  for (let i = 0; i < bytes.length; i++) {
    const code = bytes[i]
    if (code === 0x20 || code === 0x09 || code === 0x0a || code === 0x0d) continue
    return code === 0x7b
  }
  return false
}

export function looksLikeSceneGraphJson(bytes: Uint8Array): boolean {
  if (!looksLikeJsonObject(bytes)) return false
  try {
    const parsed: unknown = JSON.parse(decodeUtf8(bytes))
    return isSceneGraphJsonDocument(parsed)
  } catch {
    return false
  }
}

export function isSceneGraphJsonDocument(value: unknown): value is SceneGraphJsonDocument {
  if (!isRecord(value)) return false
  if (value.format === SCENE_GRAPH_JSON_FORMAT) return true
  return isRecord(value.nodes) && !Array.isArray(value.nodes)
}

function isSparseLeaf(value: unknown, key?: string): boolean {
  if (value === undefined || value === null) return true
  if (value === '') return true
  if (value === 0) return !(key && PRESERVE_ZERO_KEYS.has(key))
  if (Array.isArray(value) && value.length === 0) return true
  return false
}

function sortRecordKeys(value: Record<string, unknown>): Record<string, unknown> {
  const sorted: Record<string, unknown> = {}
  for (const key of Object.keys(value).sort()) {
    sorted[key] = value[key]
  }
  return sorted
}

/** Drop empty / null / undefined / 0 values and sort object keys for stable diffs. */
export function compactJsonValue(value: unknown, key?: string): unknown {
  if (isSparseLeaf(value, key)) return undefined
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (isRecord(item) || Array.isArray(item)) {
        const next = compactJsonValue(item)
        return next === undefined ? item : next
      }
      return item
    })
  }
  if (!isRecord(value)) return value

  const compacted: Record<string, unknown> = {}
  for (const childKey of Object.keys(value).sort()) {
    const next = compactJsonValue(value[childKey], childKey)
    if (next === undefined) continue
    if (isRecord(next) && Object.keys(next).length === 0) continue
    compacted[childKey] = next
  }
  return compacted
}

function sortSerializedOverrides(value: unknown): unknown {
  if (!isRecord(value)) return value
  const self = Array.isArray(value.self)
    ? [...value.self].sort((a, b) => {
        const left = Array.isArray(a) && typeof a[0] === 'string' ? a[0] : ''
        const right = Array.isArray(b) && typeof b[0] === 'string' ? b[0] : ''
        return left.localeCompare(right)
      })
    : value.self
  const descendants = Array.isArray(value.descendants)
    ? [...value.descendants]
        .map((entry) => {
          if (!Array.isArray(entry) || entry.length !== 2) return entry
          const fields = Array.isArray(entry[1])
            ? [...entry[1]].sort((a, b) => {
                const left = Array.isArray(a) && typeof a[0] === 'string' ? a[0] : ''
                const right = Array.isArray(b) && typeof b[0] === 'string' ? b[0] : ''
                return left.localeCompare(right)
              })
            : entry[1]
          return [entry[0], fields]
        })
        .sort((a, b) => {
          const left = Array.isArray(a) && typeof a[0] === 'string' ? a[0] : ''
          const right = Array.isArray(b) && typeof b[0] === 'string' ? b[0] : ''
          return left.localeCompare(right)
        })
    : value.descendants
  return { self, descendants }
}

function encodeNode(node: SceneNode): Record<string, unknown> {
  const encoded: Record<string, unknown> = {}
  for (const key of Object.keys(node).sort()) {
    if (DERIVED_NODE_FIELDS.has(key)) continue
    let value: unknown = node[key as keyof SceneNode]
    if (key === 'instanceOverrides') {
      value = sortSerializedOverrides(serializeInstanceOverrideState(node.instanceOverrides))
    }
    const compacted = compactJsonValue(value, key)
    if (compacted === undefined) continue
    if (isRecord(compacted) && Object.keys(compacted).length === 0) continue
    encoded[key] = compacted
  }
  return encoded
}

function mergeSourceMetadata(source: unknown): SourceMetadata {
  const defaults = createDefaultSourceMetadata()
  if (!isRecord(source)) return defaults
  const fig = isRecord(source.fig) ? source.fig : {}
  return {
    format: source.format === 'fig' ? 'fig' : null,
    id: typeof source.id === 'string' ? source.id : null,
    orderKey: typeof source.orderKey === 'string' ? source.orderKey : null,
    editedFields: Array.isArray(source.editedFields)
      ? source.editedFields.filter((item): item is string => typeof item === 'string')
      : [],
    fig: {
      rawSize: isRecord(fig.rawSize) ? (fig.rawSize as SourceMetadata['fig']['rawSize']) : null,
      rawTransform: isRecord(fig.rawTransform)
        ? (fig.rawTransform as SourceMetadata['fig']['rawTransform'])
        : null,
      rawNodeFields: isRecord(fig.rawNodeFields) ? { ...fig.rawNodeFields } : {},
      layout: isRecord(fig.layout) ? (fig.layout as SourceMetadata['fig']['layout']) : null,
      symbolOverrides: Array.isArray(fig.symbolOverrides) ? [...fig.symbolOverrides] : [],
      componentPropAssignments: Array.isArray(fig.componentPropAssignments)
        ? [...fig.componentPropAssignments]
        : [],
      derivedSymbolData: Array.isArray(fig.derivedSymbolData) ? [...fig.derivedSymbolData] : [],
      derivedSymbolDataLayoutVersion:
        typeof fig.derivedSymbolDataLayoutVersion === 'number'
          ? fig.derivedSymbolDataLayoutVersion
          : null,
      uniformScaleFactor: typeof fig.uniformScaleFactor === 'number' ? fig.uniformScaleFactor : null
    }
  }
}

function decodeNode(id: string, raw: unknown): SceneNode | null {
  if (!isRecord(raw) || !isNodeType(raw.type)) return null
  const rest: Record<string, unknown> = { ...raw }
  for (const field of DERIVED_NODE_FIELDS) delete rest[field]
  delete rest.instanceOverrides
  delete rest.source
  const node = createDefaultNode(() => id, raw.type, rest as Partial<SceneNode>)
  node.id = id
  node.source = mergeSourceMetadata(raw.source)
  node.instanceOverrides = deserializeInstanceOverrideState(raw.instanceOverrides)
  node.textPicture = null
  node.derivedLayout = null
  node.fillGeometry = []
  node.strokeGeometry = []
  node.derivedTextGlyphs = null
  return node
}

function sortedRecordFromMap<T>(map: Map<string, T>): Record<string, T> {
  const entries = [...map.entries()].sort(([left], [right]) => left.localeCompare(right))
  return Object.fromEntries(entries)
}

function stringRecord(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {}
  const next: Record<string, string> = {}
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === 'string') next[key] = item
  }
  return next
}

function contentHashForBytes(preferredKey: string, bytes: Uint8Array): string {
  return isContentHash(preferredKey) ? preferredKey : computeImageHash(bytes)
}

function buildDocument(
  graph: SceneGraph,
  images: string[],
  figSchemaHash: string | null
): SceneGraphJsonDocument {
  const nodes: Record<string, unknown> = {}
  for (const id of [...graph.nodes.keys()].sort()) {
    const node = graph.nodes.get(id)
    if (!node) continue
    nodes[id] = encodeNode(node)
  }

  const raw: Record<string, unknown> = {
    format: SCENE_GRAPH_JSON_FORMAT,
    version: SCENE_GRAPH_JSON_VERSION,
    rootId: graph.rootId,
    documentColorSpace: graph.documentColorSpace,
    figKiwiVersion: graph.figKiwiVersion,
    figSchemaHash,
    nodes,
    variables: sortedRecordFromMap(graph.variables),
    variableCollections: sortedRecordFromMap(graph.variableCollections),
    activeMode: sortedRecordFromMap(graph.activeMode),
    enabledLibraries: sortedRecordFromMap(graph.enabledLibraries),
    images: [...images].sort()
  }

  const compacted = compactJsonValue(raw)
  const document = isRecord(compacted) ? (sortRecordKeys(compacted) as SceneGraphJsonDocument) : raw
  document.format = SCENE_GRAPH_JSON_FORMAT
  document.version = SCENE_GRAPH_JSON_VERSION
  return document
}

export function encodeSceneGraph(graph: SceneGraph): EncodedSceneGraph {
  const binaries = new Map<string, Uint8Array>()
  const images: string[] = []
  for (const [key, bytes] of graph.images) {
    const hash = contentHashForBytes(key, bytes)
    binaries.set(hash, bytes)
    images.push(hash)
  }

  let figSchemaHash: string | null = null
  if (graph.figSchemaDeflated && graph.figSchemaDeflated.byteLength > 0) {
    figSchemaHash = computeImageHash(graph.figSchemaDeflated)
    binaries.set(figSchemaHash, graph.figSchemaDeflated)
  }

  return {
    document: buildDocument(graph, images, figSchemaHash),
    binaries
  }
}

export function encodeSceneGraphJsonBytes(graph: SceneGraph): {
  bytes: Uint8Array
  binaries: Map<string, Uint8Array>
} {
  const encoded = encodeSceneGraph(graph)
  return {
    bytes: encodeUtf8(`${JSON.stringify(encoded.document)}\n`),
    binaries: encoded.binaries
  }
}

function rebuildInstanceIndex(graph: SceneGraph): void {
  graph.instanceIndex.clear()
  for (const node of graph.nodes.values()) {
    if (!node.componentId) continue
    let set = graph.instanceIndex.get(node.componentId)
    if (!set) {
      set = new Set()
      graph.instanceIndex.set(node.componentId, set)
    }
    set.add(node.id)
  }
}

function inferRootId(graph: SceneGraph, preferred: string | undefined): string {
  if (preferred && graph.nodes.has(preferred)) return preferred
  for (const node of graph.nodes.values()) {
    if (node.parentId === null) return node.id
  }
  return graph.rootId
}

export function parseSceneGraphJsonDocument(bytes: Uint8Array): SceneGraphJsonDocument {
  const parsed: unknown = JSON.parse(decodeUtf8(bytes))
  if (!isSceneGraphJsonDocument(parsed)) {
    throw new Error('Not an OpenPencil scene-graph document')
  }
  return parsed
}

export function decodeSceneGraph(
  document: SceneGraphJsonDocument,
  binaries: ReadonlyMap<string, Uint8Array>
): SceneGraph {
  const graph = new SceneGraph()
  const encodedNodes = document.nodes
  if (!encodedNodes || Object.keys(encodedNodes).length === 0) return graph

  graph.nodes.clear()
  graph.instanceIndex.clear()
  for (const [id, raw] of Object.entries(encodedNodes)) {
    const node = decodeNode(id, raw)
    if (!node) continue
    graph.nodes.set(id, node)
  }
  if (graph.nodes.size === 0) return new SceneGraph()

  graph.rootId = inferRootId(graph, document.rootId)
  rebuildInstanceIndex(graph)

  if (isDocumentColorSpace(document.documentColorSpace)) {
    graph.documentColorSpace = document.documentColorSpace
  }
  graph.figKiwiVersion =
    typeof document.figKiwiVersion === 'number' ? document.figKiwiVersion : null

  graph.variables = new Map(Object.entries(document.variables ?? {}))
  graph.variableCollections = new Map(Object.entries(document.variableCollections ?? {}))
  graph.activeMode = new Map(Object.entries(stringRecord(document.activeMode)))
  graph.enabledLibraries = new Map(Object.entries(document.enabledLibraries ?? {}))

  graph.images.clear()
  for (const hash of document.images ?? []) {
    if (!isContentHash(hash)) continue
    const bytes = binaries.get(hash)
    if (!bytes) throw new Error(`Missing binary ${hash}`)
    graph.images.set(hash, bytes)
  }

  if (typeof document.figSchemaHash === 'string' && isContentHash(document.figSchemaHash)) {
    const schema = binaries.get(document.figSchemaHash)
    if (!schema) throw new Error(`Missing binary ${document.figSchemaHash}`)
    graph.figSchemaDeflated = schema
  } else {
    graph.figSchemaDeflated = null
  }

  return graph
}

export async function restoreSceneGraphFromJson(
  bytes: Uint8Array,
  loadBinary: (hash: string) => Promise<Uint8Array>
): Promise<SceneGraph> {
  const document = parseSceneGraphJsonDocument(bytes)
  const hashes = new Set<string>()
  for (const hash of document.images ?? []) {
    if (isContentHash(hash)) hashes.add(hash)
  }
  if (typeof document.figSchemaHash === 'string' && isContentHash(document.figSchemaHash)) {
    hashes.add(document.figSchemaHash)
  }
  const binaries = new Map<string, Uint8Array>()
  await Promise.all(
    [...hashes].map(async (hash) => {
      binaries.set(hash, await loadBinary(hash))
    })
  )
  return decodeSceneGraph(document, binaries)
}
