/**
 * Framework-agnostic UI notification bus for the app editor store.
 * Vue and React shells both subscribe here during the parallel migration.
 */

type Listener = () => void

const listeners = new Set<Listener>()

export function subscribeEditorUI(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function notifyEditorUI(): void {
  for (const listener of listeners) listener()
}
