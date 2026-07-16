import { useRef, useState } from 'react'

import { useVariables } from './useVariables'

export function useVariablesDialogState() {
  const variables = useVariables()

  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null)
  const collectionInputRefs = useRef(new Map<string, HTMLInputElement>())
  const pendingCollectionFocusId = useRef<string | null>(null)

  function setCollectionInputRef(id: string, el: HTMLInputElement | null) {
    if (el) collectionInputRefs.current.set(id, el)
    else collectionInputRefs.current.delete(id)

    if (el && pendingCollectionFocusId.current === id) {
      pendingCollectionFocusId.current = null
      queueMicrotask(() => {
        el.focus()
        el.select()
      })
    }
  }

  function startRenameCollection(id: string) {
    setEditingCollectionId(id)
    pendingCollectionFocusId.current = id
  }

  function commitRenameCollection(id: string, input: HTMLInputElement) {
    if (editingCollectionId !== id) return
    const value = input.value.trim()
    const col = variables.collections.find((collection) => collection.id === id)
    if (col && value && value !== col.name) {
      variables.renameCollection(id, value)
    }
    setEditingCollectionId(null)
  }

  return {
    ...variables,
    editingCollectionId,
    setCollectionInputRef,
    startRenameCollection,
    commitRenameCollection
  }
}
