import type { LocalDraft, LocalDraftMeta, LocalDraftWriteInput } from '#react/app/document/local-draft/types'

const DB_NAME = 'open-pencil-local-drafts'
const DB_VERSION = 2
const META_STORE = 'meta'
const FIG_STORE = 'fig'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error ?? new Error('Failed to open draft database'))
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(META_STORE)) {
        database.createObjectStore(META_STORE, { keyPath: 'key' })
      }
      if (!database.objectStoreNames.contains(FIG_STORE)) {
        database.createObjectStore(FIG_STORE)
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
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'))
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'))
  })
}

function toBytes(value: unknown): Uint8Array | null {
  if (!value) return null
  if (value instanceof Uint8Array) return value
  if (value instanceof ArrayBuffer) return new Uint8Array(value)
  return null
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

export async function readLocalDraftMeta(key: string): Promise<LocalDraftMeta | null> {
  const trimmed = key.trim()
  if (!trimmed) return null
  try {
    const database = await getDatabase()
    const meta = await requestToPromise(
      database.transaction(META_STORE).objectStore(META_STORE).get(trimmed)
    )
    return (meta as LocalDraftMeta | undefined) ?? null
  } catch (error) {
    console.warn('[LocalDraft] Failed to read meta', error)
    return null
  }
}

export async function readLocalDraft(key: string): Promise<LocalDraft | null> {
  const trimmed = key.trim()
  if (!trimmed) return null
  try {
    const database = await getDatabase()
    const transaction = database.transaction([META_STORE, FIG_STORE])
    const [meta, figRaw] = await Promise.all([
      requestToPromise(transaction.objectStore(META_STORE).get(trimmed)),
      requestToPromise(transaction.objectStore(FIG_STORE).get(trimmed)),
      transactionDone(transaction)
    ])
    const figBytes = toBytes(figRaw)
    if (!meta || !figBytes || figBytes.byteLength === 0) return null
    return {
      ...(meta as LocalDraftMeta),
      figBytes
    }
  } catch (error) {
    console.warn('[LocalDraft] Failed to read draft', error)
    return null
  }
}

export async function writeLocalDraft(input: LocalDraftWriteInput): Promise<LocalDraftMeta | null> {
  const key = input.key.trim()
  if (!key || input.figBytes.byteLength === 0) return null
  try {
    const database = await getDatabase()
    const meta: LocalDraftMeta = {
      key,
      documentName: input.documentName || 'Untitled',
      savedAt: input.savedAt,
      sceneVersion: input.sceneVersion,
      figByteLength: input.figBytes.byteLength,
      updatedAt: new Date().toISOString()
    }
    const transaction = database.transaction([META_STORE, FIG_STORE], 'readwrite')
    transaction.objectStore(META_STORE).put(meta)
    transaction.objectStore(FIG_STORE).put(input.figBytes, key)
    await transactionDone(transaction)
    return meta
  } catch (error) {
    console.warn('[LocalDraft] Failed to write draft', error)
    return null
  }
}

export async function removeLocalDraft(key: string): Promise<void> {
  const trimmed = key.trim()
  if (!trimmed) return
  try {
    const database = await getDatabase()
    const transaction = database.transaction([META_STORE, FIG_STORE], 'readwrite')
    transaction.objectStore(META_STORE).delete(trimmed)
    transaction.objectStore(FIG_STORE).delete(trimmed)
    await transactionDone(transaction)
  } catch (error) {
    console.warn('[LocalDraft] Failed to remove draft', error)
  }
}
