import { useEffect } from 'react'
import { useStore } from '@nanostores/react'

import {
  documentBusyLabels,
  documentBusyTasks,
  hasDocumentBusy
} from '#react/app/document/busy/store'
import { dialogMessages } from '#react/i18n/messages'

/** In-app leave (links, programmatic nav, intercepted refresh). Lists active tasks. */
export function confirmLeaveDespiteBusy(): boolean {
  const labels = documentBusyLabels()
  if (labels.length === 0) return true
  const dialogs = dialogMessages.get()
  const list = labels.map((label) => `• ${label}`).join('\n')
  return window.confirm(
    `${dialogs.documentBusyLeaveTitle}\n\n${list}\n\n${dialogs.documentBusyLeavePrompt}`
  )
}

/**
 * Blocks browser refresh / tab close while document tasks are running.
 * F5 / Ctrl·⌘+R shows a confirm that lists active tasks; other closes use the
 * browser's generic leave prompt (custom text is not allowed).
 */
export function useDocumentBusyLeaveGuard(): void {
  const tasks = useStore(documentBusyTasks)

  useEffect(() => {
    if (tasks.length === 0) return

    let allowUnload = false

    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (allowUnload || !hasDocumentBusy()) return
      event.preventDefault()
      event.returnValue = ''
    }

    function onKeyDown(event: KeyboardEvent) {
      if (!hasDocumentBusy()) return
      const key = event.key.toLowerCase()
      const refresh =
        event.key === 'F5' || ((event.metaKey || event.ctrlKey) && key === 'r' && !event.altKey)
      if (!refresh) return
      event.preventDefault()
      event.stopPropagation()
      if (!confirmLeaveDespiteBusy()) return
      allowUnload = true
      window.location.reload()
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    window.addEventListener('keydown', onKeyDown, true)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      window.removeEventListener('keydown', onKeyDown, true)
    }
  }, [tasks.length])
}
