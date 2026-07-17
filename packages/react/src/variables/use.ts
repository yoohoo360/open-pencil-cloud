import { ref, computed } from '#react/internal/reactive'
import { useEffect } from 'react'
import type { Variable } from '@open-pencil/scene-graph'

import { useEditor } from '#react/editor/context'
import { useSceneComputed } from '#react/internal/scene-computed/use'
import { createVariableCollectionActions, createVariableValueActions } from '#react/variables/helpers'

export function useVariables() {
  const editor = useEditor()
  const searchTerm = ref('')

  function setSearchTerm(term: string) {
    searchTerm.value = term
  }

  const collections = useSceneComputed(() => editor.getCollections())

  const activeCollectionId = ref(collections[0]?.id ?? '')

  useEffect(() => {
    if (!activeCollectionId.value && collections[0]) {
      activeCollectionId.value = collections[0].id
    }
  }, [collections])

  const activeCollection = computed(() => editor.getCollection(activeCollectionId.value) ?? null)
  const activeModes = computed(() => activeCollection.value?.modes ?? [])

  const variables = useSceneComputed(() => {
    if (!activeCollectionId.value) return [] as Variable[]
    const all = editor.getVariablesForCollection(activeCollectionId.value)
    if (!searchTerm.value) return all
    const q = searchTerm.value.toLowerCase()
    return all.filter((v) => v.name.toLowerCase().includes(q))
  })

  const collectionActions = createVariableCollectionActions(editor, activeCollectionId)
  const variableActions = createVariableValueActions(editor, () => activeCollection.value)

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
