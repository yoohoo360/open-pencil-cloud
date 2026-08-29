import { useEffect, useMemo, useRef, useState } from 'react'

import type { Variable } from '@open-pencil/scene-graph'

import { useEditor } from '#react/editor/context'
import { useSceneComputed } from '#react/internal/scene-computed/use'
import { createVariableCollectionActions, createVariableValueActions } from '#react/variables/helpers'

export function useVariables() {
  const editor = useEditor()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCollectionId, setActiveCollectionId] = useState('')
  const activeCollectionIdRef = useRef(activeCollectionId)
  activeCollectionIdRef.current = activeCollectionId

  const collections = useSceneComputed(() => editor.getCollections())

  useEffect(() => {
    if (activeCollectionId && collections.some((collection) => collection.id === activeCollectionId)) {
      return
    }
    setActiveCollectionId(collections[0]?.id ?? '')
  }, [activeCollectionId, collections])

  const activeCollection =
    collections.find((collection) => collection.id === activeCollectionId) ?? collections[0] ?? null
  const activeModes = activeCollection?.modes ?? []

  const allVariables = useSceneComputed(() => {
    if (!activeCollection) return [] as Variable[]
    return editor.getVariablesForCollection(activeCollection.id)
  })

  const variables = useMemo(() => {
    if (!searchTerm) return allVariables
    const query = searchTerm.toLowerCase()
    return allVariables.filter((variable) => variable.name.toLowerCase().includes(query))
  }, [allVariables, searchTerm])

  const collectionActions = useMemo(
    () =>
      createVariableCollectionActions(
        editor,
        () => activeCollectionIdRef.current,
        setActiveCollectionId
      ),
    [editor]
  )

  const variableActions = useMemo(
    () =>
      createVariableValueActions(editor, () => {
        const id = activeCollectionIdRef.current
        return editor.getCollection(id) ?? null
      }),
    [editor]
  )

  return {
    editor,
    collections,
    activeCollectionId,
    activeCollection,
    activeModes,
    variables,
    searchTerm,
    setSearchTerm,
    ...collectionActions,
    ...variableActions
  }
}
