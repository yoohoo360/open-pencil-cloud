import { useEditorStore } from '@/app/editor/active-store'
import { ACTION_TOAST_DURATION } from '@/constants'

export function useActionToast() {
  const store = useEditorStore()
  let hideTimer: ReturnType<typeof setTimeout> | null = null

  function scheduleHideToast() {
    hideTimer = setTimeout(() => {
      store.state.actionToast = null
    }, ACTION_TOAST_DURATION)
  }

  function cancelHideToast() {
    if (hideTimer !== null) {
      clearTimeout(hideTimer)
      hideTimer = null
    }
  }

  function showActionToast(label: string) {
    store.state.actionToast = label
    cancelHideToast()
    scheduleHideToast()
  }

  return {
    showActionToast
  }
}
