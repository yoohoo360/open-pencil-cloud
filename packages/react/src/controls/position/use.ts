import { useMemo } from 'react'

import type { SceneNode } from '@open-pencil/scene-graph'

import { usePropScrub } from '#react/controls/prop-scrub/use'
import { useEditor } from '#react/editor/context'
import { useSceneComputed } from '#react/internal/scene-computed/use'

/**
 * Returns position-related state and actions for the current selection.
 *
 * This composable is designed for property panels that edit x/y, size,
 * rotation, alignment, flipping, and multi-node transforms.
 */
export function usePosition() {
  const editor = useEditor()

  const nodes = useSceneComputed(() => editor.getSelectedNodes())
  const node = useSceneComputed<SceneNode | null>(() => editor.getSelectedNode() ?? null)
  const active = nodes.length > 0
  const isMulti = nodes.length > 1
  const ids = useMemo(() => nodes.map((n) => n.id), [nodes])

  const x = useMemo(() => Math.round(node?.x ?? 0), [node])
  const y = useMemo(() => Math.round(node?.y ?? 0), [node])
  const width = node?.width ?? 0
  const height = node?.height ?? 0
  const rotation = useMemo(() => Math.round(node?.rotation ?? 0), [node])

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
