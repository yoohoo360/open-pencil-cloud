import { useInlineRename } from '#react/editor/inline-rename/use'
import { useVariables } from '#react/variables/use'

export function useVariablesDialogState() {
  const variables = useVariables()

  const collectionRename = useInlineRename(variables.renameCollection)
  const modeRename = useInlineRename(variables.renameMode)

  function startRenameCollection(id: string) {
    const collection = variables.collections.find((item) => item.id === id)
    if (collection) collectionRename.start(id, collection.name)
  }

  function startRenameMode(modeId: string) {
    const mode = variables.activeModes.find((item) => item.modeId === modeId)
    if (mode) modeRename.start(modeId, mode.name)
  }

  return {
    ...variables,
    collectionRename,
    modeRename,
    startRenameCollection,
    startRenameMode,
    hasCollections: variables.collections.length > 0
  }
}

export type VariablesDialogState = ReturnType<typeof useVariablesDialogState>
