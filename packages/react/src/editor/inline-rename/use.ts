import { useCallback, useEffect, useRef, useState } from 'react'

import { tryOnScopeDispose, useOnClickOutside } from '#react/shared/dom/hooks'
import { blurTarget } from '#react/shared/dom-events'

export interface InlineRenameState<T extends string> {
  editingId: T | null
  start: (id: T, currentName: string) => void
  focusInput: (input: HTMLInputElement | null) => Promise<void>
  commit: (id: T, eventOrInput: Event | HTMLInputElement) => void
  cancel: () => void
  onKeydown: (e: KeyboardEvent) => void
}

export function useInlineRename<T extends string>(
  onCommit: (id: T, newName: string) => void
): InlineRenameState<T> {
  const [editingId, setEditingId] = useState<T | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const targetRef = useRef<HTMLInputElement | null>(null)
  let originalName = ''

  useOnClickOutside(targetRef, () => {
    targetRef.current?.blur()
  })

  function start(id: T, currentName: string) {
    setEditingId(id)
    originalName = currentName
  }

  const focusInput = useCallback(async (input: HTMLInputElement | null) => {
    if (input === inputRef.current) return
    inputRef.current = input
    targetRef.current = input
    await Promise.resolve()
    input?.focus()
    input?.select()
  }, [])

  function commit(id: T, eventOrInput: Event | HTMLInputElement) {
    if (editingId !== id) return
    let input: HTMLInputElement | null
    if (eventOrInput instanceof HTMLInputElement) {
      input = eventOrInput
    } else {
      input = eventOrInput.target instanceof HTMLInputElement ? eventOrInput.target : null
    }
    if (!input) return
    const value = input.value.trim()
    if (value && value !== originalName) {
      onCommit(id, value)
    }
    setEditingId(null)
    inputRef.current = null
    targetRef.current = null
  }

  function cancel() {
    setEditingId(null)
    inputRef.current = null
    targetRef.current = null
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.code === 'Enter') {
      blurTarget(e)
      return
    }

    if (e.code === 'Escape') {
      cancel()
    }
  }

  return { editingId, start, focusInput, commit, cancel, onKeydown }
}
