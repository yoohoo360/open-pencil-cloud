import { SceneGraph } from '@open-pencil/scene-graph'
import type { SceneNode, Variable, VariableCollection } from '@open-pencil/scene-graph'

import {
  FIG_PARSE_CACHE_SCHEMA_VERSION,
  type FigParseCachePayload
} from '#react/app/document/fig-parse-cache/types'

function cloneUint8Array(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

/** Capture a fully populated graph into an IndexedDB-safe payload. */
export function snapshotFigParseGraph(graph: SceneGraph): FigParseCachePayload {
  const nodes = structuredClone([...graph.nodes.entries()]) as Array<[string, SceneNode]>
  const variables = structuredClone([...graph.variables.entries()]) as Array<[string, Variable]>
  const variableCollections = structuredClone([...graph.variableCollections.entries()]) as Array<
    [string, VariableCollection]
  >
  const activeMode = [...graph.activeMode.entries()]
  const instanceIndex = [...graph.instanceIndex.entries()].map(
    ([id, set]) => [id, [...set]] as [string, string[]]
  )
  const enabledLibraries = structuredClone([...graph.enabledLibraries.entries()])
  const images = [...graph.images.entries()].map(
    ([hash, bytes]) => [hash, cloneUint8Array(bytes)] as [string, ArrayBuffer]
  )
  const figSchemaDeflated = graph.figSchemaDeflated
    ? cloneUint8Array(graph.figSchemaDeflated)
    : null

  return {
    schemaVersion: FIG_PARSE_CACHE_SCHEMA_VERSION,
    rootId: graph.rootId,
    documentColorSpace: graph.documentColorSpace,
    figKiwiVersion: graph.figKiwiVersion,
    figSchemaDeflated,
    nodes,
    variables,
    variableCollections,
    activeMode,
    instanceIndex,
    enabledLibraries,
    images
  }
}

function isPayloadShape(value: unknown): value is FigParseCachePayload {
  if (!value || typeof value !== 'object') return false
  const payload = value as FigParseCachePayload
  return (
    payload.schemaVersion === FIG_PARSE_CACHE_SCHEMA_VERSION &&
    typeof payload.rootId === 'string' &&
    Array.isArray(payload.nodes) &&
    payload.nodes.length > 0 &&
    Array.isArray(payload.variables) &&
    Array.isArray(payload.variableCollections) &&
    Array.isArray(payload.activeMode) &&
    Array.isArray(payload.instanceIndex) &&
    Array.isArray(payload.enabledLibraries) &&
    Array.isArray(payload.images)
  )
}

/** Rebuild a SceneGraph from a cached payload. Throws if the payload is unusable. */
export function hydrateFigParseGraph(value: unknown): SceneGraph {
  if (!isPayloadShape(value)) throw new Error('Fig parse cache payload is invalid')

  const graph = new SceneGraph()
  graph.nodes.clear()
  graph.images.clear()
  graph.variables.clear()
  graph.variableCollections.clear()
  graph.activeMode.clear()
  graph.instanceIndex.clear()
  graph.enabledLibraries.clear()

  for (const [id, node] of value.nodes) graph.nodes.set(id, node)
  for (const [id, variable] of value.variables) graph.variables.set(id, variable)
  for (const [id, collection] of value.variableCollections) {
    graph.variableCollections.set(id, collection)
  }
  for (const [id, mode] of value.activeMode) graph.activeMode.set(id, mode)
  for (const [id, members] of value.instanceIndex) {
    graph.instanceIndex.set(id, new Set(members))
  }
  for (const [id, binding] of value.enabledLibraries) {
    graph.enabledLibraries.set(id, binding)
  }
  for (const [hash, buffer] of value.images) {
    graph.images.set(hash, new Uint8Array(buffer.slice(0)))
  }

  graph.rootId = value.rootId
  graph.documentColorSpace = value.documentColorSpace
  graph.figKiwiVersion = value.figKiwiVersion
  graph.figSchemaDeflated = value.figSchemaDeflated
    ? new Uint8Array(value.figSchemaDeflated.slice(0))
    : null
  graph.clearAbsPosCache()

  if (!graph.nodes.has(graph.rootId)) {
    throw new Error('Fig parse cache payload is missing the document root')
  }
  return graph
}
