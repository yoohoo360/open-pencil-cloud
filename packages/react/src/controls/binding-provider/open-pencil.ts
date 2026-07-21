import type { Editor } from '@open-pencil/core/editor'
import type { Variable, VariableType } from '@open-pencil/scene-graph'

import type {
  BindingProvider,
  BindingState,
  BindingTarget
} from '#react/controls/binding-provider/types'
import { useEditor } from '#react/editor/context'
import { useSceneComputed } from '#react/internal/scene-computed/use'
import { createStringFilter } from '#react/shared/dom/hooks'

export interface OpenPencilBindingProviderOptions<V> {
  type: VariableType
  resolve(editor: Editor, variableId: string): V | undefined
  create?(editor: Editor, target: BindingTarget, value: V, name: string): void
  setValue?(editor: Editor, variableId: string, value: V): void
}

export function useOpenPencilBindingProvider<V>(
  options: OpenPencilBindingProviderOptions<V>
): BindingProvider<V> {
  const editor = useEditor()
  const revision = useSceneComputed(() => editor.state.sceneVersion)
  const variables = useSceneComputed(() => editor.getVariablesByType(options.type))
  const { contains } = createStringFilter({ sensitivity: 'base' })

  function listVariables(): Variable[] {
    return variables
  }

  function filterVariables(term: string): Variable[] {
    if (!term) return variables
    return variables.filter((variable) => contains(variable.name, term))
  }

  function getBound(target: BindingTarget): Variable | undefined {
    void revision
    const variableId = editor.getNode(target.nodeId)?.boundVariables[target.path]
    return variableId ? editor.getVariable(variableId) : undefined
  }

  function getState(targets: BindingTarget[]): BindingState {
    if (targets.length === 0) return 'unbound'
    const variableIds = new Set(
      targets.map(
        (target) => editor.getNode(target.nodeId)?.boundVariables[target.path] ?? undefined
      )
    )
    if (variableIds.size > 1) return 'mixed'
    return variableIds.has(undefined) ? 'unbound' : 'bound'
  }

  return {
    revision: { value: revision },
    listVariables,
    filterVariables,
    getBound,
    getState,
    resolve: (variableId) => options.resolve(editor, variableId),
    bind: (target, variableId) => editor.bindVariable(target.nodeId, target.path, variableId),
    unbind: (target) => editor.unbindVariable(target.nodeId, target.path),
    create: options.create
      ? (target, value, name) => options.create?.(editor, target, value, name)
      : undefined,
    setValue: options.setValue
      ? (variableId, value) => options.setValue?.(editor, variableId, value)
      : undefined,
    runBatch: (label, action) => editor.undo.runBatch(label, action),
    beginBatch: (label) => editor.undo.beginBatch(label),
    commitBatch: () => editor.undo.commitBatch(),
    rollbackBatch: () => editor.undo.rollbackBatch()
  }
}
