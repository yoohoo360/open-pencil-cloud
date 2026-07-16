import { useEditor } from '../context/editorContext'
import { MIXED, useNodeProps } from './useNodeProps'

import type { SceneNode } from '@open-pencil/core'

const CORNER_RADIUS_TYPES = new Set([
  'RECTANGLE',
  'ROUNDED_RECTANGLE',
  'FRAME',
  'COMPONENT',
  'INSTANCE'
])

/**
 * Returns appearance-related state and actions for the current selection.
 */
export function useAppearance() {
  const editor = useEditor()
  const { nodes, node, active, isMulti, merged, updateProp, commitProp } = useNodeProps()

  const hasCornerRadius = isMulti
    ? nodes.every((n) => CORNER_RADIUS_TYPES.has(n.type))
    : node
      ? CORNER_RADIUS_TYPES.has(node.type)
      : false

  const independentCorners = isMulti
    ? merged('independentCorners')
    : (node?.independentCorners ?? false)

  const cornerRadiusValue = isMulti ? merged('cornerRadius') : (node?.cornerRadius ?? 0)

  const opacityRaw = merged('opacity')
  const opacityPercent = opacityRaw === MIXED ? MIXED : Math.round((opacityRaw as number) * 100)

  const visibilityMerged = merged('visible')
  const visibilityState: 'visible' | 'hidden' | 'mixed' =
    visibilityMerged === MIXED ? 'mixed' : visibilityMerged ? 'visible' : 'hidden'

  function toggleVisibility() {
    if (isMulti) {
      const liveNodes = nodes
        .map((n) => editor.getNode(n.id))
        .filter((n): n is SceneNode => n != null)
      if (liveNodes.length === 0) return
      const allVisible = liveNodes.every((n) => n.visible)
      editor.undo.beginBatch('Toggle visibility')
      for (const n of liveNodes) {
        editor.updateNodeWithUndo(n.id, { visible: !allVisible }, 'Toggle visibility')
      }
      editor.undo.commitBatch()
      return
    }

    const selected = node
    if (!selected) return
    const liveNode = editor.getNode(selected.id)
    if (!liveNode) return
    editor.updateNodeWithUndo(liveNode.id, { visible: !liveNode.visible }, 'Toggle visibility')
  }

  function toggleIndependentCorners() {
    const targets = isMulti ? nodes : node ? [node] : []
    for (const n of targets) {
      if (n.independentCorners) {
        const uniform = n.topLeftRadius
        editor.updateNodeWithUndo(
          n.id,
          {
            independentCorners: false,
            cornerRadius: uniform,
            topLeftRadius: uniform,
            topRightRadius: uniform,
            bottomRightRadius: uniform,
            bottomLeftRadius: uniform
          } as Partial<SceneNode>,
          'Uniform corner radius'
        )
      } else {
        editor.updateNodeWithUndo(
          n.id,
          {
            independentCorners: true,
            topLeftRadius: n.cornerRadius,
            topRightRadius: n.cornerRadius,
            bottomRightRadius: n.cornerRadius,
            bottomLeftRadius: n.cornerRadius
          } as Partial<SceneNode>,
          'Independent corner radii'
        )
      }
    }
  }

  function updateCornerProp(key: string, value: number) {
    if (isMulti) {
      for (const n of nodes) editor.updateNode(n.id, { [key]: value })
    } else if (node) {
      editor.updateNode(node.id, { [key]: value })
    }
  }

  function commitCornerProp(key: string, _value: number, previous: number) {
    if (isMulti) {
      for (const n of nodes) {
        editor.commitNodeUpdate(n.id, { [key]: previous } as Partial<SceneNode>, `Change ${key}`)
      }
    } else if (node) {
      editor.commitNodeUpdate(node.id, { [key]: previous } as Partial<SceneNode>, `Change ${key}`)
    }
  }

  return {
    editor,
    nodes,
    node,
    active,
    isMulti,
    hasCornerRadius,
    independentCorners,
    cornerRadiusValue,
    opacityPercent,
    visibilityState,
    updateProp,
    commitProp,
    toggleVisibility,
    toggleIndependentCorners,
    updateCornerProp,
    commitCornerProp
  }
}
