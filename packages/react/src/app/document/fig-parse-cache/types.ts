import type {
  DocumentColorSpace,
  EnabledLibraryBinding,
  SceneNode,
  Variable,
  VariableCollection
} from '@open-pencil/scene-graph'

/** Bump to drop incompatible cached payloads. */
export const FIG_PARSE_CACHE_SCHEMA_VERSION = 2

export const FIG_PARSE_CACHE_MAX_ENTRIES = 3

/** Cloud document identity used as the parse-cache lookup key. */
export type FigParseCacheIdentity = {
  documentKey: string
  /** Server `updated_at` (or equivalent revision time). */
  updatedAt: string | number
}

export type FigParseCacheMeta = {
  documentKey: string
  /** Normalized string form of the identity `updatedAt`. */
  updatedAt: string
  fileName: string | null
  byteLength: number
  accessedAt: number
  createdAt: number
  schemaVersion: number
}

export type FigParseCachePayload = {
  schemaVersion: number
  rootId: string
  documentColorSpace: DocumentColorSpace
  figKiwiVersion: number | null
  figSchemaDeflated: ArrayBuffer | null
  nodes: Array<[string, SceneNode]>
  variables: Array<[string, Variable]>
  variableCollections: Array<[string, VariableCollection]>
  activeMode: Array<[string, string]>
  instanceIndex: Array<[string, string[]]>
  enabledLibraries: Array<[string, EnabledLibraryBinding]>
  images: Array<[string, ArrayBuffer]>
}

export type FigParseCachePutOptions = {
  identity: FigParseCacheIdentity
  fileName?: string | null
  byteLength: number
}

/** Stable string for comparing / storing update times. */
export function normalizeFigParseCacheUpdatedAt(value: string | number): string {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return String(value).trim()
}
