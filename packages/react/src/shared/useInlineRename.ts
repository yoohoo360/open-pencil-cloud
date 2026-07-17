import { useCallback, useEffect, useRef, useState } from 'react'

export interface InlineRenameState<T extends string> {
  editingId: T | null
  start: (id: T, currentName: string) => void
  focusInput: (input: HTMLInputElement | null) => void
  commit: (id: T, input: HTMLInputElement) => void
  cancel: () => void
  onKeydown: (e: KeyboardEvent) => void
}

/**
 * Inline rename editing state for lists (pages, layers, collections, etc.).
 */
export function useInlineRename<T extends string>(
  onCommit: (id: T, newName: string) => void
): InlineRenameState<T> {
  const [editingId, setEditingId] = useState<T | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const originalNameRef = useRef('')
  const onCommitRef = useRef(onCommit)
  onCommitRef.current = onCommit

  const cancel = useCallback(() => {
    setEditingId(null)
    inputRef.current = null
  }, [])

  useEffect(() => {
    const input = inputRef.current
    if (!input || editingId === null) return

    function onPointerDown(e: PointerEvent) {
      if (!inputRef.current) return
      if (e.target instanceof Node && inputRef.current.contains(e.target)) return
      inputRef.current.blur()
    }

    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [editingId])

  function start(id: T, currentName: string) {
    setEditingId(id)
    originalNameRef.current = currentName
  }

  function focusInput(input: HTMLInputElement | null) {
    if (input === inputRef.current) return
    inputRef.current = input
    if (input) {
      // Defer focus until after React commit (mirrors Vue nextTick).
      queueMicrotask(() => {
        input.focus()
        input.select()
      })
    }
  }

  function commit(id: T, input: HTMLInputElement) {
    if (editingId !== id) return
    const value = input.value.trim()
    if (value && value !== originalNameRef.current) {
      onCommitRef.current(id, value)
    }
    setEditingId(null)
    inputRef.current = null
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.code === 'Enter') {
      if (e.target instanceof HTMLInputElement) e.target.blur()
      return
    }

    if (e.code === 'Escape') {
      cancel()
    }
  }

  return { editingId, start, focusInput, commit, cancel, onKeydown }
}
