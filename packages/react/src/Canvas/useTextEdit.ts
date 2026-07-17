import { useEffect, useRef, type RefObject } from 'react'

import {
  adjustRunsForDelete,
  adjustRunsForInsert,
  toggleBoldInRange,
  toggleDecorationInRange,
  toggleItalicInRange
} from '@open-pencil/core'

import type { SceneNode } from '@open-pencil/core'
import type { Editor } from '@open-pencil/core/editor'

const CARET_BLINK_MS = 530

/**
 * Bridges DOM text input and the editor's canvas text-editing model.
 *
 * This hook manages textarea-backed input, IME composition, caret
 * blinking, keyboard editing behavior, text formatting shortcuts, and syncing
 * text/style-run updates back into the scene graph.
 */
export function useTextEdit(canvasRef: RefObject<HTMLCanvasElement | null>, store: Editor) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const isComposingRef = useRef(false)
  const blinkTimerRef = useRef(0)
  const storeRef = useRef(store)
  storeRef.current = store

  function getEditingNode() {
    const id = storeRef.current.state.editingTextId
    if (!id) return null
    return storeRef.current.graph.getNode(id) ?? null
  }

  function resetBlink() {
    if (storeRef.current.textEditor) storeRef.current.textEditor.caretVisible = true
    clearInterval(blinkTimerRef.current)
    blinkTimerRef.current = window.setInterval(() => {
      const editor = storeRef.current.textEditor
      if (!editor) return
      editor.caretVisible = !editor.caretVisible
      storeRef.current.requestRepaint()
    }, CARET_BLINK_MS)
    storeRef.current.requestRepaint()
  }

  function syncText(nodeId: string, text: string, runs?: SceneNode['styleRuns']) {
    const changes: Partial<SceneNode> = { text }
    if (runs !== undefined) changes.styleRuns = runs
    storeRef.current.graph.updateNode(nodeId, changes)
    storeRef.current.requestRender()
  }

  function insertText(text: string, node: SceneNode) {
    const editor = storeRef.current.textEditor
    if (!editor) return
    const range = editor.getSelectionRange()
    let runs = node.styleRuns
    if (range) {
      runs = adjustRunsForDelete(runs, range[0], range[1] - range[0])
      runs = adjustRunsForInsert(runs, range[0], text.length)
    } else {
      runs = adjustRunsForInsert(runs, editor.state?.cursor ?? 0, text.length)
    }
    editor.insert(text, node)
    syncText(node.id, editor.state?.text ?? '', runs)
  }

  function deleteText(node: SceneNode, forward: boolean) {
    const editor = storeRef.current.textEditor
    if (!editor) return
    const range = editor.getSelectionRange()
    let runs = node.styleRuns
    if (range) {
      runs = adjustRunsForDelete(runs, range[0], range[1] - range[0])
    } else if (forward && editor.state && editor.state.cursor < node.text.length) {
      runs = adjustRunsForDelete(runs, editor.state.cursor, 1)
    } else if (!forward && editor.state && editor.state.cursor > 0) {
      runs = adjustRunsForDelete(runs, editor.state.cursor - 1, 1)
    }
    if (forward) {
      editor.delete(node)
    } else {
      editor.backspace(node)
    }
    syncText(node.id, editor.state?.text ?? '', runs)
  }

  function onCompositionStart() {
    isComposingRef.current = true
  }

  function onCompositionEnd(e: CompositionEvent) {
    isComposingRef.current = false
    if (!e.data) return
    const node = getEditingNode()
    if (!node) return
    insertText(e.data, node)
    const el = textareaRef.current
    if (el) el.value = ''
    resetBlink()
  }

  function onInput() {
    const el = textareaRef.current
    if (isComposingRef.current || !el) return
    const text = el.value
    if (!text) return
    el.value = ''

    const node = getEditingNode()
    if (!node) return
    insertText(text, node)
    resetBlink()
  }

  function handleHorizontalArrow(
    e: KeyboardEvent,
    editor: NonNullable<(typeof store)['textEditor']>
  ) {
    const select = e.shiftKey
    const isMeta = e.metaKey || e.ctrlKey
    if (e.code === 'ArrowLeft') {
      if (isMeta) editor.moveToLineStart(select)
      else if (e.altKey) editor.moveWordLeft(select)
      else editor.moveLeft(select)
    } else if (e.code === 'ArrowRight') {
      if (isMeta) editor.moveToLineEnd(select)
      else if (e.altKey) editor.moveWordRight(select)
      else editor.moveRight(select)
    }
  }

  function handleDeletion(
    e: KeyboardEvent,
    editor: NonNullable<(typeof store)['textEditor']>,
    node: SceneNode
  ) {
    const isMeta = e.metaKey || e.ctrlKey
    const forward = e.code === 'Delete'
    if (forward) {
      if (isMeta) editor.moveToLineEnd(true)
      else if (e.altKey) editor.moveWordRight(true)
    } else {
      if (isMeta) editor.moveToLineStart(true)
      else if (e.altKey) editor.moveWordLeft(true)
    }
    deleteText(node, forward)
  }

  type MetaAction = (node: SceneNode) => void
  const metaKeyActions: Partial<Record<string, MetaAction>> = {
    KeyA: () => storeRef.current.textEditor?.selectAll(),
    KeyC: () => handleCopy(),
    KeyX: (node) => handleCut(node),
    KeyV: (node) => void handlePaste(node),
    KeyB: (node) => toggleBold(node),
    KeyI: (node) => toggleItalic(node),
    KeyU: (node) => toggleUnderline(node)
  }

  function onKeyDown(e: KeyboardEvent) {
    if (isComposingRef.current) return
    const s = storeRef.current
    const editor = s.textEditor
    const node = getEditingNode()
    if (!editor || !node) return

    const isMeta = e.metaKey || e.ctrlKey
    let textChanged = false

    switch (e.code) {
      case 'Escape':
        s.commitTextEdit()
        canvasRef.current?.focus()
        e.preventDefault()
        return
      case 'Enter':
        insertText('\n', node)
        textChanged = true
        break
      case 'Backspace':
      case 'Delete':
        handleDeletion(e, editor, node)
        textChanged = true
        break
      case 'ArrowLeft':
      case 'ArrowRight':
        handleHorizontalArrow(e, editor)
        break
      case 'ArrowUp':
        editor.moveUp(e.shiftKey)
        break
      case 'ArrowDown':
        editor.moveDown(e.shiftKey)
        break
      case 'Home':
        editor.moveToLineStart(e.shiftKey)
        break
      case 'End':
        editor.moveToLineEnd(e.shiftKey)
        break
      default: {
        if (!isMeta) return
        const action = metaKeyActions[e.code]
        if (!action) return
        action(node)
        e.preventDefault()
        return
      }
    }

    if (!textChanged) {
      s.requestRender()
    }
    resetBlink()
    e.preventDefault()
  }

  function applyFormatting(nodeId: string, changes: Partial<SceneNode>, label: string) {
    const s = storeRef.current
    s.updateNodeWithUndo(nodeId, changes, label)
    const updated = s.graph.getNode(nodeId)
    if (updated) s.textEditor?.rebuildParagraph(updated)
    s.requestRender()
  }

  function toggleBold(node: SceneNode) {
    const editor = storeRef.current.textEditor
    const range = editor?.getSelectionRange()
    if (range) {
      const { runs } = toggleBoldInRange(
        node.styleRuns,
        range[0],
        range[1],
        node.fontWeight,
        node.text.length
      )
      applyFormatting(node.id, { styleRuns: runs }, 'Toggle bold')
    } else {
      applyFormatting(node.id, { fontWeight: node.fontWeight >= 700 ? 400 : 700 }, 'Toggle bold')
    }
  }

  function toggleItalic(node: SceneNode) {
    const editor = storeRef.current.textEditor
    const range = editor?.getSelectionRange()
    if (range) {
      const { runs } = toggleItalicInRange(
        node.styleRuns,
        range[0],
        range[1],
        node.italic,
        node.text.length
      )
      applyFormatting(node.id, { styleRuns: runs }, 'Toggle italic')
    } else {
      applyFormatting(node.id, { italic: !node.italic }, 'Toggle italic')
    }
  }

  function toggleUnderline(node: SceneNode) {
    const editor = storeRef.current.textEditor
    const range = editor?.getSelectionRange()
    if (range) {
      const { runs } = toggleDecorationInRange(
        node.styleRuns,
        range[0],
        range[1],
        'UNDERLINE',
        node.textDecoration,
        node.text.length
      )
      applyFormatting(node.id, { styleRuns: runs }, 'Toggle underline')
    } else {
      applyFormatting(
        node.id,
        { textDecoration: node.textDecoration === 'UNDERLINE' ? 'NONE' : 'UNDERLINE' },
        'Toggle underline'
      )
    }
  }

  function handleCopy() {
    const editor = storeRef.current.textEditor
    if (!editor) return
    const text = editor.getSelectedText()
    if (text) void navigator.clipboard.writeText(text)
  }

  function handleCut(node: ReturnType<typeof getEditingNode>) {
    const editor = storeRef.current.textEditor
    if (!editor || !node) return
    const text = editor.getSelectedText()
    if (text) {
      void navigator.clipboard.writeText(text)
      deleteText(node, false)
      resetBlink()
    }
  }

  async function handlePaste(node: ReturnType<typeof getEditingNode>) {
    const editor = storeRef.current.textEditor
    if (!editor || !node) return
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        insertText(text, node)
        resetBlink()
      }
    } catch (e) {
      console.warn('Clipboard access denied:', e)
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    function onCanvasMouseDown() {
      const s = storeRef.current
      if (s.state.editingTextId && textareaRef.current) {
        requestAnimationFrame(() => textareaRef.current?.focus())
      }
    }

    canvas.addEventListener('mousedown', onCanvasMouseDown)
    return () => canvas.removeEventListener('mousedown', onCanvasMouseDown)
  }, [canvasRef])

  useEffect(() => {
    const s = storeRef.current
    const editingId = s.state.editingTextId
    if (!editingId) return

    const el = document.createElement('textarea')
    el.style.cssText =
      'position:fixed;opacity:0;width:1px;height:1px;padding:0;border:0;top:50%;left:50%;overflow:hidden;resize:none;'
    el.autocomplete = 'off'
    el.setAttribute('autocorrect', 'off')
    el.setAttribute('autocapitalize', 'none')
    el.spellcheck = false
    el.tabIndex = -1
    el.setAttribute('aria-hidden', 'true')
    document.body.appendChild(el)
    textareaRef.current = el
    el.focus()
    resetBlink()

    el.addEventListener('input', onInput)
    el.addEventListener('compositionstart', onCompositionStart)
    el.addEventListener('compositionend', onCompositionEnd as EventListener)
    el.addEventListener('keydown', onKeyDown)

    return () => {
      clearInterval(blinkTimerRef.current)
      el.removeEventListener('input', onInput)
      el.removeEventListener('compositionstart', onCompositionStart)
      el.removeEventListener('compositionend', onCompositionEnd as EventListener)
      el.removeEventListener('keydown', onKeyDown)
      el.remove()
      textareaRef.current = null
      isComposingRef.current = false
    }
  }, [store.state.editingTextId])
}
