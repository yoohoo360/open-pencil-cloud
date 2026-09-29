import type { CodeSource } from '#react/app/code/templates'

const DB_NAME = 'open-pencil-code-preferences'
const DB_VERSION = 1
const STORE = 'prefs'
const KEY = 'code-panel'

export type CodePanelPreferences = {
  version: 1
  source: CodeSource
}

const DEFAULT_PREFS: CodePanelPreferences = {
  version: 1,
  source: 'design-jsx'
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () =>
      reject(request.error ?? new Error('Failed to open code preferences database'))
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE)) {
        database.createObjectStore(STORE)
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

function isCodeSource(value: unknown): value is CodeSource {
  return value === 'design-jsx' || value === 'tailwind-jsx' || value === 'html-css'
}

function normalize(value: unknown): CodePanelPreferences {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...DEFAULT_PREFS }
  const source = (value as { source?: unknown }).source
  return {
    version: 1,
    source: isCodeSource(source) ? source : DEFAULT_PREFS.source
  }
}

export async function readCodePanelPreferences(): Promise<CodePanelPreferences> {
  try {
    const database = await getDatabase()
    const value = await requestToPromise(database.transaction(STORE).objectStore(STORE).get(KEY))
    return normalize(value)
  } catch (error) {
    console.warn('[CodePreferences] Failed to read', error)
    return { ...DEFAULT_PREFS }
  }
}

export async function writeCodePanelPreferences(
  prefs: CodePanelPreferences
): Promise<void> {
  const database = await getDatabase()
  const transaction = database.transaction(STORE, 'readwrite')
  transaction.objectStore(STORE).put(normalize(prefs), KEY)
  await transactionDone(transaction)
}
