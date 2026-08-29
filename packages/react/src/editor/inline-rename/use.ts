import { useCallback, useRef, useState } from 'react'

export type InlineRenameState<T extends string> = {
  editingId: T | null
  start: (id: T, currentName: string) => void
  commit: (id: T, eventOrInput: React.FocusEvent<HTMLInputElement> | HTMLInputElement) => void
  cancel: () => void
  onKeydown: (event: React.KeyboardEvent<HTMLInputElement>) => void
}

export function useInlineRename<T extends string>(
  onCommit: (id: T, newName: string) => void
): InlineRenameState<T> {
  const [editingId, setEditingId] = useState<T | null>(null)
  const editingIdRef = useRef<T | null>(null)
  const originalNameRef = useRef('')

  const setEditing = useCallback((id: T | null) => {
    editingIdRef.current = id
    setEditingId(id)
  }, [])

  const start = useCallback(
    (id: T, currentName: string) => {
      originalNameRef.current = currentName
      setEditing(id)
    },
    [setEditing]
  )

  const commit = useCallback(
    (id: T, eventOrInput: React.FocusEvent<HTMLInputElement> | HTMLInputElement) => {
      if (editingIdRef.current !== id) return
      const input =
        eventOrInput instanceof HTMLInputElement ? eventOrInput : eventOrInput.currentTarget
      const value = input.value.trim()
      if (value && value !== originalNameRef.current) {
        onCommit(id, value)
      }
      setEditing(null)
    },
    [onCommit, setEditing]
  )

  const cancel = useCallback(() => {
    setEditing(null)
  }, [setEditing])

  const onKeydown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.code === 'Enter') {
        event.currentTarget.blur()
        return
      }
      if (event.code === 'Escape') {
        event.stopPropagation()
        cancel()
      }
    },
    [cancel]
  )

  return { editingId, start, commit, cancel, onKeydown }
}
