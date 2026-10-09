import type {
  ComponentLibraryRevision,
  LibraryCatalog,
  LibrarySummary,
  PublishLibraryInput,
  SerializedComponentLibraryRevision
} from '@open-pencil/core/library'
import {
  createLibraryRevision,
  deserializeLibraryRevision,
  serializeLibraryRevision
} from '@open-pencil/core/library'

const DB_NAME = 'open-pencil-react-libraries'
const DB_VERSION = 1
const REVISIONS_STORE = 'revisions'
const LATEST_STORE = 'latest'

interface StoredLibraryRevision {
  libraryId: string
  revisionId: string
  revision: SerializedComponentLibraryRevision
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error ?? new Error('Failed to open library database'))
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(REVISIONS_STORE)) {
        const revisions = database.createObjectStore(REVISIONS_STORE, {
          keyPath: ['libraryId', 'revisionId']
        })
        revisions.createIndex('by-library', 'libraryId')
      }
      if (!database.objectStoreNames.contains(LATEST_STORE)) {
        database.createObjectStore(LATEST_STORE)
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

export class LocalLibraryCatalog implements LibraryCatalog {
  async listLibraries(): Promise<LibrarySummary[]> {
    const database = await getDatabase()
    return requestToPromise(database.transaction(LATEST_STORE).objectStore(LATEST_STORE).getAll())
  }

  async getRevision(libraryId: string, revisionId?: string): Promise<ComponentLibraryRevision> {
    const database = await getDatabase()
    const latest = await requestToPromise(
      database.transaction(LATEST_STORE).objectStore(LATEST_STORE).get(libraryId)
    )
    const resolvedRevisionId = revisionId ?? (latest as LibrarySummary | undefined)?.latestRevisionId
    const stored = resolvedRevisionId
      ? await requestToPromise(
          database
            .transaction(REVISIONS_STORE)
            .objectStore(REVISIONS_STORE)
            .get([libraryId, resolvedRevisionId])
        )
      : undefined
    if (!stored)
      throw new Error(`Library revision not found: ${libraryId}/${revisionId ?? 'latest'}`)
    return deserializeLibraryRevision((stored as StoredLibraryRevision).revision)
  }

  async cacheRevision(revision: ComponentLibraryRevision, updateLatest = true): Promise<void> {
    const database = await getDatabase()
    const transaction = database.transaction([LATEST_STORE, REVISIONS_STORE], 'readwrite')
    const manifest = revision.manifest
    transaction.objectStore(REVISIONS_STORE).put({
      libraryId: manifest.libraryId,
      revisionId: manifest.revisionId,
      revision: serializeLibraryRevision(revision)
    } satisfies StoredLibraryRevision)
    if (updateLatest) {
      transaction.objectStore(LATEST_STORE).put(
        {
          libraryId: manifest.libraryId,
          name: manifest.name,
          latestRevisionId: manifest.revisionId,
          publishedAt: manifest.publishedAt,
          assetCount: manifest.assets.length
        } satisfies LibrarySummary,
        manifest.libraryId
      )
    }
    await transactionDone(transaction)
  }

  async publishRevision(input: PublishLibraryInput): Promise<ComponentLibraryRevision> {
    const revision = await createLibraryRevision(input)
    const serializedRevision = serializeLibraryRevision(revision)
    const database = await getDatabase()
    const transaction = database.transaction([LATEST_STORE, REVISIONS_STORE], 'readwrite')
    const latestStore = transaction.objectStore(LATEST_STORE)
    const latest = (await requestToPromise(latestStore.get(input.libraryId))) as
      | LibrarySummary
      | undefined
    if ((input.previousRevisionId ?? null) !== (latest?.latestRevisionId ?? null)) {
      transaction.abort()
      throw new Error('Library revision conflict: latest revision has changed')
    }
    const manifest = revision.manifest
    transaction.objectStore(REVISIONS_STORE).put({
      libraryId: manifest.libraryId,
      revisionId: manifest.revisionId,
      revision: serializedRevision
    } satisfies StoredLibraryRevision)
    latestStore.put(
      {
        libraryId: manifest.libraryId,
        name: manifest.name,
        latestRevisionId: manifest.revisionId,
        publishedAt: manifest.publishedAt,
        assetCount: manifest.assets.length
      } satisfies LibrarySummary,
      manifest.libraryId
    )
    await transactionDone(transaction)
    return revision
  }
}
