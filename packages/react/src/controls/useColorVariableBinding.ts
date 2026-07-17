import { useState } from 'react'

import { useEditor } from '../context/editorContext'
import { useSceneComputed } from '../internal/useSceneComputed'

import type { Variable } from '@open-pencil/core'

type ColorBindingKind = 'fills' | 'strokes'

function caseInsensitiveContains(str: string, sub: string): boolean {
  return str.toLowerCase().includes(sub.toLowerCase())
}

export function useColorVariableBinding(kind: ColorBindingKind) {
  const store = useEditor()
  const [searchTerm, setSearchTerm] = useState('')

  const colorVariables = useSceneComputed(() => store.getVariablesByType('COLOR'))

  const filteredVariables = searchTerm
    ? colorVariables.filter((v) => caseInsensitiveContains(v.name, searchTerm))
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
