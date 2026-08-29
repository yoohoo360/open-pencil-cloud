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
  textareaRef: { current: HTMLTextAreaElement | null },
  store: Editor
) {
  if (store.state.editingTextId && textareaRef.current) {
    requestAnimationFrame(() => textareaRef.current?.focus())
  }
}
