import { useCallback, useEffect, useRef } from 'react'

import { useEditorStore } from '@/app/editor/active-store'
import { ACTION_TOAST_DURATION } from '@/constants'

export function useActionToast() {
  const store = useEditorStore()
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timeout.current) clearTimeout(timeout.current)
    },
    []
  )

  const showActionToast = useCallback(
    (label: string) => {
      store.state.actionToast = label
      if (timeout.current) clearTimeout(timeout.current)
      timeout.current = setTimeout(() => {
        store.state.actionToast = null
        timeout.current = null
      }, ACTION_TOAST_DURATION)
    },
    [store]
  )

  return {
    showActionToast
  }
}
