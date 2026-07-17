import { useState } from 'react'

import type { Variable } from '@open-pencil/scene-graph'

import { useEditor } from '../context/editorContext'
import { useSceneComputed } from '../internal/useSceneComputed'

type ColorBindingKind = 'fills' | 'strokes'

function containsInsensitive(haystack: string, needle: string): boolean {
  return haystack.toLocaleLowerCase().includes(needle.toLocaleLowerCase())
}

export function useColorVariableBinding(kind: ColorBindingKind) {
  const store = useEditor()
  const colorVariables = useSceneComputed(() => store.getVariablesByType('COLOR'))
  const [searchTerm, setSearchTerm] = useState('')
  const filteredVariables = searchTerm
    ? colorVariables.filter((v) => containsInsensitive(v.name, searchTerm))
    : colorVariables

  function bindingPath(index: number) {
    return `${kind}/${index}/color`
  }

  function getBoundVariable(nodeId: string, index: number): Variable | undefined {
    const n = store.getNode(nodeId)
    if (!n) return undefined
    const varId = n.boundVariables[bindingPath(index)]
    return varId ? store.getVariable(varId) : undefined
  }

  function bindVariable(nodeId: string, index: number, variableId: string) {
    store.bindVariable(nodeId, bindingPath(index), variableId)
  }

  function unbindVariable(nodeId: string, index: number) {
    store.unbindVariable(nodeId, bindingPath(index))
  }

  return {
    store,
    colorVariables,
    searchTerm,
    setSearchTerm,
    filteredVariables,
    getBoundVariable,
    bindVariable,
    unbindVariable
  }
}
