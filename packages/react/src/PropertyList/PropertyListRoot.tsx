import { useMemo, type ReactNode } from 'react'

import { useEditor } from '../context/editorContext'
import { useSceneSnapshot } from '../store/useEditorStore'
import { PropertyListProvider } from './context'

import type { Effect, Fill, SceneNode, Stroke } from '@open-pencil/core'
import type { PropertyListContext } from './context'

type ArrayPropKey = 'fills' | 'strokes' | 'effects'
type ArrayItemType = Fill | Stroke | Effect

function isArrayMixed(nodes: SceneNode[], key: ArrayPropKey): boolean {
  if (nodes.length <= 1) return false
  const first = nodes[0][key]
  if (!Array.isArray(first)) return nodes.some((n) => n[key] !== first)
  for (let i = 1; i < nodes.length; i++) {
    const current = nodes[i][key]
    if (!Array.isArray(current) || current.length !== first.length) return true
  }
  return false
}

export interface PropertyListRootProps {
  propKey: ArrayPropKey
  label?: string
  onAdd?: (item: ArrayItemType) => void
  onRemove?: (index: number) => void
  onUpdate?: (index: number, item: ArrayItemType) => void
  onPatch?: (index: number, changes: Record<string, unknown>) => void
  onToggleVisibility?: (index: number) => void
  children: (ctx: {
    items: ArrayItemType[]
    isMixed: boolean
    isMulti: boolean
    activeNode: SceneNode | null
    add: (defaults: ArrayItemType) => void
    remove: (index: number) => void
    update: (index: number, item: ArrayItemType) => void
    patch: (index: number, changes: Partial<ArrayItemType>) => void
    toggleVisibility: (index: number) => void
  }) => ReactNode
}

export function PropertyListRoot({
  propKey,
  onAdd,
  onRemove,
  onUpdate,
  onPatch,
  onToggleVisibility,
  children
}: PropertyListRootProps) {
  const editor = useEditor()

  const selectedNodes = useSceneSnapshot((e) => e.getSelectedNodes())
  const activeNode = useSceneSnapshot<SceneNode | null>(
    (e) => e.getSelectedNode() ?? selectedNodes[0] ?? null
  )

  const isMulti = selectedNodes.length > 1
  const active = selectedNodes.length > 0
  const isMixed = useMemo(() => isArrayMixed(selectedNodes, propKey), [selectedNodes, propKey])

  const items = useMemo<ArrayItemType[]>(() => {
    if (isMixed) return []
    return (activeNode?.[propKey] ?? []) as ArrayItemType[]
  }, [activeNode, propKey, isMixed])

  function targetNodes(): SceneNode[] {
    if (isMulti) return selectedNodes
    return activeNode ? [activeNode] : []
  }

  function add(defaults: ArrayItemType) {
    onAdd?.(defaults)
    for (const n of targetNodes()) {
      const arr = isMulti ? [defaults] : [...(n[propKey] as ArrayItemType[]), defaults]
      editor.updateNodeWithUndo(
        n.id,
        { [propKey]: arr } as Partial<SceneNode>,
        isMulti ? `Set ${propKey}` : `Add ${propKey}`
      )
    }
  }

  function remove(index: number) {
    onRemove?.(index)
    for (const n of targetNodes()) {
      editor.updateNodeWithUndo(
        n.id,
        { [propKey]: (n[propKey] as ArrayItemType[]).filter((_, i) => i !== index) } as Partial<SceneNode>,
        `Remove ${propKey}`
      )
    }
  }

  function update(index: number, item: ArrayItemType) {
    onUpdate?.(index, item)
    for (const n of targetNodes()) {
      const arr = [...(n[propKey] as ArrayItemType[])]
      arr[index] = item
      editor.updateNodeWithUndo(
        n.id,
        { [propKey]: arr } as Partial<SceneNode>,
        `Change ${propKey}`
      )
    }
  }

  function patch(index: number, changes: Partial<ArrayItemType>) {
    onPatch?.(index, changes as Record<string, unknown>)
    for (const n of targetNodes()) {
      const arr = [...(n[propKey] as ArrayItemType[])]
      arr[index] = { ...arr[index], ...changes } as ArrayItemType
      editor.updateNodeWithUndo(
        n.id,
        { [propKey]: arr } as Partial<SceneNode>,
        `Change ${propKey}`
      )
    }
  }

  function toggleVisibility(index: number) {
    onToggleVisibility?.(index)
    const nodes = targetNodes()
    if (nodes.length === 0) return
    if (nodes.length > 1) editor.undo.beginBatch(`Toggle ${propKey} visibility`)
    for (const n of nodes) {
      const liveNode = editor.getNode(n.id)
      if (!liveNode) continue
      const arr = liveNode[propKey] as Array<{ visible: boolean }>
      if (!arr[index]) continue
      const newArr = [...(liveNode[propKey] as Array<{ visible: boolean }>)]
      newArr[index] = { ...newArr[index], visible: !arr[index].visible }
      editor.updateNodeWithUndo(
        n.id,
        { [propKey]: newArr } as Partial<SceneNode>,
        `Toggle ${propKey} visibility`
      )
    }
    if (nodes.length > 1) editor.undo.commitBatch()
  }

  const ctx: PropertyListContext = {
    editor,
    propKey,
    items,
    isMixed,
    activeNode,
    isMulti,
    add,
    remove,
    update,
    patch: patch as PropertyListContext['patch'],
    toggleVisibility
  }

  if (!active) return null

  return (
    <PropertyListProvider value={ctx}>
      {children({ items, isMixed, isMulti, activeNode, add, remove, update, patch, toggleVisibility })}
    </PropertyListProvider>
  )
}

export default PropertyListRoot
