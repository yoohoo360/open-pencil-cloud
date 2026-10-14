import {
  DEFAULT_SKILL_AGENT_ENVIRONMENTS,
  isSkillAgentEnvironmentId,
  type SkillAgentEnvironmentId
} from '#react/app/skills/agent-environments'

const DB_NAME = 'open-pencil-skill-workdir'
const DB_VERSION = 1
const WORKDIRS = 'workdirs'
const META = 'meta'
const META_KEY = 'index'

/**
 * Workspace bookmark only (path / handle / install targets).
 * Skill on/off and platform vs local are never stored here — only disk
 * directories with SKILL.md plus the platform skill API list.
 */
export type WorkdirRecord = {
  id: string
  name: string
  /** Display path (absolute on desktop; folder name / entered path in browser). */
  path: string
  /** Install targets when enabling a skill. */
  agentEnvironments: SkillAgentEnvironmentId[]
  createdAt: string
  /** Browser File System Access handle when available. */
  directoryHandle?: FileSystemDirectoryHandle
}

export type WorkdirIndex = {
  activeWorkdirId: string | null
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () =>
      reject(request.error ?? new Error('Failed to open skill workdir database'))
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(WORKDIRS)) {
        database.createObjectStore(WORKDIRS, { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains(META)) {
        database.createObjectStore(META)
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

function newId(): string {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function normalizeEnvs(values: unknown): SkillAgentEnvironmentId[] {
  if (!Array.isArray(values)) return [...DEFAULT_SKILL_AGENT_ENVIRONMENTS]
  const next = values.flatMap((value) =>
    typeof value === 'string' && isSkillAgentEnvironmentId(value) ? [value] : []
  )
  return next.length > 0 ? [...new Set(next)] : [...DEFAULT_SKILL_AGENT_ENVIRONMENTS]
}

function normalizeRecord(raw: unknown): WorkdirRecord | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const id = typeof row.id === 'string' ? row.id : ''
  const name = typeof row.name === 'string' ? row.name : ''
  const path = typeof row.path === 'string' ? row.path : ''
  const createdAt = typeof row.createdAt === 'string' ? row.createdAt : new Date(0).toISOString()
  if (!id || !name || !path) return null
  const directoryHandle =
    row.directoryHandle && typeof row.directoryHandle === 'object'
      ? (row.directoryHandle as FileSystemDirectoryHandle)
      : undefined
  return {
    id,
    name,
    path,
    createdAt,
    agentEnvironments: normalizeEnvs(row.agentEnvironments),
    directoryHandle
  }
}

async function readIndex(): Promise<WorkdirIndex> {
  const database = await getDatabase()
  const value = await requestToPromise(
    database.transaction(META).objectStore(META).get(META_KEY)
  )
  if (!value || typeof value !== 'object') return { activeWorkdirId: null }
  const activeWorkdirId =
    typeof (value as { activeWorkdirId?: unknown }).activeWorkdirId === 'string'
      ? (value as { activeWorkdirId: string }).activeWorkdirId
      : null
  return { activeWorkdirId }
}

async function writeIndex(index: WorkdirIndex): Promise<void> {
  const database = await getDatabase()
  const transaction = database.transaction(META, 'readwrite')
  transaction.objectStore(META).put(index, META_KEY)
  await transactionDone(transaction)
}

export async function listWorkdirRecords(): Promise<{
  index: WorkdirIndex
  workdirs: WorkdirRecord[]
}> {
  const database = await getDatabase()
  const index = await readIndex()
  const rows = await requestToPromise(
    database.transaction(WORKDIRS).objectStore(WORKDIRS).getAll()
  )
  const workdirs = rows
    .map((row) => normalizeRecord(row))
    .filter((row): row is WorkdirRecord => row !== null)
    .sort((a, b) => a.name.localeCompare(b.name))
  return { index, workdirs }
}

export async function getWorkdirRecord(id: string): Promise<WorkdirRecord | null> {
  const database = await getDatabase()
  const row = await requestToPromise(database.transaction(WORKDIRS).objectStore(WORKDIRS).get(id))
  return normalizeRecord(row)
}

/** Canonical path for uniqueness / URL (trim, drop trailing separators). */
export function normalizeWorkdirPath(path: string): string {
  const trimmed = path.trim()
  if (!trimmed) return ''
  const withoutTrailing = trimmed.replace(/[/\\]+$/, '')
  return withoutTrailing || trimmed
}

export async function findWorkdirRecordByPath(path: string): Promise<WorkdirRecord | null> {
  const target = normalizeWorkdirPath(path)
  if (!target) return null
  const { workdirs } = await listWorkdirRecords()
  return (
    workdirs.find((row) => normalizeWorkdirPath(row.path) === target) ?? null
  )
}

export async function createWorkdirRecord(input: {
  path: string
  name?: string
  agentEnvironments?: SkillAgentEnvironmentId[]
  directoryHandle?: FileSystemDirectoryHandle
}): Promise<WorkdirRecord> {
  const path = normalizeWorkdirPath(input.path)
  if (!path) throw new Error('Workspace path is required')
  const existing = await findWorkdirRecordByPath(path)
  if (existing) {
    // Same address → reuse; refresh handle / optional name when provided.
    return updateWorkdirRecord(existing.id, {
      path,
      name: input.name?.trim() || existing.name,
      directoryHandle: input.directoryHandle ?? existing.directoryHandle,
      agentEnvironments: input.agentEnvironments ?? existing.agentEnvironments
    })
  }
  const name = (input.name?.trim() || path.split(/[/\\]/).filter(Boolean).at(-1) || 'workspace').trim()
  const record: WorkdirRecord = {
    id: newId(),
    name,
    path,
    createdAt: new Date().toISOString(),
    agentEnvironments: normalizeEnvs(input.agentEnvironments),
    directoryHandle: input.directoryHandle
  }
  const database = await getDatabase()
  const index = await readIndex()
  const transaction = database.transaction([WORKDIRS, META], 'readwrite')
  // Drop legacy skill-state fields (platformSkillKeys / enabledPlatformKeys) on write.
  transaction.objectStore(WORKDIRS).put(record)
  if (!index.activeWorkdirId) {
    transaction.objectStore(META).put({ activeWorkdirId: record.id }, META_KEY)
  }
  await transactionDone(transaction)
  return record
}

export async function updateWorkdirRecord(
  id: string,
  patch: Partial<
    Pick<WorkdirRecord, 'name' | 'agentEnvironments' | 'directoryHandle' | 'path'>
  >
): Promise<WorkdirRecord> {
  const existing = await getWorkdirRecord(id)
  if (!existing) throw new Error('Workdir not found')
  const next: WorkdirRecord = {
    ...existing,
    ...patch,
    agentEnvironments: patch.agentEnvironments
      ? normalizeEnvs(patch.agentEnvironments)
      : existing.agentEnvironments
  }
  const database = await getDatabase()
  const transaction = database.transaction(WORKDIRS, 'readwrite')
  transaction.objectStore(WORKDIRS).put(next)
  await transactionDone(transaction)
  return next
}

export async function removeWorkdirRecord(id: string): Promise<void> {
  const { index, workdirs } = await listWorkdirRecords()
  const database = await getDatabase()
  const transaction = database.transaction([WORKDIRS, META], 'readwrite')
  transaction.objectStore(WORKDIRS).delete(id)
  if (index.activeWorkdirId === id) {
    const nextActive = workdirs.find((row) => row.id !== id)?.id ?? null
    transaction.objectStore(META).put({ activeWorkdirId: nextActive }, META_KEY)
  }
  await transactionDone(transaction)
}

export async function activateWorkdirRecord(id: string): Promise<WorkdirIndex> {
  const existing = await getWorkdirRecord(id)
  if (!existing) throw new Error('Workdir not found')
  const index = { activeWorkdirId: id }
  await writeIndex(index)
  return index
}
