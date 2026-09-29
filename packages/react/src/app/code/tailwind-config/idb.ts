import type { TailwindConfigLike } from '#core/io/formats/jsx'

const DB_NAME = 'open-pencil-tailwind-config'
const DB_VERSION = 2
const STORE = 'config'
const LIST_KEY = 'configs'
/** @deprecated Migrated to `LIST_KEY` on open. */
const LEGACY_KEY = 'default'

export type TailwindConfigEntry = {
  id: string
  name?: string
  /** Classic `module.exports` Tailwind config object. */
  config: TailwindConfigLike
}

export type TailwindConfigList = {
  version: 1
  /**
   * Ordered high → low priority. Codegen matches tokens in this order,
   * then falls back to built-in Tailwind/twirl defaults.
   */
  configs: TailwindConfigEntry[]
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error ?? new Error('Failed to open Tailwind config database'))
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

function isConfigLike(value: unknown): value is TailwindConfigLike {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isEntry(value: unknown): value is TailwindConfigEntry {
  if (!isConfigLike(value)) return false
  const id = (value as { id?: unknown }).id
  const config = (value as { config?: unknown }).config
  return typeof id === 'string' && id.length > 0 && isConfigLike(config)
}

function normalizeList(value: unknown): TailwindConfigList {
  if (isConfigLike(value) && Array.isArray((value as { configs?: unknown }).configs)) {
    const raw = value as { configs: unknown[] }
    const configs = raw.configs.filter(isEntry)
    return { version: 1, configs }
  }
  // Legacy single config object
  if (isConfigLike(value) && !('configs' in value)) {
    return {
      version: 1,
      configs: [{ id: 'default', name: 'Default', config: value }]
    }
  }
  return { version: 1, configs: [] }
}

function newId(): string {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** Read ordered Tailwind configs (high → low priority). */
export async function readTailwindConfigList(): Promise<TailwindConfigList> {
  try {
    const database = await getDatabase()
    const store = database.transaction(STORE).objectStore(STORE)
    const listed = await requestToPromise(store.get(LIST_KEY))
    if (listed !== undefined) return normalizeList(listed)

    const legacy = await requestToPromise(store.get(LEGACY_KEY))
    if (legacy !== undefined) {
      const migrated = normalizeList(legacy)
      await writeTailwindConfigList(migrated)
      return migrated
    }
    return { version: 1, configs: [] }
  } catch (error) {
    console.warn('[TailwindConfig] Failed to read', error)
    return { version: 1, configs: [] }
  }
}

/** Persist ordered configs (IndexedDB only). */
export async function writeTailwindConfigList(list: TailwindConfigList): Promise<void> {
  const database = await getDatabase()
  const transaction = database.transaction(STORE, 'readwrite')
  const store = transaction.objectStore(STORE)
  store.put({ version: 1, configs: list.configs }, LIST_KEY)
  store.delete(LEGACY_KEY)
  await transactionDone(transaction)
}

export async function clearTailwindConfigList(): Promise<void> {
  await writeTailwindConfigList({ version: 1, configs: [] })
}

/** @deprecated Prefer readTailwindConfigList. Returns configs in priority order. */
export async function readTailwindConfig(): Promise<TailwindConfigLike[]> {
  const list = await readTailwindConfigList()
  return list.configs.map((entry) => entry.config)
}

/** Replace the whole ordered list from plain config objects (index 0 = highest priority). */
export async function writeTailwindConfigs(configs: TailwindConfigLike[]): Promise<TailwindConfigList> {
  const list: TailwindConfigList = {
    version: 1,
    configs: configs.map((config, index) => ({
      id: newId(),
      name: `Config ${index + 1}`,
      config
    }))
  }
  await writeTailwindConfigList(list)
  return list
}

/** @deprecated Prefer writeTailwindConfigs / writeTailwindConfigList. */
export async function writeTailwindConfig(config: TailwindConfigLike): Promise<void> {
  await writeTailwindConfigs([config])
}

export async function clearTailwindConfig(): Promise<void> {
  await clearTailwindConfigList()
}
