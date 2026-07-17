import { useEffect, useRef, useState } from 'react'

export interface InlineRenameState<T extends string> {
  editingId: T | null
  start: (id: T, currentName: string) => void
  focusInput: (input: HTMLInputElement | null) => void
  commit: (id: T, input: HTMLInputElement) => void
  cancel: () => void
  onKeydown: (e: KeyboardEvent) => void
}

export function useInlineRename<T extends string>(
  onCommit: (id: T, newName: string) => void
): InlineRenameState<T> {
  const [editingId, setEditingId] = useState<T | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const originalNameRef = useRef('')

  useEffect(() => {
    if (!inputRef.current) return
    const input = inputRef.current
    const handleOutside = (e: MouseEvent) => {
      if (!input.contains(e.target as Node)) {
        input.blur()
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [editingId])

  function start(id: T, currentName: string) {
    originalNameRef.current = currentName
    setEditingId(id)
  }

  function focusInput(input: HTMLInputElement | null) {
    if (input === inputRef.current) return
    inputRef.current = input
    if (input) {
      requestAnimationFrame(() => {
        input.focus()
        input.select()
      })
    }
  }

  function commit(id: T, input: HTMLInputElement) {
    if (editingId !== id) return
    const value = input.value.trim()
    if (value && value !== originalNameRef.current) {
      onCommit(id, value)
    }
    setEditingId(null)
    inputRef.current = null
  }

  function cancel() {
    setEditingId(null)
    inputRef.current = null
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.code === 'Enter') {
      ;(e.target as HTMLInputElement).blur()
      return
    }

    if (e.code === 'Escape') {
      cancel()
    }
  }

  return { editingId, start, focusInput, commit, cancel, onKeydown }
}
