type Listener = () => void

export type MutableValue<T> = {
  value: T
}

function readJSON<T>(key: string, initial: T): T {
  if (typeof window === 'undefined') return initial
  try {
    const raw = window.localStorage.getItem(key)
    if (raw == null) return initial
    return JSON.parse(raw) as T
  } catch {
    return initial
  }
}

function writeJSON<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore quota */
  }
}

export function createPersistedValue<T>(key: string, initial: T): MutableValue<T> & { subscribe: (listener: Listener) => () => void } {
  let current = readJSON(key, initial)
  const listeners = new Set<Listener>()

  const notify = () => {
    for (const listener of listeners) listener()
  }

  return {
    get value() {
      return current
    },
    set value(next: T) {
      if (Object.is(current, next)) return
      current = next
      writeJSON(key, next)
      notify()
    },
    subscribe(listener: Listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    }
  }
}

export function createComputedValue<T>(compute: () => T): MutableValue<T> {
  return {
    get value() {
      return compute()
    },
    set value(_next: T) {
      /* read-only */
    }
  }
}

export function watchValues(callback: () => void, values: Array<{ subscribe: (listener: Listener) => () => void }>): () => void {
  const unsubs = values.map((value) => value.subscribe(callback))
  callback()
  return () => {
    for (const unsub of unsubs) unsub()
  }
}
