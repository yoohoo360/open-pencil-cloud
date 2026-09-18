import { useRef } from 'react'

import { useEditorStore, type EditorStore } from '#react/app/editor/store'
import { ACTION_TOAST_DURATION } from '#react/constants'

const toastTimers = new WeakMap<EditorStore, ReturnType<typeof setTimeout>>()

/** Imperative toast for non-React call sites (menu / save / keyboard). */
export function flashActionToast(
  store: EditorStore,
  label: string,
  duration = ACTION_TOAST_DURATION
): void {
  const previous = toastTimers.get(store)
  if (previous) clearTimeout(previous)
  store.state.actionToast = label
  store.notify()
  toastTimers.set(
    store,
    setTimeout(() => {
      store.state.actionToast = null
      store.notify()
      toastTimers.delete(store)
    }, duration)
  )
}

export function useActionToast() {
  const store = useEditorStore()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showActionToast(label: string) {
    if (timer.current) clearTimeout(timer.current)
    store.state.actionToast = label
    store.notify()
    timer.current = setTimeout(() => {
      store.state.actionToast = null
      store.notify()
      timer.current = null
    }, ACTION_TOAST_DURATION)
  }

  return { showActionToast }
}
