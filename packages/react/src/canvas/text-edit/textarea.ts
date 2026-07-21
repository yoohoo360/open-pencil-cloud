import { useEffect, type MutableRefObject } from 'react'

import type { Editor } from '@open-pencil/core/editor'

export function createHiddenTextArea() {
  const textarea = document.createElement('textarea')
  textarea.setAttribute('aria-hidden', 'true')
  textarea.tabIndex = -1
  textarea.className = 'fixed left-0 top-0 h-px w-px opacity-0'
  document.body.appendChild(textarea)
  return textarea
}

export function focusTextAreaOnCanvasPointerDown(
  textareaRef: MutableRefObject<HTMLTextAreaElement | null>,
  store: Editor
) {
  if (store.state.editingTextId && textareaRef.current) {
    requestAnimationFrame(() => textareaRef.current?.focus())
  }
}

export function useTextEditingSession({
  store,
  textareaRef,
  resetBlink,
  stopBlink,
  resetComposition
}: {
  store: Editor
  textareaRef: MutableRefObject<HTMLTextAreaElement | null>
  resetBlink: () => void
  stopBlink: () => void
  resetComposition: () => void
}) {
  useEffect(() => {
    const id = store.state.editingTextId
    if (!id) return

    const el = createHiddenTextArea()
    textareaRef.current = el
    el.focus()
    resetBlink()

    return () => {
      stopBlink()
      el.remove()
      textareaRef.current = null
      resetComposition()
    }
  }, [store.state.editingTextId, resetBlink, resetComposition, stopBlink, store, textareaRef])
}
