export { constrainToAspectRatio } from '#react/shared/input/resize/rect'
export { tryStartResize } from '#react/shared/input/resize/start'
import type { Editor } from '@open-pencil/core/editor'
import { computeLayout } from '@open-pencil/core/layout'
import type { SceneNode } from '@open-pencil/scene-graph'

import { constrainedChildRect, scaledChildRect } from '#react/shared/input/resize/constraints'
import { calculateResizeRect } from '#react/shared/input/resize/rect'
import { scaleVectorNetworkForResize } from '#react/shared/input/resize/vector'
import type { DragResize } from '#react/shared/input/types'

function resizeChanges(d: DragResize, cx: number, cy: number, constrain: boolean) {
  const { origRect } = d
  const newRect = calculateResizeRect(d.handle, origRect, cx - d.startX, cy - d.startY, constrain)

  const changes: Partial<SceneNode> = { ...newRect }

  const resizedVectorNetwork = scaleVectorNetworkForResize(
    d.origVectorNetwork,
    origRect.width,
    origRect.height,
    newRect.width,
    newRect.height
  )
  if (resizedVectorNetwork) changes.vectorNetwork = resizedVectorNetwork
  return { changes, newRect }
}

function applyConstrainedChildren(
  d: DragResize,
  newRect: Pick<SceneNode, 'width' | 'height'>,
  editor: Editor
) {
  if (!d.origChildren || d.origRect.width <= 0 || d.origRect.height <= 0) return

  const apply = (
    parentId: string,
    parentBefore: Pick<SceneNode, 'width' | 'height'>,
    parentAfter: Pick<SceneNode, 'width' | 'height'>
  ) => {
    const parent = editor.graph.getNode(parentId)
    if (!parent) return
    const scalesChildren = parent.type === 'GROUP' || parent.type === 'BOOLEAN_OPERATION'
    for (const childId of parent.childIds) {
      const original = d.origChildren?.get(childId)
      const child = editor.graph.getNode(childId)
      if (!original || !child) continue
      const rect = scalesChildren
        ? scaledChildRect(original, parentBefore, parentAfter)
        : constrainedChildRect(
            original,
            parentBefore,
            parentAfter,
            child.horizontalConstraint,
            child.verticalConstraint
          )
      const childChanges: Partial<SceneNode> = { ...rect }
      if (original.vectorNetwork) {
        const scaled = scaleVectorNetworkForResize(
          original.vectorNetwork,
          original.width,
          original.height,
          rect.width,
          rect.height
        )
        if (scaled) childChanges.vectorNetwork = scaled
      }
      editor.graph.updateNodePreview(childId, childChanges)
      editor.renderer?.invalidateVectorPath(childId)
      apply(childId, original, rect)
    }
  }

  apply(d.nodeId, d.origRect, newRect)
}

export function applyResize(
  d: DragResize,
  cx: number,
  cy: number,
  constrain: boolean,
  editor: Editor
) {
  const { changes, newRect } = resizeChanges(d, cx, cy, constrain)
  editor.graph.updateNodePreview(d.nodeId, changes)
  applyConstrainedChildren(d, newRect, editor)

  const node = editor.graph.getNode(d.nodeId)
  if (node?.layoutMode !== 'NONE') {
    editor.graph.runPreviewUpdates(() => computeLayout(editor.graph, d.nodeId))
  }
  editor.requestRepaint()
}

export function commitResizePreview(d: DragResize, editor: Editor) {
  const node = editor.graph.getNode(d.nodeId)
  if (!node) return
  const finalChanges: Partial<SceneNode> = {
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height
  }
  if (node.vectorNetwork) finalChanges.vectorNetwork = node.vectorNetwork

  if (d.origChildren) {
    const finalChildren = new Map<string, Partial<SceneNode>>()
    for (const [childId] of d.origChildren) {
      const child = editor.graph.getNode(childId)
      if (!child) continue
      const final: Partial<SceneNode> = {
        x: child.x,
        y: child.y,
        width: child.width,
        height: child.height
      }
      if (child.vectorNetwork) final.vectorNetwork = child.vectorNetwork
      finalChildren.set(childId, final)
    }
    editor.graph.updateNodePreview(d.nodeId, d.origRect)
    for (const [childId, orig] of d.origChildren) {
      editor.graph.updateNodePreview(childId, orig)
    }
    editor.updateNode(d.nodeId, finalChanges)
    for (const [childId, final] of finalChildren) {
      editor.updateNode(childId, final)
    }
    editor.commitGroupResize(d.nodeId, d.origRect, d.origChildren)
    editor.requestRepaint()
  } else {
    editor.graph.updateNodePreview(d.nodeId, d.origRect)
    editor.updateNode(d.nodeId, finalChanges)
    editor.commitResize(d.nodeId, {
      ...d.origRect,
      ...(d.origVectorNetwork || node.vectorNetwork ? { vectorNetwork: d.origVectorNetwork } : {})
    })
  }
}
