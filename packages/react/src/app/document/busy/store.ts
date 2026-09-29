import { atom } from 'nanostores'

export type DocumentBusyTask = {
  id: string
  label: string
}

export const documentBusyTasks = atom<DocumentBusyTask[]>([])

let nextId = 0

/** Register an in-progress document task; call the returned disposer when finished. */
export function beginDocumentBusy(label: string): () => void {
  const id = `busy-${++nextId}`
  const trimmed = label.trim() || 'Working…'
  documentBusyTasks.set([...documentBusyTasks.get(), { id, label: trimmed }])
  let released = false
  return () => {
    if (released) return
    released = true
    documentBusyTasks.set(documentBusyTasks.get().filter((task) => task.id !== id))
  }
}

export function hasDocumentBusy(): boolean {
  return documentBusyTasks.get().length > 0
}

export function documentBusyLabels(): string[] {
  return documentBusyTasks.get().map((task) => task.label)
}

/**
 * Run `work` while showing `label` in the document busy bar.
 * Always clears the task, including on throw.
 */
export async function withDocumentBusy<T>(label: string, work: () => Promise<T>): Promise<T> {
  const end = beginDocumentBusy(label)
  try {
    return await work()
  } finally {
    end()
  }
}
