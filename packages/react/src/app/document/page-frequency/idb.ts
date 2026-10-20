import type { DocumentPageFrequency, PageFrequencyEntry } from '#react/app/document/page-frequency/types'

const DB_NAME = 'open-pencil-page-frequency'
const DB_VERSION = 1
const STORE = 'documents'

/** Max cloud file keys retained in IndexedDB. */
export const MAX_PAGE_FREQUENCY_DOCUMENTS = 3

/** Max pages remembered per file key (also the open priority count). */
export const MAX_PAGE_FREQUENCY_PAGES = 3

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () =>
      reject(request.error ?? new Error('Failed to open page-frequency database'))
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE)) {
        database.createObjectStore(STORE, { keyPath: 'documentKey' })
      }
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
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction failed'))
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

export async function readDocumentPageFrequency(
  documentKey: string
): Promise<DocumentPageFrequency | null> {
  const key = documentKey.trim()
  if (!key) return null
  try {
    const database = await getDatabase()
    const row = await requestToPromise(
      database.transaction(STORE).objectStore(STORE).get(key)
    )
    return (row as DocumentPageFrequency | undefined) ?? null
  } catch (error) {
    console.warn('[PageFrequency] Failed to read', error)
    return null
  }
}

/** Page ids ordered by visit count (highest first), capped at {@link MAX_PAGE_FREQUENCY_PAGES}. */
export async function readPreferredPageIds(documentKey: string): Promise<string[]> {
  const row = await readDocumentPageFrequency(documentKey)
  if (!row) return []
  return row.pages
    .slice()
    .sort((a, b) => b.count - a.count || a.pageId.localeCompare(b.pageId))
    .slice(0, MAX_PAGE_FREQUENCY_PAGES)
    .map((entry) => entry.pageId)
}

async function listAll(): Promise<DocumentPageFrequency[]> {
  const database = await getDatabase()
  const rows = await requestToPromise(
    database.transaction(STORE).objectStore(STORE).getAll()
  )
  return (rows as DocumentPageFrequency[]) ?? []
}

/**
 * Upsert visit counts for one document key. Keeps at most
 * {@link MAX_PAGE_FREQUENCY_DOCUMENTS} keys (evict oldest `updatedAt`) and
 * {@link MAX_PAGE_FREQUENCY_PAGES} pages per key (highest counts).
 */
export async function writeDocumentPageFrequency(
  documentKey: string,
  pages: readonly PageFrequencyEntry[]
): Promise<void> {
  const key = documentKey.trim()
  if (!key) return
  const ranked = pages
    .filter((entry) => entry.pageId.trim() !== '' && entry.count >= 1)
    .sort((a, b) => b.count - a.count || a.pageId.localeCompare(b.pageId))
    .slice(0, MAX_PAGE_FREQUENCY_PAGES)
  const next: DocumentPageFrequency = {
    documentKey: key,
    updatedAt: new Date().toISOString(),
    pages: ranked
  }
  try {
    const database = await getDatabase()
    const existing = await listAll()
    const others = existing.filter((row) => row.documentKey !== key)
    if (others.length >= MAX_PAGE_FREQUENCY_DOCUMENTS) {
      const evictCount = others.length - (MAX_PAGE_FREQUENCY_DOCUMENTS - 1)
      const victims = others
        .slice()
        .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
        .slice(0, evictCount)
      const transaction = database.transaction(STORE, 'readwrite')
      const store = transaction.objectStore(STORE)
      for (const victim of victims) store.delete(victim.documentKey)
      store.put(next)
      await transactionDone(transaction)
      return
    }
    const transaction = database.transaction(STORE, 'readwrite')
    transaction.objectStore(STORE).put(next)
    await transactionDone(transaction)
  } catch (error) {
    console.warn('[PageFrequency] Failed to write', error)
  }
}

export async function recordPageVisit(documentKey: string, pageId: string): Promise<void> {
  const key = documentKey.trim()
  const id = pageId.trim()
  if (!key || !id) return
  const current = (await readDocumentPageFrequency(key))?.pages ?? []
  const counts = new Map(current.map((entry) => [entry.pageId, entry.count]))
  counts.set(id, (counts.get(id) ?? 0) + 1)
  await writeDocumentPageFrequency(
    key,
    [...counts.entries()].map(([entryId, count]) => ({ pageId: entryId, count }))
  )
}
