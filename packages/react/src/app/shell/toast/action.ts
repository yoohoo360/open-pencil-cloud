import { useRef } from 'react'

import { useEditorStore } from '#react/app/editor/store'
import { ACTION_TOAST_DURATION } from '#react/constants'

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
