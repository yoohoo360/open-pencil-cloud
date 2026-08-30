import { MIXED } from '#react/controls/mixed'
import {
  createSharedStyleDefinition,
  deleteSharedStyleDefinition,
  renameSharedStyleDefinition,
  updateSharedStyleDefinition
} from '#react/controls/shared-style/catalog'
import {
  canCreateSharedStyle,
  sharedStyleDetachPatch,
  sharedStylePatch
} from '#react/controls/shared-style/model'
import { useEditor } from '#react/editor/context'
import { useSceneComputed } from '#react/internal/scene-computed/use'

import {
  getSharedStyles,
  sharedStyleRefKey,
  sharedStyleTypeForKind,
  type SceneNode,
  type SharedStyleKind
} from '@open-pencil/scene-graph'

function supportsStyle(node: SceneNode, kind: SharedStyleKind): boolean {
  if (kind === 'text') return node.type === 'TEXT'
  if (kind === 'grid') {
    return (
      node.type === 'FRAME' ||
      node.type === 'COMPONENT' ||
      node.type === 'COMPONENT_SET' ||
      node.type === 'INSTANCE'
    )
  }
  return node.type !== 'CANVAS'
}

function mergedStyleId(nodes: SceneNode[], kind: SharedStyleKind) {
  const key = sharedStyleRefKey(kind)
  const first = nodes[0]
  if (!first) return null
  const value = first[key]
  return nodes.every((node) => node[key] === value) ? value : MIXED
}

export function useSharedStyleBinding(kind: SharedStyleKind) {
  const editor = useEditor()
  const nodes = useSceneComputed(() =>
    editor.getSelectedNodes().filter((node) => supportsStyle(node, kind))
  )
  const styles = useSceneComputed(() => getSharedStyles(editor.graph, kind))
  const active = nodes.length > 0
  const styleId = mergedStyleId(nodes, kind)
  const canCreate = nodes.some((node) => canCreateSharedStyle(node, kind))
  const visible =
    active && (styles.length > 0 || styleId === MIXED || styleId !== null || canCreate)

  function update(label: string, apply: (node: SceneNode) => Partial<SceneNode>) {
    if (!active) return
    const targets = nodes
    const run = () => {
      for (const node of targets) editor.updateNodeWithUndo(node.id, apply(node), label)
    }
    if (targets.length > 1) editor.undo.runBatch(label, run)
    else run()
  }

  function bind(nextStyleId: string) {
    const styleInfo = styles.find((style) => style.id === nextStyleId)
    const styleNode = styleInfo ? (editor.graph.getNode(styleInfo.nodeId) ?? null) : null
    if (styleNode?.sharedStyleType !== sharedStyleTypeForKind(kind)) return
    update(`Apply ${kind} style`, (node) => sharedStylePatch(kind, node, nextStyleId, styleNode))
  }

  function unbind() {
    update(`Detach ${kind} style`, () => sharedStyleDetachPatch(kind))
  }

  function create(name: string) {
    const source = nodes[0]
    const trimmed = name.trim()
    if (!source || !trimmed || !canCreateSharedStyle(source, kind)) return
    editor.undo.runBatch(`Create ${kind} style`, () => {
      const created = createSharedStyleDefinition(editor, kind, trimmed, source)
      if (!created) return
      update(`Apply ${kind} style`, (node) => sharedStylePatch(kind, node, created.styleId, created.node))
    })
  }

  return { kind, active, visible, styleId, styles, canCreate, bind, unbind, create }
}

export function useSharedStyleCatalog() {
  const editor = useEditor()
  const color = useSceneComputed(() => getSharedStyles(editor.graph, 'fill'))
  const text = useSceneComputed(() => getSharedStyles(editor.graph, 'text'))
  const effect = useSceneComputed(() => getSharedStyles(editor.graph, 'effect'))
  const grid = useSceneComputed(() => getSharedStyles(editor.graph, 'grid'))
  const groups = [
    { kind: 'fill' as const, styles: color },
    { kind: 'text' as const, styles: text },
    { kind: 'effect' as const, styles: effect },
    { kind: 'grid' as const, styles: grid }
  ]
  const count = color.length + text.length + effect.length + grid.length

  return {
    groups,
    count,
    create(kind: SharedStyleKind, name: string) {
      return createSharedStyleDefinition(editor, kind, name)
    },
    rename: (styleNodeId: string, name: string) => renameSharedStyleDefinition(editor, styleNodeId, name),
    remove: (styleNodeId: string) => deleteSharedStyleDefinition(editor, styleNodeId),
    update: (styleNodeId: string, changes: Partial<SceneNode>) =>
      updateSharedStyleDefinition(editor, styleNodeId, changes),
    styleNode: (styleNodeId: string) => editor.graph.getNode(styleNodeId) ?? null
  }
}

export type SharedStyleBinding = ReturnType<typeof useSharedStyleBinding>
