import { parseFigFile } from '@open-pencil/core/io'
import type { SceneGraph } from '@open-pencil/scene-graph'

import type { ParseFigFileOptions } from '#core/io/formats/fig/read.override'
import {
  readFigParseCache,
  removeFigParseCacheEntry
} from '#react/app/document/fig-parse-cache/idb'
import { hydrateFigParseGraph } from '#react/app/document/fig-parse-cache/snapshot'
import {
  normalizeFigParseCacheUpdatedAt,
  type FigParseCacheIdentity
} from '#react/app/document/fig-parse-cache/types'

export {
  clearFigParseCache,
  listFigParseCacheMeta,
  readFigParseCache,
  removeFigParseCacheEntry,
  resetFigParseCacheDatabase,
  writeFigParseCache
} from '#react/app/document/fig-parse-cache/idb'
export {
  cancelScheduledFigParseCacheWrite,
  FIG_PARSE_CACHE_OPEN_WRITE_DELAY_MS,
  FIG_PARSE_CACHE_SAVE_WRITE_DELAY_MS,
  resetFigParseCacheScheduleForTests,
  scheduleFigParseCacheWrite
} from '#react/app/document/fig-parse-cache/schedule'
export {
  hydrateFigParseGraph,
  snapshotFigParseGraph
} from '#react/app/document/fig-parse-cache/snapshot'
export {
  FIG_PARSE_CACHE_MAX_ENTRIES,
  FIG_PARSE_CACHE_SCHEMA_VERSION,
  normalizeFigParseCacheUpdatedAt,
  type FigParseCacheIdentity,
  type FigParseCacheMeta,
  type FigParseCachePayload
} from '#react/app/document/fig-parse-cache/types'

function toArrayBuffer(source: File | ArrayBuffer): Promise<ArrayBuffer> {
  if (source instanceof ArrayBuffer) return Promise.resolve(source)
  return source.arrayBuffer()
}

function resolveIdentity(
  identity: FigParseCacheIdentity | undefined
): { documentKey: string; updatedAt: string } | null {
  if (!identity) return null
  const documentKey = identity.documentKey.trim()
  const updatedAt = normalizeFigParseCacheUpdatedAt(identity.updatedAt)
  if (!documentKey || !updatedAt) return null
  return { documentKey, updatedAt }
}

/**
 * Parse a `.fig`, hydrating from IndexedDB when `documentKey` + `updatedAt` hit.
 * Does not write the cache — callers schedule deferred writes after open/save.
 */
export async function readFigDocumentCached(
  source: File | ArrayBuffer,
  options: ParseFigFileOptions = {},
  identity?: FigParseCacheIdentity
): Promise<SceneGraph> {
  options.signal?.throwIfAborted()
  const buffer = await toArrayBuffer(source)
  options.signal?.throwIfAborted()
  const cacheKey = resolveIdentity(identity)

  if (cacheKey) {
    const cached = await readFigParseCache(cacheKey.documentKey, cacheKey.updatedAt)
    if (cached) {
      try {
        return hydrateFigParseGraph(cached.payload)
      } catch (error) {
        console.warn('[FigParseCache] Hydrate failed; re-parsing', error)
        await removeFigParseCacheEntry(cacheKey.documentKey)
      }
    }
  }

  return parseFigFile(buffer, options)
}
