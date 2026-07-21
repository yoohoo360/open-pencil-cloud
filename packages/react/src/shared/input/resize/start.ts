import type { Editor } from '@open-pencil/core/editor'
import { cloneVectorNetwork } from '@open-pencil/scene-graph'

import { getHitHandleByMatrix } from '#react/shared/input/geometry'
import type { DragResize, OrigChildState } from '#react/shared/input/types'

const CONSTRAINT_CONTAINER_TYPES = new Set([
  'FRAME',
  'COMPONENT',
  'COMPONENT_SET',
  'INSTANCE',
  'GROUP',
  'BOOLEAN_OPERATION'
])

function collectDescendants(id: string, editor: Editor): Map<string, OrigChildState> | null {
  const root = editor.graph.getNode(id)
  if (!root || !CONSTRAINT_CONTAINER_TYPES.has(root.type)) return null
  const map = new Map<string, OrigChildState>()

  const collect = (parentId: string) => {
    const parent = editor.graph.getNode(parentId)
    if (!parent) return
    for (const childId of parent.childIds) {
      const child = editor.graph.getNode(childId)
      if (!child) continue
      if (parent.layoutMode !== 'NONE' && child.layoutPositioning !== 'ABSOLUTE') continue
      map.set(childId, {
        x: child.x,
        y: child.y,
        width: child.width,
        height: child.height,
        vectorNetwork: child.vectorNetwork ? cloneVectorNetwork(child.vectorNetwork) : null
      })
      collect(childId)
    }
  }

  collect(id)
  return map.size > 0 ? map : null
}

export function tryStartResize(cx: number, cy: number, editor: Editor): DragResize | null {
  for (const id of editor.state.selectedIds) {
    const node = editor.graph.getNode(id)
    if (!node || node.locked) continue
    const handleResult = getHitHandleByMatrix(cx, cy, node, editor.graph, editor.renderer?.zoom)
    if (handleResult) {
      return {
        type: 'resize',
        handle: handleResult.handle,
        startX: cx,
        startY: cy,
        origRect: { x: node.x, y: node.y, width: node.width, height: node.height },
        nodeId: id,
        origVectorNetwork: node.vectorNetwork ? cloneVectorNetwork(node.vectorNetwork) : null,
        origChildren: collectDescendants(id, editor)
      }
    }
  }
  return null
}
