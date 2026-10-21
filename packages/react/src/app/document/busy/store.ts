import { atom } from 'nanostores'

export type DocumentBusyTask = {
  id: string
  label: string
  /** `performance.now()` when the task was registered. */
  startedAt: number
}

export const documentBusyTasks = atom<DocumentBusyTask[]>([])

/**
 * Max time a busy indicator may stay up without its disposer running.
 * Hung saves / aborted leaves otherwise pin the bar forever.
 */
export const DOCUMENT_BUSY_STALE_MS = 3 * 60 * 1000

let nextId = 0
const staleTimers = new Map<string, ReturnType<typeof setTimeout>>()

function removeBusyTask(id: string): void {
  const timer = staleTimers.get(id)
  if (timer !== undefined) {
    clearTimeout(timer)
    staleTimers.delete(id)
  }
  const current = documentBusyTasks.get()
  if (!current.some((task) => task.id === id)) return
  documentBusyTasks.set(current.filter((task) => task.id !== id))
}

function scheduleStaleCleanup(id: string, label: string, maxMs: number): void {
  const previous = staleTimers.get(id)
  if (previous !== undefined) clearTimeout(previous)
  staleTimers.set(
    id,
    setTimeout(() => {
      staleTimers.delete(id)
      if (!documentBusyTasks.get().some((task) => task.id === id)) return
      console.warn(`[document-busy] clearing stale work after ${maxMs}ms: ${label}`)
      removeBusyTask(id)
    }, maxMs)
  )
}

/** Register an in-progress document task; call the returned disposer when finished. */
export function beginDocumentBusy(
  label: string,
  options?: { maxMs?: number }
): () => void {
  const id = `busy-${++nextId}`
  const trimmed = label.trim() || 'Working…'
  const maxMs = options?.maxMs ?? DOCUMENT_BUSY_STALE_MS
  const startedAt =
    typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now()
  documentBusyTasks.set([...documentBusyTasks.get(), { id, label: trimmed, startedAt }])
  scheduleStaleCleanup(id, trimmed, maxMs)
  let released = false
  return () => {
    if (released) return
    released = true
    removeBusyTask(id)
  }
}

export function hasDocumentBusy(): boolean {
  return documentBusyTasks.get().length > 0
}

export function documentBusyLabels(): string[] {
  return documentBusyTasks.get().map((task) => task.label)
}

/** Drop every busy task (document leave / session teardown). */
export function clearAllDocumentBusy(): void {
  for (const timer of staleTimers.values()) clearTimeout(timer)
  staleTimers.clear()
  if (documentBusyTasks.get().length === 0) return
  documentBusyTasks.set([])
}

/**
 * Drop tasks older than `maxAgeMs` (default {@link DOCUMENT_BUSY_STALE_MS}).
 * Safe to call from leave guards or periodic sweeps.
 */
export function clearStaleDocumentBusy(maxAgeMs = DOCUMENT_BUSY_STALE_MS): number {
  const now =
    typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now()
  const current = documentBusyTasks.get()
  const keep: DocumentBusyTask[] = []
  let removed = 0
  for (const task of current) {
    if (now - task.startedAt < maxAgeMs) {
      keep.push(task)
      continue
    }
    removed++
    const timer = staleTimers.get(task.id)
    if (timer !== undefined) {
      clearTimeout(timer)
      staleTimers.delete(task.id)
    }
    console.warn(
      `[document-busy] clearing stale work (age ${Math.round(now - task.startedAt)}ms): ${task.label}`
    )
  }
  if (removed > 0) documentBusyTasks.set(keep)
  return removed
}

/**
 * Run `work` while showing `label` in the document busy bar.
 * Always clears the task, including on throw; also auto-clears if `work` hangs past `maxMs`.
 */
export async function withDocumentBusy<T>(
  label: string,
  work: () => Promise<T>,
  options?: { maxMs?: number }
): Promise<T> {
  const end = beginDocumentBusy(label, options)
  try {
    return await work()
  } finally {
    end()
  }
}
