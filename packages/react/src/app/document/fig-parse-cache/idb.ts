import {
  FIG_PARSE_CACHE_MAX_ENTRIES,
  FIG_PARSE_CACHE_SCHEMA_VERSION,
  normalizeFigParseCacheUpdatedAt,
  type FigParseCacheMeta,
  type FigParseCachePayload,
  type FigParseCachePutOptions
} from '#react/app/document/fig-parse-cache/types'

const DB_NAME = 'open-pencil-fig-parse-cache'
/** v2: keyPath is documentKey (+ updatedAt match), not content hash. */
const DB_VERSION = 2
const META_STORE = 'meta'
const PAYLOAD_STORE = 'payload'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error ?? new Error('Failed to open fig parse cache'))
    request.onupgradeneeded = () => {
      const database = request.result
      // Drop legacy hash-keyed stores from v1.
      if (database.objectStoreNames.contains(META_STORE)) {
        database.deleteObjectStore(META_STORE)
      }
      if (database.objectStoreNames.contains(PAYLOAD_STORE)) {
        database.deleteObjectStore(PAYLOAD_STORE)
      }
      database.createObjectStore(META_STORE, { keyPath: 'documentKey' })
      database.createObjectStore(PAYLOAD_STORE)
    }
    request.onsuccess = () => resolve(request.result)
  })
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
  })
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'))
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction aborted'))
  })
}

let databasePromise: Promise<IDBDatabase> | null = null

function getDatabase(): Promise<IDBDatabase> {
  if (!databasePromise) {
    databasePromise = openDatabase().catch((error) => {
      databasePromise = null
      throw error
    })
  }
  return databasePromise
}

/** Test helper: drop the shared connection so each suite can use a fresh IDBFactory. */
export function resetFigParseCacheDatabase(): void {
  databasePromise = null
}

export async function removeFigParseCacheEntry(documentKey: string): Promise<void> {
  const trimmed = documentKey.trim()
  if (!trimmed) return
  try {
    const database = await getDatabase()
    const transaction = database.transaction([META_STORE, PAYLOAD_STORE], 'readwrite')
    transaction.objectStore(META_STORE).delete(trimmed)
    transaction.objectStore(PAYLOAD_STORE).delete(trimmed)
    await transactionDone(transaction)
  } catch (error) {
    console.warn('[FigParseCache] Failed to remove entry', error)
  }
}

async function listMeta(database: IDBDatabase): Promise<FigParseCacheMeta[]> {
  const all = await requestToPromise(
    database.transaction(META_STORE).objectStore(META_STORE).getAll()
  )
  return (all as FigParseCacheMeta[]).filter(Boolean)
}

async function trimToMaxEntries(database: IDBDatabase): Promise<void> {
  const metas = await listMeta(database)
  if (metas.length <= FIG_PARSE_CACHE_MAX_ENTRIES) return
  const ordered = [...metas].sort((a, b) => a.accessedAt - b.accessedAt)
  const overflow = ordered.slice(0, metas.length - FIG_PARSE_CACHE_MAX_ENTRIES)
  if (overflow.length === 0) return
  const transaction = database.transaction([META_STORE, PAYLOAD_STORE], 'readwrite')
  for (const meta of overflow) {
    transaction.objectStore(META_STORE).delete(meta.documentKey)
    transaction.objectStore(PAYLOAD_STORE).delete(meta.documentKey)
  }
  await transactionDone(transaction)
}

/**
 * Lookup by document key. Misses when `updatedAt` differs, schema mismatches, or payload is bad.
 */
export async function readFigParseCache(
  documentKey: string,
  updatedAt: string | number
): Promise<{ meta: FigParseCacheMeta; payload: FigParseCachePayload } | null> {
  const trimmed = documentKey.trim()
  const expectedUpdatedAt = normalizeFigParseCacheUpdatedAt(updatedAt)
  if (!trimmed || !expectedUpdatedAt) return null
  try {
    const database = await getDatabase()
    const transaction = database.transaction([META_STORE, PAYLOAD_STORE], 'readwrite')
    const metaStore = transaction.objectStore(META_STORE)
    const payloadStore = transaction.objectStore(PAYLOAD_STORE)
    const [metaRaw, payloadRaw] = await Promise.all([
      requestToPromise(metaStore.get(trimmed)),
      requestToPromise(payloadStore.get(trimmed))
    ])
    const meta = metaRaw as FigParseCacheMeta | undefined
    if (
      !meta ||
      meta.documentKey !== trimmed ||
      meta.updatedAt !== expectedUpdatedAt ||
      meta.schemaVersion !== FIG_PARSE_CACHE_SCHEMA_VERSION ||
      !payloadRaw
    ) {
      await transactionDone(transaction)
      if (meta || payloadRaw) await removeFigParseCacheEntry(trimmed)
      return null
    }
    meta.accessedAt = Date.now()
    metaStore.put(meta)
    await transactionDone(transaction)
    return { meta, payload: payloadRaw as FigParseCachePayload }
  } catch (error) {
    console.warn('[FigParseCache] Failed to read', error)
    return null
  }
}

export async function writeFigParseCache(
  payload: FigParseCachePayload,
  options: FigParseCachePutOptions
): Promise<FigParseCacheMeta | null> {
  const documentKey = options.identity.documentKey.trim()
  const updatedAt = normalizeFigParseCacheUpdatedAt(options.identity.updatedAt)
  if (!documentKey || !updatedAt || options.byteLength <= 0) return null
  if (payload.schemaVersion !== FIG_PARSE_CACHE_SCHEMA_VERSION) return null
  try {
    const database = await getDatabase()
    const now = Date.now()
    const meta: FigParseCacheMeta = {
      documentKey,
      updatedAt,
      fileName: options.fileName?.trim() || null,
      byteLength: options.byteLength,
      accessedAt: now,
      createdAt: now,
      schemaVersion: FIG_PARSE_CACHE_SCHEMA_VERSION
    }
    const transaction = database.transaction([META_STORE, PAYLOAD_STORE], 'readwrite')
    transaction.objectStore(META_STORE).put(meta)
    transaction.objectStore(PAYLOAD_STORE).put(payload, documentKey)
    await transactionDone(transaction)
    await trimToMaxEntries(database)
    return meta
  } catch (error) {
    console.warn('[FigParseCache] Failed to write', error)
    return null
  }
}

export async function listFigParseCacheMeta(): Promise<FigParseCacheMeta[]> {
  try {
    const database = await getDatabase()
    return await listMeta(database)
  } catch (error) {
    console.warn('[FigParseCache] Failed to list meta', error)
    return []
  }
}

export async function clearFigParseCache(): Promise<void> {
  try {
    const database = await getDatabase()
    const transaction = database.transaction([META_STORE, PAYLOAD_STORE], 'readwrite')
    transaction.objectStore(META_STORE).clear()
    transaction.objectStore(PAYLOAD_STORE).clear()
    await transactionDone(transaction)
  } catch (error) {
    console.warn('[FigParseCache] Failed to clear', error)
  }
}
