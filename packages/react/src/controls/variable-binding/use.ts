import { useMemo, useState } from 'react'

import type { Variable, VariableType } from '@open-pencil/scene-graph'

import { useEditor } from '#react/editor/context'
import { useSceneComputed } from '#react/internal/scene-computed/use'
import { createStringFilter } from '#react/shared/dom/hooks'

export type VariableBindingState = 'unbound' | 'bound' | 'mixed'

export interface UseVariableBindingOptions {
  type: VariableType
  path: string | ((index: number) => string)
}

export function useVariableBinding(options: UseVariableBindingOptions) {
  const store = useEditor()
  const [searchTerm, setSearchTerm] = useState('')
  const variables = useSceneComputed(() => store.getVariablesByType(options.type))
  const { contains } = createStringFilter({ sensitivity: 'base' })

  const filteredVariables = useMemo(() => {
    if (!searchTerm) return variables
    return variables.filter((variable) => contains(variable.name, searchTerm))
  }, [contains, searchTerm, variables])

  function bindingPath(index?: number) {
    if (typeof options.path === 'string') return options.path
    return options.path(index ?? 0)
  }

  function getBoundVariable(nodeId: string, index?: number): Variable | undefined {
    const node = store.getNode(nodeId)
    if (!node) return undefined
    const variableId = node.boundVariables[bindingPath(index)]
    return variableId ? store.getVariable(variableId) : undefined
  }

  function getBindingState(nodeIds: string[], index?: number): VariableBindingState {
    const variableIds = new Set<string | undefined>()
    for (const nodeId of nodeIds) {
      const node = store.getNode(nodeId)
      variableIds.add(node?.boundVariables[bindingPath(index)])
    }
    if (variableIds.size > 1) return 'mixed'
    return variableIds.has(undefined) ? 'unbound' : 'bound'
  }

  function bindVariable(nodeId: string, variableId: string, index?: number) {
    store.bindVariable(nodeId, bindingPath(index), variableId)
  }

  function unbindVariable(nodeId: string, index?: number) {
    store.unbindVariable(nodeId, bindingPath(index))
  }

  return {
    store,
    searchTerm,
    setSearchTerm,
    variables,
    filteredVariables,
    bindingPath,
    getBoundVariable,
    getBindingState,
    bindVariable,
    unbindVariable
  }
}
