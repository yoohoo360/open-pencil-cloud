import { useEditor } from '../context/editorContext'
import { useSceneComputed } from '../internal/useSceneComputed'
import { usePropScrub } from './usePropScrub'

import type { SceneNode } from '@open-pencil/core'

/**
 * Returns position-related state and actions for the current selection.
 */
export function usePosition() {
  const editor = useEditor()

  const nodes = useSceneComputed(() => editor.getSelectedNodes())
  const node = useSceneComputed<SceneNode | null>(() => editor.getSelectedNode() ?? null)
  const active = nodes.length > 0
  const isMulti = nodes.length > 1
  const ids = nodes.map((n) => n.id)

  const x = Math.round(node?.x ?? 0)
  const y = Math.round(node?.y ?? 0)
  const width = node?.width ?? 0
  const height = node?.height ?? 0
  const rotation = Math.round(node?.rotation ?? 0)

  const { updateProp: _updateProp, commitProp: _commitProp } = usePropScrub(editor)

  function updateProp(key: string, value: number) {
    _updateProp(nodes, key, value)
  }

  function commitProp(key: string, value: number, previous: number) {
    _commitProp(nodes, key, value, previous)
  }

  function align(axis: 'horizontal' | 'vertical', pos: 'min' | 'center' | 'max') {
    editor.alignNodes(ids, axis, pos)
  }

  function flip(axis: 'horizontal' | 'vertical') {
    editor.flipNodes(ids, axis)
  }

  function rotate(degrees: number) {
    editor.rotateNodes(ids, degrees)
  }

  return {
    editor,
    nodes,
    node,
    active,
    isMulti,
    ids,
    x,
    y,
    width,
    height,
    rotation,
    updateProp,
    commitProp,
    align,
    flip,
    rotate
  }
}
