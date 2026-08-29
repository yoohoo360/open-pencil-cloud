import { useEffect, useRef, type RefObject } from 'react'

import type { Editor } from '@open-pencil/core/editor'

import { createTextClipboardActions } from './clipboard'
import { createCaretBlink, createTextCompositionHandlers, createTextEditActions } from './editing'
import { createTextFormattingActions } from './formatting'
import { createTextKeyDownHandler } from './keyboard'
import { createHiddenTextArea, focusTextAreaOnCanvasPointerDown } from './textarea'

type EditorWithStoreSubscribe = Editor & {
  subscribe?: (onStoreChange: () => void) => () => void
}

/**
 * Bridges DOM text input and the editor's canvas text-editing model.
 *
 * Manages textarea-backed input, IME composition, caret blinking, keyboard
 * editing, formatting shortcuts, and syncing text/style-run updates.
 */
export function useTextEdit(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  store: Editor,
  options?: { isEnabled?: () => boolean }
) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const isEnabledRef = useRef(options?.isEnabled)
  isEnabledRef.current = options?.isEnabled
  const sessionRef = useRef<ReturnType<typeof createTextEditSession> | null>(null)
  if (!sessionRef.current) sessionRef.current = createTextEditSession(store, canvasRef, textareaRef)
  const session = sessionRef.current

  useEffect(() => {
    let activeId: string | null = null
    let el: HTMLTextAreaElement | null = null

    function teardown() {
      session.stopBlink()
      if (el) {
        el.removeEventListener('input', session.onInput)
        el.removeEventListener('compositionstart', session.onCompositionStart)
        el.removeEventListener('compositionupdate', onCompositionUpdate)
        el.removeEventListener('compositionend', onCompositionEnd)
        el.removeEventListener('keydown', session.onKeyDown)
        el.remove()
      }
      el = null
      textareaRef.current = null
      session.resetComposition()
    }

    function onCompositionUpdate(event: Event) {
      session.onCompositionUpdate(event as CompositionEvent)
    }

    function onCompositionEnd(event: Event) {
      session.onCompositionEnd(event as CompositionEvent)
    }

    function syncSession() {
      const enabled = isEnabledRef.current?.() ?? true
      const nextId = enabled ? store.state.editingTextId : null
      if (nextId === activeId) return
      teardown()
      activeId = nextId
      if (!nextId) return
      el = createHiddenTextArea()
      textareaRef.current = el
      el.addEventListener('input', session.onInput)
      el.addEventListener('compositionstart', session.onCompositionStart)
      el.addEventListener('compositionupdate', onCompositionUpdate)
      el.addEventListener('compositionend', onCompositionEnd)
      el.addEventListener('keydown', session.onKeyDown)
      el.focus()
      session.resetBlink()
    }

    syncSession()
    const storeWithSubscribe = store as EditorWithStoreSubscribe
    const stopSubscribe = storeWithSubscribe.subscribe
      ? storeWithSubscribe.subscribe(syncSession)
      : store.onEditorEvent('render:requested', syncSession)
    return () => {
      stopSubscribe()
      teardown()
    }
  }, [session, store])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    function onMouseDown() {
      focusTextAreaOnCanvasPointerDown(textareaRef, store)
    }
    canvas.addEventListener('mousedown', onMouseDown)
    return () => canvas.removeEventListener('mousedown', onMouseDown)
  }, [canvasRef, store])
}

function createTextEditSession(
  store: Editor,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  textareaRef: { current: HTMLTextAreaElement | null }
) {
  const { resetBlink, stopBlink } = createCaretBlink(store)
  const {
    getEditingNode,
    insertText,
    replaceComposedText,
    restoreComposition,
    finishComposition,
    deleteText
  } = createTextEditActions(store)
  const { toggleBold, toggleItalic, toggleUnderline } = createTextFormattingActions(store)
  const { handleCopy, handleCut, handlePaste } = createTextClipboardActions({
    store,
    insertText,
    deleteText,
    resetBlink
  })
  const {
    isComposing,
    onCompositionStart,
    onCompositionUpdate,
    onCompositionEnd,
    onInput,
    resetComposition
  } = createTextCompositionHandlers({
    textareaRef,
    getEditingNode,
    insertText,
    replaceComposedText,
    restoreComposition,
    finishComposition,
    resetBlink
  })
  const onKeyDown = createTextKeyDownHandler({
    store,
    canvasRef,
    getEditingNode,
    isComposing,
    insertText,
    deleteText,
    resetBlink,
    handleCopy,
    handleCut,
    handlePaste,
    toggleBold,
    toggleItalic,
    toggleUnderline
  })

  return {
    resetBlink,
    stopBlink,
    resetComposition,
    onInput,
    onCompositionStart,
    onCompositionUpdate,
    onCompositionEnd,
    onKeyDown
  }
}
