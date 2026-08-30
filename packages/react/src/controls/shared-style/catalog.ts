import { randomHex } from '@open-pencil/core/random'
import type { Editor } from '@open-pencil/core/editor'
import {
  getSharedStyles,
  sharedStyleRefKey,
  type SceneNode,
  type SharedStyleKind
} from '@open-pencil/scene-graph'

import {
  canCreateSharedStyle,
  catalogKindForType,
  sharedStyleCreateProps,
  sharedStyleDefaultCreateProps,
  sharedStyleHasVisualChanges,
  sharedStylePatch,
  uniqueStyleName
} from '#react/controls/shared-style/model'

function restoreStyleNode(editor: Editor, snapshot: SceneNode, styleId: string) {
  if (editor.graph.getNode(snapshot.id)) return
  const parentId = snapshot.parentId ?? editor.state.currentPageId
  editor.graph.createNodeWithId(snapshot.id, snapshot.type, parentId, {
    ...snapshot,
    childIds: []
  })
  const restored = editor.graph.getNode(snapshot.id)
  if (restored) restored.source.id = styleId
}

export function createSharedStyleDefinition(
  editor: Editor,
  kind: SharedStyleKind,
  name: string,
  source?: SceneNode | null
): { node: SceneNode; styleId: string } | null {
  const trimmed = name.trim()
  if (!trimmed) return null
  if (source && !canCreateSharedStyle(source, kind)) return null
  const styleName = uniqueStyleName(
    getSharedStyles(editor.graph, kind).map((style) => style.name),
    trimmed
  )
  const styleId = `style:${randomHex(6)}`
  const { type, props } = source
    ? sharedStyleCreateProps(kind, source, styleName)
    : sharedStyleDefaultCreateProps(kind, styleName)
  const created = editor.graph.createNode(type, editor.state.currentPageId, props)
  created.source.id = styleId
  const snapshot = structuredClone(created)
  editor.undo.push({
    label: `Create ${kind} style`,
    forward: () => restoreStyleNode(editor, snapshot, styleId),
    inverse: () => {
      editor.graph.deleteNode(created.id)
    }
  })
  editor.requestRender()
  return { node: created, styleId }
}

export function renameSharedStyleDefinition(editor: Editor, styleNodeId: string, name: string) {
  const style = editor.graph.getNode(styleNodeId)
  const trimmed = name.trim()
  if (!style?.sharedStyleType || !trimmed || style.name === trimmed) return
  editor.updateNodeWithUndo(styleNodeId, { name: trimmed }, 'Rename style')
}

function consumerDetachPatch(node: SceneNode, styleId: string, type: SceneNode['sharedStyleType']) {
  const patch: Partial<SceneNode> = {}
  if (type === 'FILL') {
    if (node.fillStyleId === styleId) patch.fillStyleId = null
    if (node.strokeStyleId === styleId) patch.strokeStyleId = null
    return patch
  }
  if (type === 'TEXT' && node.textStyleId === styleId) patch.textStyleId = null
  if (type === 'EFFECT' && node.effectStyleId === styleId) patch.effectStyleId = null
  if (type === 'GRID' && node.gridStyleId === styleId) patch.gridStyleId = null
  return patch
}

export function deleteSharedStyleDefinition(editor: Editor, styleNodeId: string) {
  const style = editor.graph.getNode(styleNodeId)
  const styleId = style?.source.id
  if (!style?.sharedStyleType || !styleId) return
  const snapshot = structuredClone(style)
  editor.undo.runBatch('Delete style', () => {
    for (const node of editor.graph.getAllNodes()) {
      if (node.id === style.id) continue
      const patch = consumerDetachPatch(node, styleId, style.sharedStyleType)
      if (Object.keys(patch).length === 0) continue
      editor.updateNodeWithUndo(node.id, patch, 'Detach style')
    }
    editor.graph.deleteNode(style.id)
    editor.undo.push({
      label: 'Delete style',
      forward: () => {
        editor.graph.deleteNode(style.id)
      },
      inverse: () => restoreStyleNode(editor, snapshot, styleId)
    })
    editor.requestRender()
  })
}

function applyStyleToConsumers(editor: Editor, style: SceneNode, styleId: string) {
  if (!style.sharedStyleType) return
  for (const node of editor.graph.getAllNodes()) {
    if (node.id === style.id) continue
    if (style.sharedStyleType === 'FILL') {
      if (node.fillStyleId === styleId) {
        editor.updateNodeWithUndo(node.id, sharedStylePatch('fill', node, styleId, style), 'Update style')
      }
      if (node.strokeStyleId === styleId) {
        editor.updateNodeWithUndo(node.id, sharedStylePatch('stroke', node, styleId, style), 'Update style')
      }
      continue
    }
    const kind = catalogKindForType(style.sharedStyleType)
    if (node[sharedStyleRefKey(kind)] !== styleId) continue
    editor.updateNodeWithUndo(node.id, sharedStylePatch(kind, node, styleId, style), 'Update style')
  }
}

export function updateSharedStyleDefinition(
  editor: Editor,
  styleNodeId: string,
  changes: Partial<SceneNode>
) {
  const style = editor.graph.getNode(styleNodeId)
  const styleId = style?.source.id
  if (!style?.sharedStyleType || !styleId) return
  if (!sharedStyleHasVisualChanges(changes)) {
    editor.updateNodeWithUndo(styleNodeId, changes, 'Update style')
    return
  }
  editor.undo.runBatch('Update style', () => {
    editor.updateNodeWithUndo(styleNodeId, changes, 'Update style')
    const next = editor.graph.getNode(styleNodeId)
    if (!next) return
    applyStyleToConsumers(editor, next, styleId)
  })
}
