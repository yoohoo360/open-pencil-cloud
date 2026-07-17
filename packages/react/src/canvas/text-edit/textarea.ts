import { useEffect } from 'react'
import type { ReactiveRef as ShallowRef } from '#react/internal/reactive'
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
  textareaRef: ShallowRef<HTMLTextAreaElement | null>,
  store: Editor
) {
  if (store.state.editingTextId && textareaRef.value) {
    requestAnimationFrame(() => textareaRef.value?.focus())
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
  textareaRef: ShallowRef<HTMLTextAreaElement | null>
  resetBlink: () => void
  stopBlink: () => void
  resetComposition: () => void
}) {
  useEffect(() => {
    if (store.state.editingTextId) {
      const el = createHiddenTextArea()
      textareaRef.value = el
      el.focus()
      resetBlink()

      return () => {
        stopBlink()
        el.remove()
        textareaRef.value = null
        resetComposition()
      }
    }
    return undefined
  }, [store.state.editingTextId]) // eslint-disable-line react-hooks/exhaustive-deps
}
