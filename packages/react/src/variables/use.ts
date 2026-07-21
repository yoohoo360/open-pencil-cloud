import { useEffect, useMemo, useState } from 'react'

import type { Variable } from '@open-pencil/scene-graph'

import { useEditor } from '#react/editor/context'
import { useSceneComputed } from '#react/internal/scene-computed/use'
import { createVariableCollectionActions, createVariableValueActions } from '#react/variables/helpers'

export function useVariables() {
  const editor = useEditor()
  const [searchTerm, setSearchTermState] = useState('')

  function setSearchTerm(term: string) {
    setSearchTermState(term)
  }

  const collections = useSceneComputed(() => editor.getCollections())

  const [activeCollectionId, setActiveCollectionId] = useState(collections[0]?.id ?? '')

  useEffect(() => {
    if (!activeCollectionId && collections[0]) setActiveCollectionId(collections[0].id)
  }, [activeCollectionId, collections])

  const activeCollection = useMemo(
    () => editor.getCollection(activeCollectionId) ?? null,
    [activeCollectionId, editor, collections]
  )
  const activeModes = useMemo(() => activeCollection?.modes ?? [], [activeCollection])

  const variables = useSceneComputed(() => {
    if (!activeCollectionId) return [] as Variable[]
    const all = editor.getVariablesForCollection(activeCollectionId)
    if (!searchTerm) return all
    const q = searchTerm.toLowerCase()
    return all.filter((v) => v.name.toLowerCase().includes(q))
  })

  const collectionActions = createVariableCollectionActions(editor, setActiveCollectionId, () => activeCollectionId)
  const variableActions = createVariableValueActions(editor, () => activeCollection)

  return {
    editor,
    collections,
    activeCollectionId,
    setActiveCollectionId,
    activeCollection,
    activeModes,
    variables,
    searchTerm,
    setSearchTerm,
    ...collectionActions,
    ...variableActions
  }
}
