import type { SceneNode } from '@open-pencil/scene-graph'

export type PageSnapshotMeta = {
  key: string
  documentKey: string
  pageId: string
  pageName: string
  capturedAt: string
  sceneVersion: number
  nodeCount: number
}

export type PageSnapshot = PageSnapshotMeta & {
  /** Page node + descendants, deep-cloned at capture time. */
  nodes: SceneNode[]
  pageChildIds: string[]
}

export type PageSnapshotWriteInput = {
  documentKey: string
  pageId: string
  pageName: string
  sceneVersion: number
  nodes: SceneNode[]
  pageChildIds: string[]
}

const DB_NAME = 'open-pencil-page-snapshots'
const DB_VERSION = 1
const META_STORE = 'meta'
const NODE_STORE = 'nodes'

function snapshotKey(documentKey: string, pageId: string): string {
  return `${documentKey.trim()}::${pageId}`
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error ?? new Error('Failed to open page snapshot database'))
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(META_STORE)) {
        database.createObjectStore(META_STORE, { keyPath: 'key' })
      }
      if (!database.objectStoreNames.contains(NODE_STORE)) {
        database.createObjectStore(NODE_STORE)
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

export async function writePageSnapshot(
  input: PageSnapshotWriteInput
): Promise<PageSnapshotMeta | null> {
  const documentKey = input.documentKey.trim()
  const pageId = input.pageId.trim()
  if (!documentKey || !pageId || input.nodes.length === 0) return null
  try {
    const key = snapshotKey(documentKey, pageId)
    const meta: PageSnapshotMeta = {
      key,
      documentKey,
      pageId,
      pageName: input.pageName,
      capturedAt: new Date().toISOString(),
      sceneVersion: input.sceneVersion,
      nodeCount: input.nodes.length
    }
    const database = await getDatabase()
    const transaction = database.transaction([META_STORE, NODE_STORE], 'readwrite')
    transaction.objectStore(META_STORE).put(meta)
    transaction.objectStore(NODE_STORE).put(
      { nodes: input.nodes, pageChildIds: input.pageChildIds },
      key
    )
    await transactionDone(transaction)
    return meta
  } catch (error) {
    console.warn('[PageSnapshot] Failed to write', error)
    return null
  }
}

export async function readPageSnapshot(
  documentKey: string,
  pageId: string
): Promise<PageSnapshot | null> {
  const key = snapshotKey(documentKey, pageId)
  if (!documentKey.trim() || !pageId.trim()) return null
  try {
    const database = await getDatabase()
    const transaction = database.transaction([META_STORE, NODE_STORE])
    const [meta, payload] = await Promise.all([
      requestToPromise(transaction.objectStore(META_STORE).get(key)),
      requestToPromise(transaction.objectStore(NODE_STORE).get(key)),
      transactionDone(transaction)
    ])
    if (!meta || !payload || typeof payload !== 'object') return null
    const body = payload as { nodes?: SceneNode[]; pageChildIds?: string[] }
    if (!body.nodes?.length) return null
    return {
      ...(meta as PageSnapshotMeta),
      nodes: body.nodes,
      pageChildIds: body.pageChildIds ?? []
    }
  } catch (error) {
    console.warn('[PageSnapshot] Failed to read', error)
    return null
  }
}

export async function removePageSnapshotsForDocument(documentKey: string): Promise<void> {
  const trimmed = documentKey.trim()
  if (!trimmed) return
  try {
    const database = await getDatabase()
    const metaStore = database.transaction(META_STORE).objectStore(META_STORE)
    const all = await requestToPromise(metaStore.getAll()) as PageSnapshotMeta[]
    const keys = all.filter((item) => item.documentKey === trimmed).map((item) => item.key)
    if (keys.length === 0) return
    const transaction = database.transaction([META_STORE, NODE_STORE], 'readwrite')
    for (const key of keys) {
      transaction.objectStore(META_STORE).delete(key)
      transaction.objectStore(NODE_STORE).delete(key)
    }
    await transactionDone(transaction)
  } catch (error) {
    console.warn('[PageSnapshot] Failed to remove document snapshots', error)
  }
}
